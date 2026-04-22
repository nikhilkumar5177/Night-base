const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { SEP, EMOJI_DOT, EMOJI_WARN, EMOJI_OWNER, EMOJI_SUCCESS, EMOJI_ERROR } = require('../../utils/constants');
const storage = require('../../utils/storageManager');

module.exports = {
  name: 'analytics',
  aliases: ['cmdstats', 'usage'],
  description: 'View detailed command usage analytics',
  usage: 'analytics [command]',
  cooldown: 5,
  enabled: true,
  staffOnly: false,
  devOnly: true,
  execute: async (client, message, args) => {
    try {
      const analytics = storage.read('analytics.json');

      if (args[0]) {
        const cmdName = args[0].toLowerCase();
        const data = analytics[cmdName];
        if (!data) {
          return message.reply({ embeds: [new EmbedBuilder().setColor('#FEE75C').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${SEP}\n${EMOJI_WARN} No analytics data for \`${cmdName}\`.\n${SEP}`).setTimestamp()] });
        }
        const embed = new EmbedBuilder()
          .setColor('#5865F2')
          .setAuthor({ name: `Wild Wolf \u2502 Analytics: ${cmdName}`, iconURL: client.user.displayAvatarURL() })
          .setDescription(`${SEP}\n${EMOJI_DOT} **Command:** \`${client.config.prefix}${cmdName}\`\n${EMOJI_DOT} **Total Uses:** \`${data.uses || 0}\`\n${EMOJI_DOT} **Last Used:** ${data.lastUsed ? `<t:${Math.floor(data.lastUsed / 1000)}:R>` : 'Never'}\n${EMOJI_DOT} **Last User:** ${data.lastUser ? `\`${data.lastUser}\`` : 'Unknown'}\n${SEP}`)
          .setFooter({ text: 'Wild Wolf \u2022 Command Analytics' }).setTimestamp();
        return message.reply({ embeds: [embed] }).catch(() => {});
      }

      const entries = Object.entries(analytics).sort((a, b) => (b[1].uses || 0) - (a[1].uses || 0));
      const totalUses = entries.reduce((a, [, v]) => a + (v.uses || 0), 0);

      if (entries.length === 0) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#FEE75C').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${SEP}\n${EMOJI_WARN} No analytics data collected yet.\n${SEP}`).setTimestamp()] });
      }

      const perPage = 10;
      const pages = [];
      for (let i = 0; i < entries.length; i += perPage) {
        const chunk = entries.slice(i, i + perPage);
        const maxUses = entries[0][1].uses || 1;
        const chart = chunk.map(([name, data], idx) => {
          const pct = Math.round(((data.uses || 0) / maxUses) * 8);
          const bar = '\u2588'.repeat(pct) + '\u2591'.repeat(8 - pct);
          return `\`${String(i + idx + 1).padStart(2)}.\` \`${bar}\` **${name}** \u2014 \`${data.uses || 0}\``;
        }).join('\n');
        pages.push(chart);
      }

      let page = 0;
      const buildEmbed = () => new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({ name: 'Wild Wolf \u2502 Analytics Dashboard', iconURL: client.user.displayAvatarURL() })
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setDescription(
          `${SEP}\n` +
          `${EMOJI_OWNER} **Developer Analytics Interface**\n` +
          `${EMOJI_DOT} **Total Uses:** \`${totalUses.toLocaleString()}\`\n` +
          `${EMOJI_DOT} **Tracked Commands:** \`${entries.length}\`\n` +
          `${EMOJI_DOT} **Loaded Commands:** \`${client.commands.size}\`\n` +
          `${SEP}\n\n` +
          pages[page]
        )
        .setFooter({ text: `Wild Wolf \u2022 Page ${page + 1}/${pages.length}`, iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();

      const buildRow = () => new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('an_prev').setEmoji('\u25C0').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
        new ButtonBuilder().setCustomId('an_page').setLabel(`${page + 1}/${pages.length}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('an_next').setEmoji('\u25B6').setStyle(ButtonStyle.Primary).setDisabled(page >= pages.length - 1),
        new ButtonBuilder().setCustomId('an_reset').setLabel('Reset All').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('an_del').setLabel('Dismiss').setStyle(ButtonStyle.Secondary).setEmoji('\u2716')
      );

      const sent = await message.reply({ embeds: [buildEmbed().catch(() => {})], components: [buildRow()] });
      const coll = sent.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 120000 });
      coll.on('collect', async i => {
        if (i.customId === 'an_del') { await sent.delete().catch(() => {}); coll.stop(); return; }
        if (i.customId === 'an_prev' && page > 0) page--;
        if (i.customId === 'an_next' && page < pages.length - 1) page++;
        if (i.customId === 'an_reset') {
          storage.write('analytics.json', {});
          const resetEmbed = new EmbedBuilder().setColor('#57F287').setAuthor({ name: 'Wild Wolf \u2502 Analytics Reset', iconURL: client.user.displayAvatarURL() }).setDescription(`${SEP}\n${EMOJI_SUCCESS} **All analytics data has been reset.**\n${SEP}`).setTimestamp();
          await i.update({ embeds: [resetEmbed], components: [] });
          return;
        }
        await i.update({ embeds: [buildEmbed()], components: [buildRow()] });
      });
      coll.on('end', () => sent.edit({ components: [] }).catch(() => {}));
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`${EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
