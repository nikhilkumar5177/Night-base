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
    
    // Resolve embeds
    if (options.embeds) {
      for (let i = 0; i < options.embeds.length; i++) {
        const e = options.embeds[i];
        if (e.data) resolveEmbedEmojis(e.data);
        else resolveEmbedEmojis(e);
      }
    }
    
    // Resolve components
    if (options.components) {
      for (const row of options.components) {
        const components = row.components || (row.data && row.data.components);
        if (!components) continue;
        
        for (const comp of components) {
          const data = comp.data || comp;
          if (data.label) data.label = resolveEmojis(data.label);
          if (data.placeholder) data.placeholder = resolveEmojis(data.placeholder);
          if (data.description) data.description = resolveEmojis(data.description);
          
          if (data.emoji) {
            const emojiName = data.emoji.name || data.emoji;
            if (typeof emojiName === 'string' && emojiName.includes('{')) {
              const res = resolveEmojis(emojiName);
              if (res !== emojiName) data.emoji = parseEmoji(res);
            }
          }

          const selectOptions = comp.options || data.options;
          if (selectOptions?.length) {
            for (const opt of selectOptions) {
              const optData = opt.data || opt;
              if (optData.label) optData.label = resolveEmojis(optData.label);
              if (optData.description) optData.description = resolveEmojis(optData.description);
              if (optData.emoji) {
                const optEmojiName = optData.emoji.name || optData.emoji;
                if (typeof optEmojiName === 'string' && optEmojiName.includes('{')) {
                  const res = resolveEmojis(optEmojiName);
                  if (res !== optEmojiName) optData.emoji = parseEmoji(res);
                }
              }
            }
          }
        }
      }
    }
  }
  return originalCreate.call(this, target, options);
};

// --- Patch Interactions (Slash Commands, Buttons, Menus) ---
const { Interaction, CommandInteraction, MessageComponentInteraction, ModalSubmitInteraction } = require('discord.js');

const patchInteraction = (proto) => {
  const originalReply = proto.reply;
  const originalUpdate = proto.update;
  const originalFollowUp = proto.followUp;

  if (originalReply) {
    proto.reply = function(options) {
      if (typeof options === 'string') options = resolveEmojis(options);
      else if (options && options.embeds) options.embeds.forEach(e => resolveEmbedEmojis(e.data || e));
      if (options && options.content) options.content = resolveEmojis(options.content);
      return originalReply.call(this, options);
    };
  }

  if (originalUpdate) {
    proto.update = function(options) {
      if (typeof options === 'string') options = resolveEmojis(options);
      else if (options && options.embeds) options.embeds.forEach(e => resolveEmbedEmojis(e.data || e));
      if (options && options.content) options.content = resolveEmojis(options.content);
      return originalUpdate.call(this, options);
    };
  }

  if (originalFollowUp) {
    proto.followUp = function(options) {
      if (typeof options === 'string') options = resolveEmojis(options);
      else if (options && options.embeds) options.embeds.forEach(e => resolveEmbedEmojis(e.data || e));
      if (options && options.content) options.content = resolveEmojis(options.content);
      return originalFollowUp.call(this, options);
    };
  }
};

[CommandInteraction, MessageComponentInteraction, ModalSubmitInteraction].forEach(i => patchInteraction(i.prototype));

const originalReact = Message.prototype.react;
Message.prototype.react = function(emoji) {
  return originalReact.call(this, resolveEmojis(emoji));
};

const originalDelete = Message.prototype.delete;
Message.prototype.delete = function() {
  if (this.client) {
    if (!this.client.ignoredDeletes || !(this.client.ignoredDeletes instanceof Set)) {
      this.client.ignoredDeletes = new Set();
    }
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
  logger.error(`Unhandled Rejection: ${error.stack || error}`);
});

process.on('SIGINT', async () => {
  await storage.stopPeriodicFlush();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await storage.stopPeriodicFlush();
  process.exit(0);
});

client.login(process.env.TOKEN);
