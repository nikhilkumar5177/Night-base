const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, SlashCommandBuilder } = require('discord.js');
const { EMOJI_DOT, FOOTER_TEXT } = require('../../utils/constants');
const storage = require('../../utils/storageManager');
const { cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'stats',
  aliases: ['analytics'],
  description: 'View command usage analytics',
  usage: 'stats',
  cooldown: 5,
  enabled: true,
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View command usage analytics'),
  staffOnly: true,
  devOnly: false,
  execute: async (client, message) => {
    try {
      const analytics = storage.read('analytics.json');
      const entries = Object.entries(analytics).sort((a, b) => (b[1].uses || 0) - (a[1].uses || 0));
      const totalUses = entries.reduce((a, [, v]) => a + (v.uses || 0), 0);
      const topCmds = entries.slice(0, 10);
      const maxUses = topCmds[0]?.[1]?.uses || 1;

      const barChart = topCmds.map(([name, data], i) => {
        const pct = Math.round((data.uses / maxUses) * 10);
        const bar = '\u2588'.repeat(pct) + '\u2591'.repeat(10 - pct);
        return `\`${String(i + 1).padStart(2)}.\` \`${bar}\` **${name}** \u2014 \`${data.uses}\``;
      }).join('\n');

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Analytics Dashboard`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${EMOJI_DOT} **Total Commands Used:** \`${totalUses}\`\n` +
          `${EMOJI_DOT} **Unique Commands:** \`${entries.length}\`\n` +
          `${EMOJI_DOT} **Loaded Commands:** \`${client.commands.size}\``
        ))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `**Top 10 Commands**\n${barChart || 'No data yet.'}`
        ))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));

      message.reply({ components: [container], flags: 32768 }).catch(() => {});
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
