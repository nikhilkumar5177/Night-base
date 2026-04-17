const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const storage = require('../../utils/storageManager');

const SEP = '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501';
const DOT = '\u25AA';

module.exports = {
  name: 'stats',
  aliases: ['analytics'],
  description: 'View command usage analytics',
  usage: 'stats',
  cooldown: 5,
  enabled: true,
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

      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({ name: 'Wild Wolf \u2502 Analytics Dashboard', iconURL: client.user.displayAvatarURL() })
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setDescription(
          `${SEP}\n` +
          `${DOT} **Total Commands Used:** \`${totalUses}\`\n` +
          `${DOT} **Unique Commands:** \`${entries.length}\`\n` +
          `${DOT} **Loaded Commands:** \`${client.commands.size}\`\n` +
          `${SEP}\n\n` +
          `**Top 10 Commands**\n${barChart || 'No data yet.'}`
        )
        .setFooter({ text: 'Wild Wolf \u2022 Usage Analytics', iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('st_del').setLabel('Dismiss').setStyle(ButtonStyle.Secondary).setEmoji('\u2716')
      );

      const sent = await message.channel.send({ embeds: [embed], components: [row] });
      const coll = sent.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 120000 });
      coll.on('collect', async i => { if (i.customId === 'st_del') { await sent.delete().catch(() => {}); coll.stop(); } });
      coll.on('end', () => sent.edit({ components: [] }).catch(() => {}));
    } catch (error) {
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`{EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
