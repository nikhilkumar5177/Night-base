const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { EMOJI_DOT, EMOJI_WARN, EMOJI_OWNER, EMOJI_SUCCESS, EMOJI_ARROW } = require('../../utils/constants');
const storage = require('../../utils/storageManager');
const { cv2Error, cv2Expire } = require('../../utils/messageHelper');

module.exports = {
  name: 'analytics',
  aliases: ['cmdstats', 'usage'],
  description: 'View detailed command usage analytics',
  usage: 'analytics [command]',
  cooldown: 5,
  enabled: true,
  devOnly: true,
  execute: async (client, message, args) => {
    try {
      const analytics = storage.read('analytics.json');
      const prefix = client.config.prefix;

      if (args[0]) {
        const cmdName = args[0].toLowerCase();
        const data = analytics[cmdName];
        if (!data) return message.reply({ components: [cv2Error(`No analytics data for \`${cmdName}\`.`)], flags: MessageFlags.IsComponentsV2 });

        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Analytics: ${cmdName}`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${EMOJI_DOT} **Command:** \`${prefix}${cmdName}\`\n` +
            `${EMOJI_DOT} **Total Uses:** \`${data.uses || 0}\`\n` +
            `${EMOJI_DOT} **Last Used:** ${data.lastUsed ? `<t:${Math.floor(data.lastUsed / 1000)}:R>` : 'Never'}`
          ));
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
      }

      const entries = Object.entries(analytics).sort((a, b) => (b[1].uses || 0) - (a[1].uses || 0));
      const totalUses = entries.reduce((a, [, v]) => a + (v.uses || 0), 0);

      if (entries.length === 0) return message.reply({ components: [cv2Error('No analytics data collected yet.')], flags: MessageFlags.IsComponentsV2 });

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
      const buildContainer = () => {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Analytics Dashboard`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${EMOJI_OWNER} **Developer Analytics Interface**\n` +
            `${EMOJI_DOT} **Total Uses:** \`${totalUses.toLocaleString()}\` ${EMOJI_ARROW} **Tracked:** \`${entries.length}\`\n\n` +
            pages[page]
          ));
        
        container.addActionRowComponents(new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('an_prev').setEmoji('\u25C0').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
          new ButtonBuilder().setCustomId('an_page').setLabel(`${page + 1}/${pages.length}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
          new ButtonBuilder().setCustomId('an_next').setEmoji('\u25B6').setStyle(ButtonStyle.Primary).setDisabled(page >= pages.length - 1),
          new ButtonBuilder().setCustomId('an_reset').setLabel('Reset All').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('an_del').setLabel('Dismiss').setStyle(ButtonStyle.Secondary)
        ));
        return container;
      };

      const sent = await message.reply({ components: [buildContainer()], flags: MessageFlags.IsComponentsV2 });
      if (!sent) return;

      const coll = sent.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 120000 });
      coll.on('collect', async i => {
        if (i.customId === 'an_del') { await sent.delete().catch(() => {}); coll.stop(); return; }
        if (i.customId === 'an_prev' && page > 0) page--;
        if (i.customId === 'an_next' && page < pages.length - 1) page++;
        if (i.customId === 'an_reset') {
          storage.write('analytics.json', {});
          const resetContainer = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} **All analytics data has been reset.**`));
          await i.update({ components: [resetContainer] });
          return;
        }
        await i.update({ components: [buildContainer()] });
      });
      coll.on('end', () => sent.edit({ components: [cv2Expire()] }).catch(() => {}));
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
