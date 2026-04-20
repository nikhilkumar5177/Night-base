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
// --- Helper to resolve all emojis in a message options object ---
function resolveAllEmojis(options) {
  if (typeof options === 'string') return resolveEmojis(options);
  if (!options || typeof options !== 'object') return options;

  if (options.content) options.content = resolveEmojis(options.content);
  
  if (options.embeds && Array.isArray(options.embeds)) {
    options.embeds.forEach(e => {
      if (e.data) resolveEmbedEmojis(e.data);
      else resolveEmbedEmojis(e);
    });
  }

  if (options.components && Array.isArray(options.components)) {
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
  return options;
}

// --- Patch Message & Channel Send Methods ---
const { TextChannel, NewsChannel, ThreadChannel, User, DMChannel } = require('discord.js');

const originalSend = TextChannel.prototype.send;
const patchSend = function(options) {
  return originalSend.call(this, resolveAllEmojis(options));
};

[TextChannel, NewsChannel, ThreadChannel, DMChannel, User].forEach(cls => {
  if (cls.prototype.send) cls.prototype.send = patchSend;
});

const originalReply = Message.prototype.reply;
Message.prototype.reply = function(options) {
  return originalReply.call(this, resolveAllEmojis(options));
};

// --- Patch Interactions (Slash Commands, Buttons, Menus) ---
const { CommandInteraction, MessageComponentInteraction, ModalSubmitInteraction } = require('discord.js');

const patchInteraction = (proto) => {
  const originalIntReply = proto.reply;
  const originalIntUpdate = proto.update;
  const originalIntFollowUp = proto.followUp;

  if (originalIntReply) {
    proto.reply = function(options) {
      return originalIntReply.call(this, resolveAllEmojis(options));
    };
  }

  if (originalIntUpdate) {
    proto.update = function(options) {
      return originalIntUpdate.call(this, resolveAllEmojis(options));
    };
  }

  if (originalIntFollowUp) {
    proto.followUp = function(options) {
      return originalIntFollowUp.call(this, resolveAllEmojis(options));
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
