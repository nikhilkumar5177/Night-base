const { EmbedBuilder } = require('discord.js');
const { SEP, EMOJI_SUCCESS, EMOJI_ERROR } = require('../../utils/constants');
const { resolveMember } = require('../../utils/resolver');

module.exports = {
  name: 'vcmute',
  aliases: ['vm'],
  description: 'Server-mute a user in voice',
  usage: 'vcmute <@user/id>',
  cooldown: 3,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  userPermissions: ['MuteMembers'],
  execute: async (client, message, args) => {
    try {
      const target = await resolveMember(message.guild, args[0]);
      if (!target) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`${EMOJI_ERROR} Please specify a user to mute.`).setTimestamp()] });
      }

      if (!target.voice.channel) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`${EMOJI_ERROR} That user is not in a voice channel.`).setTimestamp()] });
      }

      if (target.voice.serverMute) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`${EMOJI_ERROR} User is already server-muted.`).setTimestamp()] });
      }

      await target.voice.setMute(true, `Server-muted by ${message.author.tag}`);

      const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setAuthor({ name: 'Wild Wolf \u2502 VC Mute', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n${EMOJI_SUCCESS} **User has been server-muted.**\n${SEP}`)
        .addFields(
          { name: '\u25B8 User', value: `${target.user.tag}`, inline: true },
          { name: '\u25B8 Moderator', value: `${message.author.tag}`, inline: true }
        )
        .setTimestamp();

      message.reply({ embeds: [embed] }).catch(() => {});
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`${EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
