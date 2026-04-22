const { EmbedBuilder } = require('discord.js');
const { SEP, EMOJI_SUCCESS, EMOJI_ERROR, EMOJI_WARN } = require('../../utils/constants');

module.exports = {
  name: 'vcdeafenall',
  aliases: ['da', 'deafenall'],
  description: 'Deafen everyone in the voice channel',
  usage: 'vcdeafenall',
  cooldown: 10,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      const channel = message.member.voice.channel;
      if (!channel) {
        return message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#ED4245').setDescription(`${EMOJI_ERROR} You must be in a voice channel.`).setTimestamp()] });
      }

      const members = channel.members.filter(m => !m.user.bot);
      if (members.size === 0) {
        return message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#FEE75C').setDescription(`${EMOJI_WARN} No members to deafen.`).setTimestamp()] });
      }

      for (const [, member] of members) {
        await member.voice.setDeaf(true, `Mass deafened by ${message.author.tag}`).catch(() => {});
      }

      const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setAuthor({ name: 'Wild Wolf \u2502 Mass Deafen', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n${EMOJI_SUCCESS} **Deafened ${members.size} members in the VC.**\n${SEP}`)
        .addFields(
          { name: '\u25B8 Channel', value: `${channel.name}`, inline: true },
          { name: '\u25B8 Moderator', value: `${message.author.tag}`, inline: true }
        )
        .setTimestamp();

      message.reply({ embeds: [embed] }).catch(() => {});
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#ED4245').setDescription(`${EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
