const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { SEP } = require('../../utils/constants');

module.exports = {
  name: 'vcunlock',
  aliases: ['vcul'],
  description: 'Unlock a voice channel',
  usage: 'vcunlock [#channel]',
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

      if (!channel.permissionsFor(message.guild.members.me).has('ManageRoles')) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription('{EMOJI_ERROR} I need **ManageRoles** permission for this channel.').setTimestamp()] });
      }

      await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
        Connect: null
      });

      const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setAuthor({ name: 'Wild Wolf \u2502 VC Unlocked', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n{EMOJI_SUCCESS} **Voice channel has been unlocked.**\n${SEP}`)
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
