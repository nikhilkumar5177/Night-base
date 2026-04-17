const { EmbedBuilder } = require('discord.js');

const SEP = '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501';

module.exports = {
  name: 'unhide',
  aliases: ['showchannel', 'reveal'],
  description: 'Unhide a channel, making it visible to @everyone',
  usage: 'unhide [#channel]',
  cooldown: 3,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('ManageChannels')) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription('{EMOJI_ERROR} You need **ManageChannels** permission.').setTimestamp()] });
      }
      const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]) || message.channel;
      await channel.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: null });

      const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setAuthor({ name: 'Wild Wolf \u2502 Channel Revealed', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n{EMOJI_SUCCESS} **Channel is now visible to @everyone.**\n${SEP}`)
        .addFields(
          { name: '\u25B8 Channel', value: `${channel}`, inline: true },
          { name: '\u25B8 Moderator', value: message.author.tag, inline: true }
        )
        .setFooter({ text: 'Wild Wolf \u2022 Channel visibility restored', iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
      message.channel.send({ embeds: [embed] });
    } catch (error) {
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`{EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
