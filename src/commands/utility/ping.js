const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, SlashCommandBuilder } = require('discord.js');
const { EMOJI_SUCCESS, EMOJI_LOADING, EMOJI_DOT, FOOTER_TEXT, EMOJI_ARROW } = require('../../utils/constants');
const { cv2Error } = require('../../utils/messageHelper');

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
  devOnly: false,
  execute: async (client, message) => {
    try {
      const start = Date.now();

      const dbStart = Date.now();
      const storage = require('../../utils/storageManager');
      storage.read('config.json');
      const dbLatency = Date.now() - dbStart;

      const apiLatency = Math.round(client.ws.ping);

      const hrStart = process.hrtime();
      await new Promise(r => setImmediate(r));
      const hrDiff = process.hrtime(hrStart);
      const nodeLatency = (hrDiff[0] * 1000 + hrDiff[1] / 1000000).toFixed(0);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Bot Latency`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${EMOJI_DOT} **API Latency:** \`${apiLatency}ms\`\n` +
          `${EMOJI_DOT} **Response Time:** \`${Date.now() - start}ms\`\n` +
          `${EMOJI_DOT} **Database Latency:** \`${dbLatency}ms\`\n` +
          `${EMOJI_DOT} **Node Latency:** \`${nodeLatency}ms\``
        ))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));

      await message.reply({ components: [container], flags: 32768 }).catch(() => { });
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => { });
    }
  }
};
