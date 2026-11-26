const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 18) {
  console.error(`❌ Error: This bot requires Node.js 18.0.0 or higher. Current version: ${process.versions.node}`);
  process.exit(1);
}

require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Partials, Options } = require('discord.js');
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
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.AutoModerationExecution
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
  allowedMentions: { parse: [] },
  sweepers: {
    ...Options.DefaultSweeperSettings,
    messages: {
      interval: 1800,
      lifetime: 900
    }
  },
  makeCache: Options.cacheWithLimits({
    ...Options.DefaultMakeCacheSettings,
    MessageManager: 50,
    PresenceManager: 0,
    ReactionManager: 0,
    ThreadMemberManager: 0,
    GuildScheduledEventManager: 0,
    StageInstanceManager: 0
  }),
  rest: {
    timeout: 15000,
    retries: 2
  }
});

client.commands = new Collection();
client.aliases = new Collection();
client.config = config;
client.cooldowns = new Map();
client.snipeCache = new Map();
client.activeGames = new Map();
client.devIds = new Set((process.env.DEV_ID || '').split(',').map(s => s.trim()).filter(Boolean));

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

// Startup validation for cloud / VPS environments
if (!process.env.TOKEN || !process.env.TOKEN.trim()) {
  console.error('\n' + '='.repeat(60));
  console.error('❌ FATAL ERROR: No bot TOKEN was found in your environment!');
  console.error('If you are using Pterodactyl/VPS/Railway/Heroku/Render:');
  console.error('1. Make sure your .env file is uploaded or TOKEN environment variable is configured.');
  console.error('2. TOKEN must look like: TOKEN=MTAy...\n' + '='.repeat(60) + '\n');
  process.exit(1);
}

console.log(`[Host Startup] Running on Node.js ${process.version}`);
console.log(`[Host Startup] Logging in to Discord Gateway...`);

client.login(process.env.TOKEN).catch((err) => {
  console.error('\n' + '='.repeat(60));
  console.error(`❌ FAILED TO LOG IN TO DISCORD: ${err.message}`);
  if (err.message.includes('TOKEN_INVALID') || err.message.includes('An invalid token')) {
    console.error('👉 The Discord bot TOKEN provided is invalid. Please reset it in Discord Developer Portal.');
  } else if (err.message.includes('Disallowed intent') || err.message.includes('DISALLOWED_INTENTS')) {
    console.error('👉 Privileged Gateway Intents are disabled! In https://discord.com/developers/applications:');
    console.error('   Under "Bot", enable:');
    console.error('   - Presence Intent');
    console.error('   - Server Members Intent');
    console.error('   - Message Content Intent');
  } else if (err.message.includes('ENOTFOUND') || err.message.includes('ETIMEDOUT') || err.message.includes('ECONNREFUSED')) {
    console.error('👉 Network Error: The host cannot reach discord.com. Check firewall, DNS, or proxy settings.');
  }
  console.error('='.repeat(60) + '\n');
  process.exit(1);
});
