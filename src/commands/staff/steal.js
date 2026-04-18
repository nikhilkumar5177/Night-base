const { EmbedBuilder, PermissionsBitField } = require('discord.js');

const SEP = '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501';

module.exports = {
  name: 'steal',
  aliases: ['emojisteal', 'addemoji'],
  description: 'Steal custom emojis from a message and add them to the server',
  usage: 'steal [emojis] or reply to a message',
  cooldown: 10,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuildExpressions)) {
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor('#ED4245')
              .setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() })
              .setDescription('{EMOJI_ERROR} You need **ManageGuildExpressions** permission to steal emojis.')
              .setTimestamp()
          ]
        });
      }

      if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageGuildExpressions)) {
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor('#ED4245')
              .setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() })
              .setDescription('{EMOJI_ERROR} I need **ManageGuildExpressions** permission to add emojis.')
              .setTimestamp()
          ]
        });
      }

      let contentToParse = args.join(' ');

      if (!contentToParse && message.reference && message.reference.messageId) {
        try {
          const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
          contentToParse = repliedMsg.content || '';

          if (repliedMsg.embeds && repliedMsg.embeds.length > 0) {
            repliedMsg.embeds.forEach(embed => {
              if (embed.title) contentToParse += ' ' + embed.title;
              if (embed.description) contentToParse += ' ' + embed.description;
              if (embed.fields) {
                embed.fields.forEach(f => {
                  contentToParse += ' ' + f.name + ' ' + f.value;
                });
              }
            });
          }
        } catch (err) {
          return message.channel.send({
            embeds: [
              new EmbedBuilder()
                .setColor('#ED4245')
                .setDescription('{EMOJI_ERROR} Could not fetch the replied message.')
                .setTimestamp()
            ]
          });
        }
      }

      if (!contentToParse) {
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor('#ED4245')
              .setDescription('{EMOJI_ERROR} Please provide emojis to steal or reply to a message containing emojis.')
              .setTimestamp()
          ]
        });
      }

      const emojiRegex = /<(a?):([a-zA-Z0-9_]+):(\d+)>/g;
      const matches = [...contentToParse.matchAll(emojiRegex)];

      if (matches.length === 0) {
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor('#ED4245')
              .setDescription('{EMOJI_ERROR} No custom emojis found in the provided text or message.')
              .setTimestamp()
          ]
        });
      }

      const maxEmojis = 10;
      const emojisToSteal = matches.slice(0, maxEmojis);

      const loadEmbed = new EmbedBuilder()
        .setColor('#EB459E')
        .setAuthor({ name: 'Wild Wolf \u2502 Emoji Stealer', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n{EMOJI_LOADING} **Stealing ${emojisToSteal.length} emoji(s)...**\n${SEP}`)
        .setTimestamp();

      const sentMsg = await message.channel.send({ embeds: [loadEmbed] });

      const successes = [];
      const failures = [];

      for (const match of emojisToSteal) {
        const isAnimated = match[1] === 'a';
        let name = match[2];
        const id = match[3];
        const ext = isAnimated ? 'gif' : 'png';
        let url = `https://cdn.discordapp.com/emojis/${id}.${ext}`;

        try {
          // Fallback fetch logic to handle WebP and Invalid Assets
          let response = await fetch(url);
          if (!response.ok && ext === 'png') {
            url = `https://cdn.discordapp.com/emojis/${id}.webp`;
            response = await fetch(url);
          }

          if (!response.ok) {
            throw new Error(`Could not download image (${response.status})`);
          }

          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // Discord requires emoji names to be at least 2 characters long
          if (name.length < 2) name = name + '_';

          const addedEmoji = await message.guild.emojis.create({ attachment: buffer, name: name });
          successes.push(`<${isAnimated ? 'a' : ''}:${addedEmoji.name}:${addedEmoji.id}> **${addedEmoji.name}**`);
        } catch (error) {
          failures.push(`**${name}** - ${error.message}`);
        }
      }

      const resultEmbed = new EmbedBuilder()
        .setColor(failures.length === 0 ? '#00e676' : failures.length === emojisToSteal.length ? '#ED4245' : '#FEE75C')
        .setAuthor({ name: 'Wild Wolf \u2502 Emoji Steal Results', iconURL: client.user.displayAvatarURL() })
        .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();

      let desc = `${SEP}\n`;
      if (successes.length > 0) {
        desc += `{EMOJI_SUCCESS} **Successfully Stolen (${successes.length}):**\n${successes.join('\n')}\n\n`;
      }
      if (failures.length > 0) {
        desc += `{EMOJI_ERROR} **Failed (${failures.length}):**\n${failures.join('\n')}\n`;
      }

      if (matches.length > maxEmojis) {
        desc += `\n*Note: Limited to ${maxEmojis} emojis per command to prevent abuse.*`;
      }

      desc += SEP;
      resultEmbed.setDescription(desc);

      await sentMsg.edit({ embeds: [resultEmbed] });

    } catch (error) {
      message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('#ED4245')
            .setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() })
            .setDescription(`{EMOJI_ERROR} ${error.message}`)
            .setTimestamp()
        ]
      });
    }
  }
};
