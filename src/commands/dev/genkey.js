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
    let durationInput = null;

    if (args.length > 0) {
      const arg0 = args[0];
      const arg1 = args[1];

      // Check if arg0 is count (a strict positive integer string)
      if (/^\d+$/.test(arg0)) {
        count = parseInt(arg0, 10);
        if (arg1) {
          durationInput = arg1;
        }
      } else {
        // arg0 is not a clean integer, so treat it as duration input
        durationInput = arg0;
        // if there's a second argument and it is a strict positive integer, treat it as the count
        if (arg1 && /^\d+$/.test(arg1)) {
          count = parseInt(arg1, 10);
        }
      }
    }

    if (count > 50) count = 50;
    if (count < 1) count = 1;

    let durationMs = null;
    let durationLabel = 'Lifetime';

    if (durationInput) {
      const lowerInput = durationInput.toLowerCase();
      if (lowerInput !== 'lifetime' && lowerInput !== 'permanent' && lowerInput !== 'inf' && lowerInput !== 'infinite') {
        durationMs = parseDuration(durationInput);
        if (!durationMs) {
          return message.reply({ 
            components: [cv2Error(`Invalid duration format \`${durationInput}\`. Use formats like 30d, 3mo, 1y, or lifetime.`)], 
            flags: MessageFlags.IsComponentsV2 
          });
        }
        durationLabel = durationInput;
      }
    }

    const premiumData = storage.read('premium.json');
    if (!premiumData.keys) premiumData.keys = {};

    const generatedKeys = [];
    for (let i = 0; i < count; i++) {
      let key;
      do {
        key = 'NW-' + crypto.randomBytes(4).toString('hex').toUpperCase() + '-' + crypto.randomBytes(4).toString('hex').toUpperCase();
      } while (premiumData.keys[key]);

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
