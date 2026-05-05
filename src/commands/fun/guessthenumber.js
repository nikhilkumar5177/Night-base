const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, SlashCommandBuilder } = require('discord.js');
const { EMOJI_COMMAND, EMOJI_DOT, FOOTER_TEXT, EMOJI_SUCCESS, EMOJI_ERROR, EMOJI_WARN, EMOJI_INFO, EMOJI_UPVOTE, EMOJI_DOWNVOTE, EMOJI_CONGRATS } = require('../../utils/constants');
const { cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'guessthenumber',
  aliases: ['gtn', 'guess'],
  description: 'Play a game of Guess the Number!',
  usage: 'guess start\nguess [min] [max] [hint/nohint]',
  example: 'guess start\nguess 1 100 hint',
  cooldown: 5,
  enabled: true,
  data: new SlashCommandBuilder()
    .setName('guessthenumber')
    .setDescription('Play a game of Guess the Number!')
    .addIntegerOption(opt => opt.setName('min').setDescription('Minimum number').setRequired(false))
    .addIntegerOption(opt => opt.setName('max').setDescription('Maximum number').setRequired(false))
    .addStringOption(opt => opt.setName('mode').setDescription('Hint mode').addChoices(
      { name: 'With Hints', value: 'hint' },
      { name: 'No Hints', value: 'nohint' }
    ).setRequired(false)),
  execute: async (client, message, args) => {
    try {
      // Safety: initialize activeGames if not yet set (e.g. bot hasn't restarted)
      if (!client.activeGames) client.activeGames = new Map();

      // Check if a game is already running in this channel
      if (client.activeGames.has(message.channel.id)) {
        return message.reply({ components: [cv2Error('A game is already running in this channel. Use `?end` to stop it.')], flags: MessageFlags.IsComponentsV2 }).catch(() => { });
      }

      const isInteraction = !message.author;
      const prefix = client.config.prefix || '?';
      let min = 1;
      let max = 100;
      let mode = 'nohint';

      if (isInteraction) {
        min = message.options.getInteger('min') || 1;
        max = message.options.getInteger('max') || 100;
        mode = message.options.getString('mode') || 'nohint';
      } else {
        // No arguments → show usage
        if (!args.length || !args[0]) {
          const { sendUsage } = require('../../utils/messageHelper');
          return sendUsage(message, module.exports);
        }

        if (args[0].toLowerCase() === 'start') {
          min = Math.floor(Math.random() * 50) + 1; // 1-50
          max = Math.floor(Math.random() * 450) + 51; // 51-500
          mode = Math.random() > 0.5 ? 'hint' : 'nohint';
        } else if (!isNaN(args[0])) {
          min = parseInt(args[0]) || 1;
          max = parseInt(args[1]) || 100;
          mode = (args[2] || '').toLowerCase() === 'hint' ? 'hint' : 'nohint';
        } else {
          const { sendUsage } = require('../../utils/messageHelper');
          return sendUsage(message, module.exports);
        }
      }

      if (min >= max) {
        return message.reply({ components: [cv2Error('Minimum number must be less than maximum number.')], flags: MessageFlags.IsComponentsV2 }).catch(() => { });
      }

      const targetNumber = Math.floor(Math.random() * (max - min + 1)) + min;
      const starter = isInteraction ? message.user : message.author;
      const useHints = mode === 'hint';
      let winner = null;

      const startContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Guess the Number`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${EMOJI_COMMAND} **Game Started!**\nI have picked a number between **${min} and ${max}**.\n\n` +
          `${EMOJI_DOT} **Anyone** can type their guess in the chat.\n` +
          `${EMOJI_DOT} **Hints:** \`${useHints ? `Enabled (${EMOJI_UPVOTE}/${EMOJI_DOWNVOTE} Reactions)` : 'Disabled'}\`\n` +
          `${EMOJI_DOT} Use \`${prefix}end\` to stop the game.`
        ))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));

      await message.reply({ components: [startContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => { });

      const filter = m => !m.author.bot;
      const collector = message.channel.createMessageCollector({ filter, time: 300000 });

      // Store collector globally so /end command can access it
      client.activeGames.set(message.channel.id, {
        collector,
        starterId: starter.id,
        targetNumber
      });

      // Extract ID from custom emoji string, fallback to unicode if not a custom emoji
      const getReactId = (emojiStr) => {
        const match = emojiStr.match(/<a?:.+:(\d+)>/);
        return match ? match[1] : emojiStr;
      };

      const userCooldowns = new Set();

      collector.on('collect', async (m) => {
        // Handle ?end
        if (m.content.toLowerCase() === `${prefix}end`) {
          const isStarter = m.author.id === starter.id;
          const isOwner = m.guild?.ownerId === m.author.id;
          const devIds = (process.env.DEV_ID || '').split(',');
          const isDev = devIds.includes(m.author.id);

          if (isStarter || isOwner || isDev) {
            collector.stop('cancelled');
            return;
          }
        }

        if (isNaN(m.content)) return;
        const guess = parseInt(m.content);
        if (guess < min || guess > max) return;

        if (guess === targetNumber) {
          winner = m.author;
          await m.react(getReactId('✅')).catch(() => { });
          collector.stop('win');
        } else if (useHints) {
          // Anti-spam: 2 seconds cooldown per user for hints to prevent rate limits
          if (userCooldowns.has(m.author.id)) return;
          userCooldowns.add(m.author.id);
          setTimeout(() => userCooldowns.delete(m.author.id), 1000);

          const emojiStr = guess < targetNumber ? EMOJI_UPVOTE : EMOJI_DOWNVOTE;
          await m.react(getReactId(emojiStr)).catch(() => { });
        }
      });

      collector.on('end', async (collected, reason) => {
        client.activeGames.delete(message.channel.id);

        let finalContent = '';
        let mention = '';

        if (reason === 'win' && winner) {
          finalContent = `${EMOJI_CONGRATS} **We have a winner!**\nThe number was **${targetNumber}**.\n\n` +
            `${EMOJI_DOT} **Winner:** <@${winner.id}>\n` +
            `${EMOJI_DOT} **Total Guesses:** \`${collected.size}\``;
          mention = `<@${winner.id}> <@${starter.id}>`;
        } else if (reason === 'cancelled') {
          finalContent = `${EMOJI_WARN} **Game Cancelled!**\nThe game was ended by an authorized user.\n\n` +
            `${EMOJI_DOT} **The number was:** \`${targetNumber}\``;
          mention = `<@${starter.id}>`;
        } else {
          finalContent = `${EMOJI_ERROR} **Game Over!**\nNo one guessed the number in time.\n\n` +
            `${EMOJI_DOT} **The number was:** \`${targetNumber}\``;
          mention = `<@${starter.id}>`;
        }

        const endContainer = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Game Results`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(finalContent))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));

        await message.channel.send({
          content: mention,
          components: [endContainer],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { users: [starter.id, winner?.id].filter(Boolean) }
        }).catch(() => { });
      });

    } catch (error) {
      console.error(error);
      message.reply({ components: [cv2Error(error.message)], flags: MessageFlags.IsComponentsV2 }).catch(() => { });
    }
  }
};
