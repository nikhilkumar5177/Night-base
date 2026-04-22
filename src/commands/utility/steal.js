const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const axios = require('axios');
const sharp = require('sharp');
const { EMOJI_SUCCESS, EMOJI_ERROR, EMOJI_LOADING, SEP, EMOJI_DOT } = require('../../utils/constants');
const { sendUsage, sendAutoDelete } = require('../../utils/messageHelper');

module.exports = {
  name: 'steal',
  aliases: ['addemoji', 'addsticker', 'stealemoji', 'steals'],
  description: 'Steal multiple emojis or stickers from another server',
  usage: 'steal <emojis | stickers> [name]',
  example: 'steal :emoji1: :emoji2:\nsteal (replying to a message with emojis)\nsteal :emoji: custom_name',
  cooldown: 5,
  staffOnly: true,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
        return sendAutoDelete(message, { embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`${EMOJI_ERROR} You need **Manage Emojis and Stickers** permission.`)] }, 5000);
      }

      // Collect stickers
      let stickers = [...message.stickers.values()];
      let repliedMsg = null;
      if (message.reference) {
        repliedMsg = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
        if (repliedMsg) {
          stickers = [...stickers, ...repliedMsg.stickers.values()];
        }
      }

      // Collect emojis
      const emojiRegex = /<(a?):(.+?):(\d+)>/g;
      const content = message.content + (repliedMsg ? ' ' + (repliedMsg.content || '') : '');
      const emojiMatches = [...content.matchAll(emojiRegex)];

      const itemsToSteal = [];

      // Add stickers to items
      for (const sticker of stickers) {
        itemsToSteal.push({
          type: 'sticker',
          name: sticker.name,
          url: sticker.url,
          format: sticker.format,
          tags: sticker.tags,
          id: sticker.id
        });
      }

      // Add emojis to items
      for (const match of emojiMatches) {
        const animated = match[1] === 'a';
        const name = match[2];
        const id = match[3];
        itemsToSteal.push({
          type: 'emoji',
          name: name,
          id: id,
          animated: animated,
          url: `https://cdn.discordapp.com/emojis/${id}.${animated ? 'gif' : 'png'}`
        });
      }

      // Remove duplicates by ID
      const uniqueItems = [];
      const seen = new Set();
      for (const item of itemsToSteal) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          uniqueItems.push(item);
        }
      }

      if (uniqueItems.length === 0) {
        return sendUsage(message, module.exports);
      }

      // Limit items
      const maxItems = 10;
      const items = uniqueItems.slice(0, maxItems);

      const loadEmbed = new EmbedBuilder()
        .setColor('#EB459E')
        .setDescription(`${EMOJI_LOADING} **Stealing ${items.length} item(s)...**`);
      const sent = await message.reply({ embeds: [loadEmbed] });

      const successes = [];
      const failures = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // Update loading message for progress if multiple items
        if (items.length > 1) {
          await sent.edit({ 
            embeds: [new EmbedBuilder().setColor('#EB459E').setDescription(`${EMOJI_LOADING} **Stealing items (${i + 1}/${items.length}): \`${item.name}\`...**`)] 
          }).catch(() => {});
        }

        try {
          const response = await axios.get(item.url, { responseType: 'arraybuffer' });
          let buffer = Buffer.from(response.data);

          if (item.type === 'sticker') {
            if (item.format !== 3) { // 3 = Lottie
              buffer = await sharp(buffer)
                .resize(320, 320, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                .png({ quality: 80, compressionLevel: 9 })
                .toBuffer();
            }
            
            // If only one item and args provide a name, use it
            // Note: If args[0] was the emoji/sticker, args[1] might be name. 
            // For stickers, they don't appear in args usually, so args[0] is name.
            let stickerName = item.name;
            if (items.length === 1 && args[0] && !args[0].match(emojiRegex)) {
                stickerName = args[0];
            }

            const newSticker = await message.guild.stickers.create({
              file: buffer,
              name: stickerName.slice(0, 30),
              tags: item.tags || 'stolen',
              description: `Stolen from ${message.guild.name}`
            });
            successes.push(`Sticker: \`${newSticker.name}\``);
          } else {
            // Emoji compression
            if (buffer.length > 256 * 1024) {
              if (item.animated) {
                buffer = await sharp(buffer, { animated: true })
                  .resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                  .gif()
                  .toBuffer();
              } else {
                buffer = await sharp(buffer)
                  .resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                  .png({ quality: 75, compressionLevel: 9 })
                  .toBuffer();
              }
            }

            let emojiName = item.name;
            if (items.length === 1 && args[1]) {
              emojiName = args[1];
            }
            
            if (emojiName.length < 2) emojiName += '_';

            const newEmoji = await message.guild.emojis.create({ attachment: buffer, name: emojiName });
            successes.push(`<${item.animated ? 'a' : ''}:${newEmoji.name}:${newEmoji.id}> \`${newEmoji.name}\``);
          }
        } catch (err) {
          console.error(err);
          let errorMsg = err.message;
          if (err.message.includes('maximum size')) errorMsg = 'Too large';
          if (err.message.includes('Maximum number')) errorMsg = 'Guild limit reached';
          failures.push(`\`${item.name}\` (${errorMsg})`);
        }
      }

      // Final Response
      const finalEmbed = new EmbedBuilder()
        .setAuthor({ name: 'Wild Wolf │ Steal Results', iconURL: client.user.displayAvatarURL() })
        .setColor(failures.length === 0 ? '#57F287' : successes.length > 0 ? '#FEE75C' : '#ED4245')
        .setTimestamp();

      let description = `${SEP}\n`;
      if (successes.length > 0) {
        description += `${EMOJI_SUCCESS} **Successfully stolen ${successes.length} item(s):**\n${successes.join('\n')}\n\n`;
      }
      if (failures.length > 0) {
        description += `${EMOJI_ERROR} **Failed to steal ${failures.length} item(s):**\n${failures.join('\n')}\n`;
      }
      
      if (uniqueItems.length > maxItems) {
        description += `\n${EMOJI_DOT} *Limited to ${maxItems} items per command.*`;
      }
      
      description += SEP;
      finalEmbed.setDescription(description);

      return sent.edit({ embeds: [finalEmbed] });

    } catch (error) {
      console.error(error);
      sendAutoDelete(message, { embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`${EMOJI_ERROR} An error occurred: ${error.message}`)] }, 5000);
    }
  }
};
