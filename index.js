require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Partials, EmbedBuilder, Message } = require('discord.js');
const config = require('./config.json');
const commandHandler = require('./src/handlers/commandHandler');
const eventHandler = require('./src/handlers/eventHandler');
const storage = require('./src/utils/storageManager');
const logger = require('./src/utils/logger');
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.AutoModerationExecution
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
  allowedMentions: { parse: [] }
});

client.commands = new Collection();
client.aliases = new Collection();
client.config = config;
client.cooldowns = new Map();
client.snipeCache = new Map();
client.ignoredDeletes = new Set(); // Dedicated set for ghost ping protection

storage.init();
storage.startPeriodicFlush(120000);

commandHandler(client);
eventHandler(client);

process.on('unhandledRejection', (error) => {
  logger.error(`Unhandled Rejection: ${error.stack || error}`);
});

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.stack || error}`);
  // We don't want to exit immediately, but Node might be in an unstable state.
  // For debugging, we'll keep it alive if possible or let it crash after logging.
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
