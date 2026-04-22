const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { SEP, EMOJI_SUCCESS, EMOJI_ERROR } = require('../../utils/constants');

module.exports = {
  name: 'vcunhide',
  aliases: ['vuh', 'unhide'],
  description: 'Unhide a voice channel',
  usage: 'vcunhide [#channel]',
  cooldown: 5,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      const channel = message.mentions.channels.first() || message.member.voice.channel;
      if (!channel || !channel.isVoiceBased()) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`${EMOJI_ERROR} Please mention a voice channel or join one.`).setTimestamp()] });
      }

      await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
        ViewChannel: null
      }).catch(() => {});

      const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setAuthor({ name: 'Wild Wolf \u2502 VC Visible', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n${EMOJI_SUCCESS} **Voice channel is now visible to everyone.**\n${SEP}`)
        .addFields(
          { name: '\u25B8 Channel', value: `${channel}`, inline: true },
          { name: '\u25B8 Moderator', value: `${message.author.tag}`, inline: true }
        )
        .setTimestamp();

      message.reply({ embeds: [embed] }).catch(() => {});
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`${EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
