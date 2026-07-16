const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, PermissionsBitField } = require('discord.js');
const axios = require('axios');
const { EMOJI_SUCCESS, EMOJI_LOADING, EMOJI_DOT, FOOTER_TEXT } = require('../../utils/constants');
const { sendUsage, cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'steal',
  aliases: ['addemoji', 'addsticker', 'stealemoji', 'steals'],
  description: 'Steal multiple emojis or stickers from another server',
  usage: 'steal <emojis | stickers> [name]',
  cooldown: 5,
  userPermissions: ['ManageEmojisAndStickers'],
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
        return message.reply({ components: [cv2Error('You need **Manage Emojis and Stickers** permission.')], flags: 32768 });
      }

      let stickers = [...message.stickers.values()];
      let repliedMsg = null;
      if (message.reference) {
        repliedMsg = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
        if (repliedMsg) stickers = [...stickers, ...repliedMsg.stickers.values()];
      }

      const emojiRegex = /<(a?):(.+?):(\d+)>/g;
      const content = message.content + (repliedMsg ? ' ' + (repliedMsg.content || '') : '');
      const emojiMatches = [...content.matchAll(emojiRegex)];

      const itemsToSteal = [];
      for (const sticker of stickers) {
        itemsToSteal.push({ type: 'sticker', name: sticker.name, url: sticker.url, format: sticker.format, tags: sticker.tags, id: sticker.id });
      }
      for (const match of emojiMatches) {
        const animated = match[1] === 'a';
        const name = match[2];
        const id = match[3];
        itemsToSteal.push({ type: 'emoji', name: name, id: id, animated: animated, url: `https://cdn.discordapp.com/emojis/${id}.${animated ? 'gif' : 'png'}` });
      }

      const uniqueItems = [];
      const seen = new Set();
      for (const item of itemsToSteal) {
        if (!seen.has(item.id)) { seen.add(item.id); uniqueItems.push(item); }
      }

      if (uniqueItems.length === 0) return sendUsage(message, module.exports);

      const maxItems = 10;
      const items = uniqueItems.slice(0, maxItems);

      const loadContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_LOADING} **Stealing ${items.length} item(s)...**`));
      const sent = await message.reply({ components: [loadContainer], flags: 32768 }).catch(() => {});

      const successes = [];
      const failures = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (items.length > 1) {
          const progressContainer = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_LOADING} **Stealing items (${i + 1}/${items.length}): \`${item.name}\`...**`));
          await sent.edit({ components: [progressContainer] }).catch(() => {});
        }

        try {
          const response = await axios.get(item.url, { responseType: 'arraybuffer' });
          let buffer = Buffer.from(response.data);

          if (item.type === 'sticker') {
            let stickerName = (items.length === 1 && args[0] && !args[0].match(emojiRegex)) ? args[0] : item.name;
            const newSticker = await message.guild.stickers.create({ file: buffer, name: stickerName.slice(0, 30), tags: item.tags || 'stolen', description: `Steal command` });
            successes.push(`Sticker: \`${newSticker.name}\``);
          } else {
            let emojiName = (items.length === 1 && args[1]) ? args[1].replace(/\s+/g, '_') : item.name;
            emojiName = emojiName.replace(/[^a-zA-Z0-9_]/g, '');
            if (emojiName.length < 2) emojiName += '_';
            const newEmoji = await message.guild.emojis.create({ attachment: buffer, name: emojiName.slice(0, 32) });
            successes.push(`<${item.animated ? 'a' : ''}:${newEmoji.name}:${newEmoji.id}> \`${newEmoji.name}\``);
          }
        } catch (err) {
          let errorMsg = err.message;
          if (err.message.includes('maximum size')) errorMsg = 'Too large';
          if (err.message.includes('Maximum number')) errorMsg = 'Guild limit reached';
          failures.push(`\`${item.name}\` (${errorMsg})`);
        }
      }

      const finalContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Steal Results`))
        .addSeparatorComponents(new SeparatorBuilder());

      let desc = '';
      if (successes.length > 0) desc += `${EMOJI_SUCCESS} **Successfully stolen ${successes.length} item(s):**\n${successes.join('\n')}\n\n`;
      if (failures.length > 0) desc += `${EMOJI_DOT} **Failed to steal ${failures.length} item(s):**\n${failures.join('\n')}\n`;
      if (uniqueItems.length > maxItems) desc += `\n*Limited to ${maxItems} items per command.*`;

      finalContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(desc || 'No items were processed.'));
      finalContainer.addSeparatorComponents(new SeparatorBuilder());
      finalContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));

      return sent.edit({ components: [finalContainer] }).catch(() => {});
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
