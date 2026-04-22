const { EmbedBuilder } = require('discord.js');
const { SEP, EMOJI_DOT, EMOJI_ERROR } = require('../../utils/constants');

module.exports = {
  name: 'vcstats',
  aliases: ['vcs', 'active', 'vccount'],
  description: 'Display active voice channels and stats',
  usage: 'vcstats',
  cooldown: 5,
  enabled: true,
  staffOnly: false,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      const activeChannels = message.guild.channels.cache.filter(c => c.isVoiceBased() && c.members.size > 0);
      const totalMembers = activeChannels.reduce((acc, c) => acc + c.members.size, 0);

      const list = activeChannels.map(c => `${EMOJI_DOT} **${c.name}** \u2022 \`${c.members.size}\` members`).join('\n') || 'No active voice channels.';

      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({ name: 'Wild Wolf \u2502 VC Stats', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n${list}\n${SEP}`)
        .addFields(
          { name: '\u25B8 Total Members in VC', value: `\`${totalMembers}\``, inline: true },
          { name: '\u25B8 Active Channels', value: `\`${activeChannels.size}\``, inline: true }
        )
        .setTimestamp();

      message.reply({ embeds: [embed] }).catch(() => {});
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#ED4245').setDescription(`${EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
