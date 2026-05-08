const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { EMOJI_OWNER, EMOJI_SUCCESS } = require('../../utils/constants');
const { cv2Error } = require('../../utils/messageHelper');
const storage = require('../../utils/storageManager');
const { parseDuration } = require('../../utils/resolver');
const crypto = require('crypto');

module.exports = {
  name: 'genkey',
  aliases: ['generatekey', 'premiumkey'],
  description: 'Generate a new premium key',
  usage: 'genkey [count]',
  cooldown: 0,
  enabled: true,
  staffOnly: false,
  devOnly: true,
  premiumOnly: false,
  execute: async (client, message, args) => {
    if (!process.env.DEV_ID.split(',').includes(message.author.id)) return;

    let count = 1;
    if (args[0] && !isNaN(args[0])) count = parseInt(args[0]);
    if (count > 50) count = 50;

    let durationMs = null;
    let durationLabel = 'Lifetime';
    if (args[1]) {
      durationMs = parseDuration(args[1]);
      if (!durationMs) {
        return message.reply({ components: [cv2Error(`Invalid duration format \`${args[1]}\`. Use formats like 30d, 3mo, 1y.`)], flags: MessageFlags.IsComponentsV2 });
      }
      durationLabel = args[1];
    }

    const premiumData = storage.read('premium.json');
    if (!premiumData.keys) premiumData.keys = {};

    const generatedKeys = [];
    for (let i = 0; i < count; i++) {
      const key = 'NW-' + crypto.randomBytes(4).toString('hex').toUpperCase() + '-' + crypto.randomBytes(4).toString('hex').toUpperCase();
      premiumData.keys[key] = {
        generatedBy: message.author.id,
        generatedAt: Date.now(),
        durationMs,
        durationLabel,
        used: false,
        usedBy: null,
        usedAt: null
      };
      generatedKeys.push(key);
    }

    storage.write('premium.json', premiumData);

    const keyList = generatedKeys.map(k => `\`${k}\``).join('\n');
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_OWNER} **Premium Keys Generated**`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Successfully generated ${count} key(s) with duration **${durationLabel}**:\n${keyList}`));

    message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
  }
};
