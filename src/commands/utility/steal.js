const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { EMOJI_SUCCESS, EMOJI_ERROR, EMOJI_LOADING, SEP, EMOJI_DOT } = require('../../utils/constants');
const { sendUsage, sendAutoDelete } = require('../../utils/messageHelper');

module.exports = {
  name: 'steal',
  aliases: ['addemoji', 'addsticker', 'stealemoji', 'steals'],
  description: 'Steal an emoji or sticker from another server',
  usage: 'steal <emoji | sticker> [name]',
  example: 'steal :custom_emoji: cool_name\nsteal (while replying to a sticker)',
  cooldown: 5,
  staffOnly: true,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
        return sendAutoDelete(message, { embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`${EMOJI_ERROR} You need **Manage Emojis and Stickers** permission.`)] }, 5000);
      }

      // --- 1. Check for Stickers first (Prioritize replied message) ---
      let targetSticker = message.stickers.first();
      if (!targetSticker && message.reference) {
        const repliedMsg = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
        if (repliedMsg && repliedMsg.stickers.size > 0) {
          targetSticker = repliedMsg.stickers.first();
        }
      }

      if (targetSticker) {
        const loadEmbed = new EmbedBuilder().setColor('#EB459E').setDescription(`${EMOJI_LOADING} **Stealing sticker: \`${targetSticker.name}\`...**`);
        const sent = await message.reply({ embeds: [loadEmbed] });

        try {
          const name = args[0] || targetSticker.name;
          const newSticker = await message.guild.stickers.create({
            file: targetSticker.url,
            name: name,
            tags: targetSticker.tags || 'stolen',
            description: `Stolen from ${message.guild.name}`
          });

          const successEmbed = new EmbedBuilder()
            .setColor('#57F287')
            .setAuthor({ name: 'Wild Wolf │ Sticker Stolen', iconURL: client.user.displayAvatarURL() })
            .setDescription(`${SEP}\n${EMOJI_SUCCESS} **Sticker added successfully!**\n${SEP}`)
            .addFields(
              { name: 'Name', value: `\`${newSticker.name}\``, inline: true },
              { name: 'ID', value: `\`${newSticker.id}\``, inline: true }
            )
            .setThumbnail(newSticker.url)
            .setTimestamp();
          
          return sent.edit({ embeds: [successEmbed] });
        } catch (err) {
          return sent.edit({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`${EMOJI_ERROR} Failed to add sticker: ${err.message}`)] });
        }
      }

      // --- 2. Check for Emojis ---
      const emojiArg = args[0];
      if (!emojiArg) return sendUsage(message, module.exports);

      const emojiMatch = emojiArg.match(/<(a?):(.+?):(\d+)>/);
      if (emojiMatch) {
        const animated = emojiMatch[1] === 'a';
        const name = args[1] || emojiMatch[2];
        const id = emojiMatch[3];
        const url = `https://cdn.discordapp.com/emojis/${id}.${animated ? 'gif' : 'png'}`;

        const loadEmbed = new EmbedBuilder().setColor('#EB459E').setDescription(`${EMOJI_LOADING} **Stealing emoji: \`${name}\`...**`);
        const sent = await message.reply({ embeds: [loadEmbed] });

        try {
          const newEmoji = await message.guild.emojis.create({ attachment: url, name: name });
          
          const successEmbed = new EmbedBuilder()
            .setColor('#57F287')
            .setAuthor({ name: 'Wild Wolf │ Emoji Stolen', iconURL: client.user.displayAvatarURL() })
            .setDescription(`${SEP}\n${EMOJI_SUCCESS} **Emoji added successfully!**\n${SEP}`)
            .addFields(
              { name: 'Name', value: `<:${newEmoji.name}:${newEmoji.id}> \`${newEmoji.name}\``, inline: true },
              { name: 'ID', value: `\`${newEmoji.id}\``, inline: true }
            )
            .setThumbnail(newEmoji.url)
            .setTimestamp();

          return sent.edit({ embeds: [successEmbed] });
        } catch (err) {
          return sent.edit({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`${EMOJI_ERROR} Failed to add emoji: ${err.message}`)] });
        }
      }

      // If no sticker and no emoji found
      return sendAutoDelete(message, { embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`${EMOJI_ERROR} No valid emoji or sticker found to steal.`)] }, 5000);

    } catch (error) {
      console.error(error);
      sendAutoDelete(message, { embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`${EMOJI_ERROR} An error occurred: ${error.message}`)] }, 5000);
    }
  }
};
