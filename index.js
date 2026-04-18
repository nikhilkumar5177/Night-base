require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Partials, EmbedBuilder, MessagePayload, Message, parseEmoji } = require('discord.js');
const config = require('./config.json');
const commandHandler = require('./src/handlers/commandHandler');
const eventHandler = require('./src/handlers/eventHandler');
const storage = require('./src/utils/storageManager');
const logger = require('./src/utils/logger');
const { resolveEmbedEmojis, resolveEmojis } = require('./src/utils/constants');

// --- Global Emoji Resolver Patch ---
// Automatically resolves {EMOJI_*} placeholders in all message content, embeds, components, and reactions
const originalCreate = MessagePayload.create;
MessagePayload.create = function(target, options) {
  if (typeof options === 'string') {
    options = resolveEmojis(options);
  } else if (options) {
    if (options.content) options.content = resolveEmojis(options.content);
    if (options.embeds) {
      options.embeds = options.embeds.map(e => {
        if (e.data) {
          resolveEmbedEmojis(e.data);
          return e;
        }
        return resolveEmbedEmojis(e);
      });
    }
    if (options.components) {
      options.components.forEach(row => {
        const componentsArray = row.components || (row.data && row.data.components) || [];
        if (componentsArray) {
          componentsArray.forEach(child => {
            const compData = child.data || child;
            if (compData.label) compData.label = resolveEmojis(compData.label);
            if (compData.placeholder) compData.placeholder = resolveEmojis(compData.placeholder);
            if (compData.description) compData.description = resolveEmojis(compData.description);
            if (compData.emoji && typeof compData.emoji.name === 'string') {
              const res = resolveEmojis(compData.emoji.name);
              if (res !== compData.emoji.name) compData.emoji = parseEmoji(res);
            } else if (typeof compData.emoji === 'string') {
              const res = resolveEmojis(compData.emoji);
              if (res !== compData.emoji) compData.emoji = parseEmoji(res);
            }
            
            const optionsArray = child.options || compData.options || [];
            if (optionsArray.length) {
              optionsArray.forEach(opt => {
                const optData = opt.data || opt;
                if (optData.label) optData.label = resolveEmojis(optData.label);
                if (optData.description) optData.description = resolveEmojis(optData.description);
                if (optData.emoji && typeof optData.emoji.name === 'string') {
                  const res = resolveEmojis(optData.emoji.name);
                  if (res !== optData.emoji.name) optData.emoji = parseEmoji(res);
                } else if (typeof optData.emoji === 'string') {
                  const res = resolveEmojis(optData.emoji);
                  if (res !== optData.emoji) optData.emoji = parseEmoji(res);
                }
              });
            }
          });
        }
      });
    }
  }
  return originalCreate.call(this, target, options);
};

const originalReact = Message.prototype.react;
Message.prototype.react = function(emoji) {
  return originalReact.call(this, resolveEmojis(emoji));
};

const originalDelete = Message.prototype.delete;
Message.prototype.delete = function() {
  if (this.client) {
    if (!this.client.ignoredDeletes) this.client.ignoredDeletes = new Set();
    this.client.ignoredDeletes.add(this.id);
    setTimeout(() => {
      if (this.client.ignoredDeletes) this.client.ignoredDeletes.delete(this.id);
    }, 15000);
  }
  return originalDelete.apply(this, arguments);
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.commands = new Collection();
client.aliases = new Collection();
client.config = config;
client.cooldowns = new Map();
client.snipeCache = new Map();

storage.init();
storage.startPeriodicFlush(30000);

commandHandler(client);
eventHandler(client);

process.on('unhandledRejection', (error) => {
  logger.error(`Unhandled Rejection: ${error.message}`);
});

process.on('SIGINT', () => {
  storage.stopPeriodicFlush();
  process.exit(0);
});

process.on('SIGTERM', () => {
  storage.stopPeriodicFlush();
  process.exit(0);
});

client.login(process.env.TOKEN);
