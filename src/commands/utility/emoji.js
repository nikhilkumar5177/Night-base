const { EmbedBuilder } = require('discord.js');
const { SEP, EMOJI_SUCCESS, EMOJI_ERROR } = require('../../utils/constants');


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
      if (!args.length) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ED4245')
              .setDescription(`${EMOJI_ERROR} Please provide at least one custom emoji.`)
              .setTimestamp()
          ]
        });
      }

      const inputStr = args.join(' ');
      const emojiRegex = /<(a?):([a-zA-Z0-9_]+):(\d+)>/g;
      const matches = [...inputStr.matchAll(emojiRegex)];

      if (matches.length === 0) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ED4245')
              .setDescription(`${EMOJI_ERROR} No custom emojis found. Make sure they are server custom emojis.`)
              .setTimestamp()
          ]
        });
      }

      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({ name: 'Wild Wolf \u2502 Emoji Info', iconURL: client.user.displayAvatarURL() })
        .setFooter({ text: 'Wild Wolf \u2022 Utility', iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();

      if (matches.length === 1) {
        const match = matches[0];
        const isAnimated = match[1] === 'a';
        const name = match[2];
        const id = match[3];
        const pattern = `<${isAnimated ? 'a' : ''}:${name}:${id}>`;
        const url = `https://cdn.discordapp.com/emojis/${id}.${isAnimated ? 'gif' : 'png'}`;

        embed.setDescription(`${SEP}\n${EMOJI_SUCCESS} **Emoji successfully parsed!**\n${SEP}`);
        embed.addFields(
          { name: '\u25B8 Name', value: `\`${name}\``, inline: true },
          { name: '\u25B8 ID', value: `\`${id}\``, inline: true },
          { name: '\u25B8 Animated', value: isAnimated ? '\`Yes\`' : '\`No\`', inline: true },
          { name: '\u25B8 Pattern Code', value: `\`\`\`${pattern}\`\`\``, inline: false },
          { name: '\u25B8 URL', value: `[Click here to download](${url})`, inline: false }
        );
        embed.setThumbnail(url);
      } else {
        let desc = `${SEP}\n${EMOJI_SUCCESS} **Successfully parsed ${matches.length} emojis!**\n${SEP}\n\n`;
        const maxDisplay = Math.min(matches.length, 10);

        for (let i = 0; i < maxDisplay; i++) {
          const match = matches[i];
          const isAnimated = match[1] === 'a';
          const name = match[2];
          const id = match[3];
          const pattern = `<${isAnimated ? 'a' : ''}:${name}:${id}>`;
          const url = `https://cdn.discordapp.com/emojis/${id}.${isAnimated ? 'gif' : 'png'}`;

          desc += `${pattern} **${name}**\n\u25B8 **ID:** \`${id}\`\n\u25B8 **Pattern:** \`${pattern}\`\n\u25B8 [Download Link](${url})\n\n`;
        }

        if (matches.length > 10) {
          desc += `*...and ${matches.length - 10} more.*`;
        }

        embed.setDescription(desc);
      }

      return message.reply({ embeds: [embed] }).catch(() => {});
    } catch (error) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ED4245')
            .setDescription(`${EMOJI_ERROR} ${error.message}`)
            .setTimestamp()
        ]
      });
    }
  }
};
