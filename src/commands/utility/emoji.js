const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { EMOJI_SUCCESS, EMOJI_DOT } = require('../../utils/constants');
const { cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'emoji',
  aliases: ['getemoji', 'emojiid'],
  description: 'Extract ID and pattern code from a custom emoji',
  usage: 'emoji <emoji>',
  cooldown: 3,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (!args.length) return message.reply({ components: [cv2Error('Please provide at least one custom emoji.')], flags: 32768 });

      const inputStr = args.join(' ');
      const emojiRegex = /<(a?):([a-zA-Z0-9_]+):(\d+)>/g;
      const matches = [...inputStr.matchAll(emojiRegex)];

      if (matches.length === 0) return message.reply({ components: [cv2Error('No custom emojis found. Make sure they are server custom emojis.')], flags: 32768 });

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Emoji Info`))
        .addSeparatorComponents(new SeparatorBuilder());

      if (matches.length === 1) {
        const match = matches[0];
        const isAnimated = match[1] === 'a';
        const name = match[2];
        const id = match[3];
        const pattern = `<${isAnimated ? 'a' : ''}:${name}:${id}>`;
        const url = `https://cdn.discordapp.com/emojis/${id}.${isAnimated ? 'gif' : 'png'}`;

        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${EMOJI_SUCCESS} **Emoji successfully parsed!**\n\n` +
          `**Name:** \`${name}\` \u2502 **ID:** \`${id}\` \u2502 **Animated:** ${isAnimated ? 'Yes' : 'No'}\n` +
          `**Pattern Code:**\n\`\`\`${pattern}\`\`\`\n` +
          `**URL:** [Download Link](${url})`
        ));
      } else {
        let desc = `${EMOJI_SUCCESS} **Successfully parsed ${matches.length} emojis!**\n\n`;
        const maxDisplay = Math.min(matches.length, 10);

        for (let i = 0; i < maxDisplay; i++) {
          const match = matches[i];
          const isAnimated = match[1] === 'a';
          const name = match[2];
          const id = match[3];
          const pattern = `<${isAnimated ? 'a' : ''}:${name}:${id}>`;
          const url = `https://cdn.discordapp.com/emojis/${id}.${isAnimated ? 'gif' : 'png'}`;
          desc += `${pattern} **${name}** \u2014 \`${id}\` \u2014 [Link](${url})\n`;
        }

        if (matches.length > 10) desc += `\n*...and ${matches.length - 10} more.*`;
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(desc));
      }

      return message.reply({ components: [container], flags: 32768 }).catch(() => {});
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
