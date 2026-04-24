const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const { SEP, EMOJI_SUCCESS, EMOJI_ERROR, EMOJI_LOADING } = require('../../utils/constants');

const COLORS = { primary: '#5865F2', success: '#57F287', loading: '#EB459E' };

module.exports = {
  name: 'ping',
  aliases: ['latency', 'pong'],
  description: 'Check bot and API latency',
  usage: 'ping',
  cooldown: 5,
  enabled: true,
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot and API latency'),
  staffOnly: false,
  devOnly: false,
  execute: async (client, message) => {
    const isInteraction = !message.author;
    try {
      const start = Date.now();
      
      // Database Latency (Measure read time)
      const dbStart = Date.now();
      const storage = require('../../utils/storageManager');
      storage.read('config.json');
      const dbLatency = Date.now() - dbStart;

      const sent = await message.reply({ 
        embeds: [new EmbedBuilder().setColor(COLORS.loading).setDescription(`${EMOJI_LOADING} **Calculating diagnostics...**`)] 
      }).catch(() => {});
      
      const end = Date.now();
      const apiLatency = client.ws.ping; // WebSocket ping is more accurate for "API Latency" in this context
      const responseTime = end - start;

      // Node Latency (Measure event loop delay)
      const hrStart = process.hrtime();
      await new Promise(r => setImmediate(r));
      const hrDiff = process.hrtime(hrStart);
      const nodeLatency = (hrDiff[0] * 1000 + hrDiff[1] / 1000000).toFixed(0);

      const clr = (ms) => ms < 150 ? COLORS.success : ms < 300 ? '#FEE75C' : '#ED4245';

      const embed = new EmbedBuilder()
        .setColor(clr(responseTime))
        .setAuthor({ name: 'Wild Wolf \u2502 Bot Latency', iconURL: client.user.displayAvatarURL() })
        .setDescription(
          `${SEP}\n` +
          `${EMOJI_SUCCESS} **API Latency:** \`${apiLatency}ms\`\n` +
          `${EMOJI_SUCCESS} **Response Time:** \`${responseTime}ms\`\n` +
          `${EMOJI_SUCCESS} **Database Latency:** \`${dbLatency}ms\`\n` +
          `${EMOJI_SUCCESS} **Node Latency:** \`${nodeLatency}ms\`\n` +
          `${SEP}`
        )
        .setFooter({ text: `Uptime: ${Math.floor(process.uptime()/3600)}h ${Math.floor((process.uptime()%3600)/60)}m` })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ping_del').setLabel('Dismiss').setStyle(ButtonStyle.Secondary).setEmoji('\u2716')
      );

      await sent.edit({ embeds: [embed], components: [row] }).catch(() => {});
      
      const coll = sent.createMessageComponentCollector({ filter: i => i.user.id === (isInteraction ? message.user.id : message.author.id), time: 30000 });
      coll.on('collect', async i => {
        if (i.customId === 'ping_del') { await sent.delete().catch(() => {}); coll.stop(); }
      });
      coll.on('end', () => sent.edit({ components: [] }).catch(() => {}));
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`${EMOJI_ERROR} ${error.message}`).setTimestamp()] }).catch(() => {});
    }
  }
};
