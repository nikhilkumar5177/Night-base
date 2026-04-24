const { EmbedBuilder } = require('discord.js');
const { SEP, EMOJI_SUCCESS, EMOJI_ERROR } = require('../../utils/constants');
const { resolveMember } = require('../../utils/resolver');

module.exports = {
  name: 'vcunmute',
  aliases: ['vum'],
  description: 'Server-unmute a user in voice',
  usage: 'vcunmute <@user/id>',
  cooldown: 3,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      const target = await resolveMember(message.guild, args[0]);
      if (!target) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`${EMOJI_ERROR} Please specify a user to unmute.`).setTimestamp()] });
      }

      if (!target.voice.channel) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`${EMOJI_ERROR} That user is not in a voice channel.`).setTimestamp()] });
      }

      if (target.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`${EMOJI_ERROR} Target has a higher or equal role.`).setTimestamp()] });
      }

      if (!target.voice.serverMute) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`${EMOJI_ERROR} User is not server-muted.`).setTimestamp()] });
      }

      await target.voice.setMute(false, `Server-unmuted by ${message.author.tag}`);

      const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setAuthor({ name: 'Wild Wolf \u2502 VC Unmute', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n${EMOJI_SUCCESS} **User has been server-unmuted.**\n${SEP}`)
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
