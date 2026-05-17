const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { EMOJI_OWNER, EMOJI_SUCCESS } = require('../../utils/constants');
const { cv2Error } = require('../../utils/messageHelper');
const storage = require('../../utils/storageManager');
const { parseDuration } = require('../../utils/resolver');

module.exports = {
  name: 'premium',
  aliases: ['setpremium'],
  description: 'Manage premium status for a guild',
  usage: 'premium <guild_id> [true|false|enable|disable|permanent] [duration]',
  cooldown: 0,
  enabled: true,
  staffOnly: false,
  devOnly: true,
  premiumOnly: false,
  execute: async (client, message, args) => {
    if (!process.env.DEV_ID.split(',').includes(message.author.id)) return;

    let targetGuildId = message.guild.id;
    let stateArgIndex = 0;

    if (args[0] && /^\d{17,20}$/.test(args[0])) {
      targetGuildId = args[0];
      stateArgIndex = 1;
    }

    const premiumData = storage.read('premium.json');
    if (!premiumData.guilds) premiumData.guilds = {};

    const isCurrentlyPremium = !!premiumData.guilds[targetGuildId]?.active;

    // If no state argument is provided, show current status instead of toggling
    if (!args[stateArgIndex]) {
      const guildData = premiumData.guilds[targetGuildId];
      const statusText = isCurrentlyPremium
        ? `Guild \`${targetGuildId}\` is **PREMIUM ACTIVE**${guildData?.durationLabel ? ` (${guildData.durationLabel})` : ''}`
        : `Guild \`${targetGuildId}\` is **NOT PREMIUM**`;
      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_OWNER} **Premium Status**`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(statusText + `\nUse \`premium [guild_id] enable/disable [duration]\` to change.`));
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
    }

    let setState;
    const stateArg = args[stateArgIndex].toLowerCase();
    if (stateArg === 'true' || stateArg === 'enable' || stateArg === 'permanent') {
      setState = true;
    } else if (stateArg === 'false' || stateArg === 'disable') {
      setState = false;
    } else {
      return message.reply({ components: [cv2Error(`Invalid state. Use \`enable\`, \`disable\`, \`true\`, or \`false\`.`)], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
    }

    let durationMs = null;
    let durationLabel = 'Lifetime';
    if (setState && args[stateArgIndex + 1]) {
      const timeInput = args[stateArgIndex + 1];
      durationMs = parseDuration(timeInput);
      if (!durationMs) {
         return message.reply({ components: [cv2Error(`Invalid duration format \`${timeInput}\`. Use formats like 30d, 3mo, 1y.`)], flags: MessageFlags.IsComponentsV2 });
      }
      durationLabel = timeInput;
    }

    premiumData.guilds[targetGuildId] = {
      active: setState,
      grantedBy: message.author.id,
      grantedAt: Date.now(),
      expiresAt: durationMs ? Date.now() + durationMs : null,
      durationLabel: durationMs ? durationLabel : 'Lifetime',
      keyUsed: 'MANUAL'
    };

    storage.write('premium.json', premiumData);

    let statusText = `Guild \`${targetGuildId}\` premium status set to: **${setState ? 'ACTIVE' : 'INACTIVE'}**`;
    if (setState && durationMs) {
       statusText += `\nDuration: **${durationLabel}**`;
    }

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_OWNER} **Premium Status Updated**`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(statusText));

    message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
  }
};
