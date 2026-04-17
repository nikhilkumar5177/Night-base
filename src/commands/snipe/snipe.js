const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const SEP = '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501';
const DOT = '\u25AA';

module.exports = {
  name: 'snipe',
  aliases: ['s'],
  description: 'View recently deleted messages',
  usage: 'snipe [page]',
  cooldown: 3,
  enabled: true,
  staffOnly: false,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      const snipes = client.snipeCache.get(message.channel.id);
      if (!snipes || snipes.length === 0) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#FEE75C').setAuthor({ name: 'Wild Wolf \u2502 Snipe', iconURL: client.user.displayAvatarURL() }).setDescription(`${SEP}\n{EMOJI_WARN} No recently deleted messages in this channel.\n${SEP}`).setTimestamp()] });
      }

      const perPage = 3;
      const pages = [];
      for (let i = 0; i < snipes.length; i += perPage) {
        const chunk = snipes.slice(i, i + perPage);
        pages.push(chunk.map((s, idx) => {
          let text = `**\`#${i + idx + 1}\`** \u2502 ${s.authorTag}\n${DOT} ${s.content || '*No text content*'}\n${DOT} Deleted: <t:${Math.floor(s.timestamp / 1000)}:R>`;
          if (s.attachments?.length > 0) text += `\n${DOT} Attachments: \`${s.attachments.length}\``;
          return text;
        }).join('\n\n'));
      }

      let page = parseInt(args[0]) - 1 || 0;
      if (page < 0 || page >= pages.length) page = 0;

      const buildEmbed = () => new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({ name: 'Wild Wolf \u2502 Message Sniper', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n${pages[page]}\n${SEP}`)
        .setFooter({ text: `Wild Wolf \u2022 Page ${page + 1}/${pages.length} \u2502 ${snipes.length} sniped`, iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();

      const buildRow = () => new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('sn_prev').setEmoji('\u25C0').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
        new ButtonBuilder().setCustomId('sn_page').setLabel(`${page + 1}/${pages.length}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('sn_next').setEmoji('\u25B6').setStyle(ButtonStyle.Primary).setDisabled(page >= pages.length - 1),
        new ButtonBuilder().setCustomId('sn_del').setLabel('Dismiss').setStyle(ButtonStyle.Secondary).setEmoji('\u2716')
      );

      const sent = await message.channel.send({ embeds: [buildEmbed()], components: [buildRow()] });
      const coll = sent.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 120000 });
      coll.on('collect', async i => {
        if (i.customId === 'sn_del') { await sent.delete().catch(() => {}); coll.stop(); return; }
        if (i.customId === 'sn_prev' && page > 0) page--;
        if (i.customId === 'sn_next' && page < pages.length - 1) page++;
        await i.update({ embeds: [buildEmbed()], components: [buildRow()] });
      });
      coll.on('end', () => sent.edit({ components: [] }).catch(() => {}));
    } catch (error) {
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`{EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
