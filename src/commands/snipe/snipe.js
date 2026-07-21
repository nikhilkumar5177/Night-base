const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { EMOJI_WARN, EMOJI_DOT, EMOJI_ARROW } = require('../../utils/constants');
const { cv2Error, cv2Expire } = require('../../utils/messageHelper');

module.exports = {
  name: 'snipe',
  aliases: ['s'],
  description: 'View recently deleted messages',
  usage: 'snipe [page]',
  cooldown: 3,
  enabled: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      const snipes = client.snipeCache.get(message.channel.id);
      if (!snipes || snipes.length === 0) {
        const warnContainer = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Snipe`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_WARN} No recently deleted messages in this channel.`));
        return message.reply({ components: [warnContainer], flags: 32768 });
      }

      const perPage = 3;
      const pages = [];
      for (let i = 0; i < snipes.length; i += perPage) {
        const chunk = snipes.slice(i, i + perPage);
        pages.push(chunk.map((s, idx) => {
          let text = `**\`#${i + idx + 1}\`** ${EMOJI_ARROW} ${s.authorTag}\n${EMOJI_DOT} ${s.content || '*No text content*'}\n${EMOJI_DOT} Deleted: <t:${Math.floor(s.timestamp / 1000)}:R>`;
          if (s.attachments?.length > 0) text += `\n${EMOJI_DOT} Attachments: \`${s.attachments.length}\``;
          return text;
        }).join('\n\n'));
      }

      let page = parseInt(args[0]) - 1 || 0;
      if (page < 0 || page >= pages.length) page = 0;

      const buildContainer = () => {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Message Sniper`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(pages[page]));

        if (pages.length > 1) {
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('sn_prev').setEmoji('\u25C0').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
            new ButtonBuilder().setCustomId('sn_page').setLabel(`${page + 1}/${pages.length}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId('sn_next').setEmoji('\u25B6').setStyle(ButtonStyle.Primary).setDisabled(page >= pages.length - 1)
          );
          container.addActionRowComponents(row);
        }

        return container;
      };

      const sent = await message.reply({ components: [buildContainer()], flags: 32768 });
      if (pages.length <= 1) return;

      const coll = sent.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 120000 });
      coll.on('collect', async i => {
        if (i.customId === 'sn_prev' && page > 0) page--;
        if (i.customId === 'sn_next' && page < pages.length - 1) page++;
        await i.update({ components: [buildContainer()] });
      });

      coll.on('end', () => sent.edit({ components: [cv2Expire()] }).catch(() => {}));

    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
