const { EmbedBuilder } = require('discord.js');
const { SEP, EMOJI_SUCCESS, EMOJI_ERROR } = require('../../utils/constants');
const { resolveChannel } = require('../../utils/resolver');


module.exports = {
  name: 'hide',
  aliases: ['hidechannel'],
  description: 'Hide a channel from @everyone',
  usage: 'hide [#channel]',
  cooldown: 3,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('ManageChannels')) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_ERROR} You need **ManageChannels** permission.`).setTimestamp()] });
      }
      const channel = resolveChannel(message.guild, args[0]) || message.channel;
      await channel.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: false }).catch(() => {});

      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({ name: 'Wild Wolf \u2502 Channel Hidden', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n${EMOJI_SUCCESS} **Channel is now hidden from @everyone.**\n${SEP}`)
        .addFields(
          { name: '\u25B8 Channel', value: `${channel}`, inline: true },
          { name: '\u25B8 Moderator', value: message.author.tag, inline: true }
        )
        .setFooter({ text: 'Wild Wolf \u2022 Only permitted roles can view', iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
      message.reply({ embeds: [embed] }).catch(() => {});
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
