const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { EMOJI_SUCCESS, EMOJI_ERROR } = require('../../utils/constants');
const { cv2Error } = require('../../utils/messageHelper');
const storage = require('../../utils/storageManager');

module.exports = {
  name: 'redeem',
  aliases: ['usekey'],
  description: 'Redeem a premium key for this server',
  usage: 'redeem <key>',
  cooldown: 5,
  enabled: true,
  staffOnly: false,
  devOnly: false,
  premiumOnly: false,
  execute: async (client, message, args) => {
    // Only allow server owner or administrators to redeem
    if (message.author.id !== message.guild.ownerId && !message.member.permissions.has('Administrator')) {
      return message.reply({ components: [cv2Error('Only the server owner or administrators can redeem premium keys.')], flags: MessageFlags.IsComponentsV2 });
    }

    const key = args[0];
    if (!key) return message.reply({ components: [cv2Error('Please provide a premium key.')], flags: MessageFlags.IsComponentsV2 });

    const premiumData = storage.read('premium.json');
    if (!premiumData.keys) premiumData.keys = {};
    if (!premiumData.guilds) premiumData.guilds = {};

    const keyData = premiumData.keys[key];

    if (!keyData) {
      return message.reply({ components: [cv2Error('Invalid premium key.')], flags: MessageFlags.IsComponentsV2 });
    }

    if (keyData.used) {
      return message.reply({ components: [cv2Error('This premium key has already been used.')], flags: MessageFlags.IsComponentsV2 });
    }

    if (premiumData.guilds[message.guild.id]?.active) {
       return message.reply({ components: [cv2Error('This server is already premium.')], flags: MessageFlags.IsComponentsV2 });
    }

    const durationMs = keyData.durationMs;
    const expiresAt = durationMs ? Date.now() + durationMs : null;
    const durationLabel = keyData.durationLabel || 'Lifetime';

    // Mark key as used
    keyData.used = true;
    keyData.usedBy = message.author.id;
    keyData.usedAt = Date.now();

    // Grant premium
    premiumData.guilds[message.guild.id] = {
      active: true,
      grantedBy: message.author.id,
      grantedAt: Date.now(),
      expiresAt: expiresAt,
      durationLabel: durationLabel,
      keyUsed: key
    };

    storage.write('premium.json', premiumData);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} **Premium Activated!**`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Thank you for supporting Wild Wolf! This server now has access to all Premium features.\nDuration: **${durationLabel}**`));

    message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
  }
};
