const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const storage = require('../../utils/storageManager');
const { EMOJI_INFO, EMOJI_WARN, EMOJI_DOT, EMOJI_ARROW } = require('../../utils/constants');
const { cv2Error, cv2Expire } = require('../../utils/messageHelper');

module.exports = {
  name: 'securitystatus',
  aliases: ['seclog', 'seclogs'],
  description: 'View security logs',
  usage: 'securitystatus',
  cooldown: 5,
  enabled: true,
  devOnly: false,
  execute: async (client, message) => {
    try {
      const securityConfig = storage.read('security.json');
      const logs = securityConfig.logs || [];
      
      if (logs.length === 0) {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Security Logs`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_INFO} No security events recorded.`));
        return message.reply({ components: [container], flags: 32768 });
      }

      const perPage = 5;
      const pages = [];
      for (let i = 0; i < logs.length; i += perPage) {
        const chunk = logs.slice(i, i + perPage);
        pages.push(chunk.map((log, idx) => `**${i + idx + 1}.** Type: \`${log.type}\`\nTime: <t:${Math.floor(log.timestamp / 1000)}:R>${log.count ? `\nCount: ${log.count}` : ''}`).join('\n\n'));
      }

      let page = 0;

      const buildContainer = () => {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Security Logs`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(pages[page]));

        if (pages.length > 1) {
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('sec_prev').setEmoji('\u25C0').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
            new ButtonBuilder().setCustomId('sec_page').setLabel(`${page + 1}/${pages.length}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId('sec_next').setEmoji('\u25B6').setStyle(ButtonStyle.Primary).setDisabled(page >= pages.length - 1)
          );
          container.addActionRowComponents(row);
        }

        return container;
      };

      const sent = await message.reply({ components: [buildContainer()], flags: 32768 }).catch(() => {});
      if (pages.length <= 1) return;

      const coll = sent.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 60000 });
      coll.on('collect', async i => {
        if (i.customId === 'sec_prev' && page > 0) page--;
        if (i.customId === 'sec_next' && page < pages.length - 1) page++;
        await i.update({ components: [buildContainer()] });
      });

      coll.on('end', () => sent.edit({ components: [cv2Expire()] }).catch(() => {}));

    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
