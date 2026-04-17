const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const COLORS = { primary: '#5865F2', success: '#57F287', loading: '#EB459E' };
const SEP = '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501';

module.exports = {
  name: 'ping',
  aliases: ['latency', 'pong'],
  description: 'Check bot and API latency',
  usage: 'ping',
  cooldown: 5,
  enabled: true,
  staffOnly: false,
  devOnly: false,
  execute: async (client, message) => {
    try {
      const loadEmbed = new EmbedBuilder()
        .setColor(COLORS.loading)
        .setAuthor({ name: 'Wild Wolf \u2502 Latency Check', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n{EMOJI_LOADING} **Measuring latency...**\n\n\`\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\` 0%\n${SEP}`)
        .setTimestamp();

      const sent = await message.channel.send({ embeds: [loadEmbed] });
      await new Promise(r => setTimeout(r, 600));

      const rt = sent.createdTimestamp - message.createdTimestamp;
      const ws = client.ws.ping;
      const up = process.uptime();
      const bar = (ms) => ms < 100 ? '\`\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\` Excellent' : ms < 200 ? '\`\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2591\u2591\u2591\` Good' : ms < 400 ? '\`\u2588\u2588\u2588\u2588\u2588\u2591\u2591\u2591\u2591\u2591\` Average' : '\`\u2588\u2588\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\` Poor';
      const clr = (ms) => ms < 150 ? COLORS.success : ms < 300 ? '#FEE75C' : '#ED4245';

      const embed = new EmbedBuilder()
        .setColor(clr(rt))
        .setAuthor({ name: 'Wild Wolf \u2502 Latency Report', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n{EMOJI_SUCCESS} **Latency check complete.**\n${SEP}`)
        .addFields(
          { name: '\u25B8 Bot Latency', value: `\`${rt}ms\` ${bar(rt)}` },
          { name: '\u25B8 WebSocket', value: `\`${ws}ms\` ${bar(ws)}`, inline: true },
          { name: '\u25B8 Uptime', value: `\`${Math.floor(up/3600)}h ${Math.floor((up%3600)/60)}m\``, inline: true },
          { name: '\u25B8 Guilds', value: `\`${client.guilds.cache.size}\``, inline: true }
        )
        .setFooter({ text: 'Wild Wolf \u2022 Network Diagnostics', iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ping_refresh').setLabel('Refresh').setStyle(ButtonStyle.Primary).setEmoji('\uD83D\uDD04'),
        new ButtonBuilder().setCustomId('ping_del').setLabel('Dismiss').setStyle(ButtonStyle.Secondary).setEmoji('\u2716')
      );

      await sent.edit({ embeds: [embed], components: [row] });
      const coll = sent.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 60000 });
      coll.on('collect', async i => {
        if (i.customId === 'ping_del') { await sent.delete().catch(() => {}); coll.stop(); return; }
        if (i.customId === 'ping_refresh') {
          const nrt = Date.now() - i.createdTimestamp;
          const nws = client.ws.ping;
          const nu = process.uptime();
          await i.update({ embeds: [EmbedBuilder.from(embed).setColor(clr(nrt)).setFields(
            { name: '\u25B8 Bot Latency', value: `\`${nrt}ms\` ${bar(nrt)}` },
            { name: '\u25B8 WebSocket', value: `\`${nws}ms\` ${bar(nws)}`, inline: true },
            { name: '\u25B8 Uptime', value: `\`${Math.floor(nu/3600)}h ${Math.floor((nu%3600)/60)}m\``, inline: true },
            { name: '\u25B8 Guilds', value: `\`${client.guilds.cache.size}\``, inline: true }
          ).setTimestamp()] });
        }
      });
      coll.on('end', () => sent.edit({ components: [] }).catch(() => {}));
    } catch (error) {
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`{EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
