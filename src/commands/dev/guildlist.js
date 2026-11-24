const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { cv2Error, safeDelete } = require('../../utils/messageHelper');
const { EMOJI_ARROW } = require('../../utils/constants');

module.exports = {
  name: 'guildlist',
  aliases: ['gl', 'servers'],
  description: 'List all guilds the bot is in (Developer Only)',
  usage: 'guildlist',
  cooldown: 5,
  enabled: true,
  devOnly: true,
  execute: async (client, message, args) => {
    try {
      const guilds = client.guilds.cache.map(g => ({
        name: g.name,
        id: g.id,
        members: g.memberCount,
        owner: g.ownerId
      })).sort((a, b) => b.members - a.members);

      const perPage = 10;
      const totalPages = Math.ceil(guilds.length / perPage);
      let page = 0;

      const buildContainer = (p) => {
        const start = p * perPage;
        const end = start + perPage;
        const slice = guilds.slice(start, end);

        const list = slice.map((g, i) => {
          return `\`${start + i + 1}.\` **${g.name}**\n\u25B8 ID: \`${g.id}\` ${EMOJI_ARROW} Members: \`${g.members}\` ${EMOJI_ARROW} Owner: <@${g.owner}>`;
        }).join('\n\n');

        return new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Guild Directory`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(list || 'No guilds found.'));
      };

      const buildRow = (p) => new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('gl_prev').setEmoji('\u25C0').setStyle(ButtonStyle.Secondary).setDisabled(p === 0),
        new ButtonBuilder().setCustomId('gl_page').setLabel(`${p + 1}/${totalPages}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('gl_next').setEmoji('\u25B6').setStyle(ButtonStyle.Secondary).setDisabled(p >= totalPages - 1),
        new ButtonBuilder().setCustomId('gl_del').setLabel('Dismiss').setStyle(ButtonStyle.Danger)
      );

      const sent = await message.reply({ components: [buildContainer(page), buildRow(page)], flags: 32768 });
      if (!sent) return;

      const collector = sent.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 60000 });

      collector.on('collect', async i => {
        if (i.customId === 'gl_del') { await sent.delete().catch(() => {}); collector.stop(); return; }
        if (i.customId === 'gl_prev') page--;
        if (i.customId === 'gl_next') page++;
        await i.update({ components: [buildContainer(page), buildRow(page)] });
      });

      collector.on('end', (collected) => {
        if (collected.size === 0) {
          return safeDelete(sent);
        }
        sent.edit({ components: [] }).catch(() => {});
      });
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 });
    }
  }
};
