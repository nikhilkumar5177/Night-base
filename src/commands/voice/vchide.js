const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { SEP } = require('../../utils/constants');

module.exports = {
  name: 'vchide',
  aliases: ['vh', 'hide'],
  description: 'Hide a voice channel from everyone',
  usage: 'vchide [#channel]',
  cooldown: 5,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      const channel = message.mentions.channels.first() || message.member.voice.channel;
      if (!channel || !channel.isVoiceBased()) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription('{EMOJI_ERROR} Please mention a voice channel or join one.').setTimestamp()] });
      }

      await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
        ViewChannel: false
      });

      const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setAuthor({ name: 'Wild Wolf \u2502 VC Hidden', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n{EMOJI_SUCCESS} **Voice channel is now hidden from everyone.**\n${SEP}`)
        .addFields(
          { name: '\u25B8 Channel', value: `${channel}`, inline: true },
          { name: '\u25B8 Moderator', value: `${message.author.tag}`, inline: true }
        )
        .setTimestamp();

      message.reply({ embeds: [embed] });
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`{EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
