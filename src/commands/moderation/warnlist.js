const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { SEP, EMOJI_SUCCESS, EMOJI_ERROR, EMOJI_DOT } = require('../../utils/constants');
const storage = require('../../utils/storageManager');

module.exports = {
  name: 'warnlist',
  aliases: ['warns', 'wl', 'infractions'],
  description: 'View warnings for a user',
  usage: 'warnlist [@user]',
  cooldown: 3,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      const target = message.mentions.users.first() || client.users.cache.get(args[0]) || message.author;
      const warns = storage.read('warns.json');
      const userWarns = warns[target.id] || [];

      if (userWarns.length === 0) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#57F287').setAuthor({ name: 'Wild Wolf \u2502 Warn History', iconURL: client.user.displayAvatarURL() }).setDescription(`${SEP}\n${EMOJI_SUCCESS} **${target.tag}** has no warnings.\n${SEP}`).setTimestamp()] });
      }

      const perPage = 5;
      const pages = [];
      for (let i = 0; i < userWarns.length; i += perPage) {
        const chunk = userWarns.slice(i, i + perPage);
        const desc = chunk.map((w, idx) => {
          const mod = client.users.cache.get(w.moderator);
          return `**\`#${i + idx + 1}\`** \u2502 Case: \`${w.caseId}\`\n${EMOJI_DOT} **Reason:** ${w.reason}\n${EMOJI_DOT} **By:** ${mod ? mod.tag : w.moderator}\n${EMOJI_DOT} **Date:** <t:${Math.floor(w.timestamp / 1000)}:R>`;
        }).join('\n\n');
        pages.push(desc);
      }

      let page = 0;
      const totalWarns = userWarns.length;
      const warnBar = totalWarns >= 10 ? '\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588' : '\u2588'.repeat(Math.min(totalWarns, 10)) + '\u2591'.repeat(Math.max(10 - totalWarns, 0));

      const buildEmbed = () => new EmbedBuilder()
        .setColor(totalWarns >= 5 ? '#ED4245' : '#5865F2')
        .setAuthor({ name: 'Wild Wolf \u2502 Warn History', iconURL: client.user.displayAvatarURL() })
        .setThumbnail(target.displayAvatarURL({ dynamic: true }))
        .setDescription(
          `${SEP}\n` +
          `${EMOJI_DOT} **User:** ${target.tag} (\`${target.id}\`)\n` +
          `${EMOJI_DOT} **Warn Level:** \`${warnBar}\` **${totalWarns}**/10\n` +
          `${SEP}\n\n` +
          pages[page]
        )
        .setFooter({ text: `Wild Wolf \u2022 Page ${page + 1}/${pages.length} \u2502 ${totalWarns} total warnings`, iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();

      const buildRow = () => new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('wl_first').setEmoji('\u23EE').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
        new ButtonBuilder().setCustomId('wl_prev').setEmoji('\u25C0').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
        new ButtonBuilder().setCustomId('wl_page').setLabel(`${page + 1}/${pages.length}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('wl_next').setEmoji('\u25B6').setStyle(ButtonStyle.Primary).setDisabled(page >= pages.length - 1),
        new ButtonBuilder().setCustomId('wl_last').setEmoji('\u23ED').setStyle(ButtonStyle.Secondary).setDisabled(page >= pages.length - 1)
      );

      const sent = await message.reply({ embeds: [buildEmbed().catch(() => {})], components: pages.length > 1 ? [buildRow()] : [] });
      if (pages.length <= 1) return;

      const coll = sent.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 120000 });
      coll.on('collect', async i => {
        if (i.customId === 'wl_first') page = 0;
        if (i.customId === 'wl_prev' && page > 0) page--;
        if (i.customId === 'wl_next' && page < pages.length - 1) page++;
        if (i.customId === 'wl_last') page = pages.length - 1;
        await i.update({ embeds: [buildEmbed()], components: [buildRow()] });
      });
      coll.on('end', () => sent.edit({ components: [] }).catch(() => {}));
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`${EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
