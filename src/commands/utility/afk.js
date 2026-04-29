const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const storage = require('../../utils/storageManager');
const { EMOJI_SUCCESS, EMOJI_OWNER, FOOTER_TEXT } = require('../../utils/constants');

module.exports = {
  name: 'afk',
  description: 'Set an AFK status',
  usage: 'afk [reason]',
  cooldown: 5,
  enabled: true,
  execute: async (client, message, args) => {
    let reason = args.join(' ') || 'AFK';
    const guildId = message.guild.id;
    const afkData = storage.read('afk.json');

    // Resolve and filter emojis in the reason
    // 1. Remove raw emojis that are NOT from this guild
    const rawEmojiRegex = /<(a?):([a-zA-Z0-9_]+):(\d+)>/g;
    reason = reason.replace(rawEmojiRegex, (match, animated, name, id) => {
      const exists = message.guild.emojis.cache.has(id);
      return exists ? match : ''; // Keep if guild emoji, otherwise strip
    });

    // 2. Resolve :emoji_name: patterns from this guild
    const emojiRegex = /(?<!<a?:[a-zA-Z0-9_]+:):([a-zA-Z0-9_]+):/g;
    reason = reason.replace(emojiRegex, (match, name) => {
      const emoji = message.guild.emojis.cache.find(e => e.name === name);
      return emoji ? emoji.toString() : match;
    });

    if (!afkData[guildId]) afkData[guildId] = {};

    afkData[guildId][message.author.id] = {
      reason,
      timestamp: Date.now()
    };

    storage.write('afk.json', afkData);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 AFK Status Set`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${EMOJI_SUCCESS} ${message.author}, I have set your AFK status.\n` +
        `**Reason:** ${reason}`
      ))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));

    message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
  }
};
