const { EmbedBuilder } = require('discord.js');
const { SEP, EMOJI_SUCCESS, EMOJI_ERROR } = require('../../utils/constants');
const { resolveMember } = require('../../utils/resolver');

module.exports = {
  name: 'vcdeafen',
  aliases: ['vd', 'deafen'],
  description: 'Server-deafen a user in voice',
  usage: 'vcdeafen <@user/id>',
  cooldown: 3,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      const target = await resolveMember(message.guild, args[0]);
      if (!target) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`${EMOJI_ERROR} Please specify a user to deafen.`).setTimestamp()] });
      }

      if (!target.voice.channel) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`${EMOJI_ERROR} That user is not in a voice channel.`).setTimestamp()] });
      }

      await target.voice.setDeaf(true, `Server-deafened by ${message.author.tag}`);

      const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setAuthor({ name: 'Wild Wolf \u2502 VC Deafen', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n${EMOJI_SUCCESS} **User has been server-deafened.**\n${SEP}`)
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
