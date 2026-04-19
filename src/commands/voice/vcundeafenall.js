const { EmbedBuilder } = require('discord.js');
const { SEP } = require('../../utils/constants');

module.exports = {
  name: 'vcundeafenall',
  aliases: ['uda', 'undeafenall'],
  description: 'Undeafen everyone in the voice channel',
  usage: 'vcundeafenall',
  cooldown: 10,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      const channel = message.member.voice.channel;
      if (!channel) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription('{EMOJI_ERROR} You must be in a voice channel.').setTimestamp()] });
      }

      const members = channel.members.filter(m => !m.user.bot);
      if (members.size === 0) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#FEE75C').setDescription('{EMOJI_WARN} No members to undeafen.').setTimestamp()] });
      }

      for (const [, member] of members) {
        await member.voice.setDeaf(false, `Mass undeafened by ${message.author.tag}`).catch(() => {});
      }

      const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setAuthor({ name: 'Wild Wolf \u2502 Mass Undeafen', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n{EMOJI_SUCCESS} **Undeafened ${members.size} members in the VC.**\n${SEP}`)
        .addFields(
          { name: '\u25B8 Channel', value: `${channel.name}`, inline: true },
          { name: '\u25B8 Moderator', value: `${message.author.tag}`, inline: true }
        )
        .setTimestamp();

      message.reply({ embeds: [embed] });
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`{EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
