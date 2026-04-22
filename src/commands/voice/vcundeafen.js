const { EmbedBuilder } = require('discord.js');
const { SEP, EMOJI_SUCCESS, EMOJI_ERROR } = require('../../utils/constants');
const { resolveMember } = require('../../utils/resolver');

module.exports = {
  name: 'vcundeafen',
  aliases: ['vud', 'undeafen'],
  description: 'Server-undeafen a user in voice',
  usage: 'vcundeafen <@user/id>',
  cooldown: 3,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      const target = await resolveMember(message.guild, args[0]);
      if (!target) {
        return message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#ED4245').setDescription(`${EMOJI_ERROR} Please specify a user to undeafen.`).setTimestamp()] });
      }

      if (!target.voice.channel) {
        return message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#ED4245').setDescription(`${EMOJI_ERROR} That user is not in a voice channel.`).setTimestamp()] });
      }

      await target.voice.setDeaf(false, `Server-undeafened by ${message.author.tag}`);

      const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setAuthor({ name: 'Wild Wolf \u2502 VC Undeafen', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n${EMOJI_SUCCESS} **User has been server-undeafened.**\n${SEP}`)
        .addFields(
          { name: '\u25B8 User', value: `${target.user.tag}`, inline: true },
          { name: '\u25B8 Moderator', value: `${message.author.tag}`, inline: true }
        )
        .setTimestamp();

      message.reply({ embeds: [embed] }).catch(() => {});
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#ED4245').setDescription(`${EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
