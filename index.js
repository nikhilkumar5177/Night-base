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
const rawToken = process.env.TOKEN ? process.env.TOKEN.trim().replace(/^["']|["']$/g, '') : '';
if (!rawToken) {
  console.error('\n' + '='.repeat(60));
  console.error('❌ FATAL ERROR: No bot TOKEN was found in your environment!');
  console.error('If you are using Pterodactyl/VPS/Railway/Heroku/Render:');
  console.error('1. Make sure your .env file is uploaded or TOKEN environment variable is configured.');
  console.error('2. TOKEN must look like: TOKEN=MTAy...\n' + '='.repeat(60) + '\n');
  process.exit(1);
}

// Discord Gateway & WebSocket Diagnostics
client.on('shardDisconnect', (event, shardId) => {
  console.warn(`[Discord Gateway] Shard ${shardId} disconnected (Code: ${event.code}) ${event.reason || ''}`);
  if (event.code === 4014) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ CRITICAL: DISALLOWED INTENTS DETECTED (Code 4014)');
    console.error('Discord closed the connection because Privileged Gateway Intents are disabled.');
    console.error('Go to: https://discord.com/developers/applications');
    console.error('1. Select your Bot');
    console.error('2. Click "Bot" tab on the left');
    console.error('3. Scroll down to "Privileged Gateway Intents" and TURN ON:');
    console.error('   [x] Presence Intent');
    console.error('   [x] Server Members Intent');
    console.error('   [x] Message Content Intent');
    console.error('4. Click "Save Changes" and restart your bot!');
    console.error('='.repeat(60) + '\n');
    process.exit(1);
  } else if (event.code === 4004) {
    console.error('\n❌ CRITICAL: Invalid bot TOKEN (Code 4004). Please check your .env file.\n');
    process.exit(1);
  }
});

client.on('shardError', (err, shardId) => {
  console.error(`[Discord Gateway] Shard ${shardId} Error: ${err.message}`);
});

client.on('debug', (info) => {
  if (
    info.includes('429') ||
    info.includes('rate limit') ||
    info.includes('[WS =>') ||
    info.includes('Heartbeat') ||
    info.includes('Session') ||
    info.includes('Identifying') ||
    info.includes('Disallowed')
  ) {
    console.log(`[Gateway Debug] ${info}`);
  }
});

client.rest.on('rateLimited', (info) => {
  console.warn(`⚠️ [Discord RateLimit] Route: ${info.route} | Timeout: ${info.timeToReset}ms | Global: ${info.global}`);
});

(async () => {
  console.log(`[Host Startup] Running on Node.js ${process.version}`);
  console.log(`[Host Startup] Verifying connection to Discord API...`);

  try {
    const res = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bot ${rawToken}` }
    });

    if (res.status === 200) {
      const botUser = await res.json();
      console.log(`[Host Startup] Token validated successfully! Bot: ${botUser.username}#${botUser.discriminator || '0'} (ID: ${botUser.id})`);
    } else if (res.status === 401) {
      console.error('\n❌ FATAL: Discord rejected your bot token (401 Unauthorized). Reset token in Discord Developer Portal.\n');
      process.exit(1);
    } else if (res.status === 429) {
      const body = await res.text();
      console.error('\n' + '='.repeat(60));
      console.error('❌ HOST IP BLOCKED / RATE LIMITED (HTTP 429)');
      console.error('Your hosting server IP is being rate-limited or blocked by Discord / Cloudflare.');
      console.error(`Details: ${body.slice(0, 200)}`);
      console.error('If you are on a shared/free host, ask your host to switch server node or use a VPS.');
      console.error('='.repeat(60) + '\n');
      process.exit(1);
    } else {
      console.warn(`[Host Startup] Discord API returned HTTP ${res.status}`);
    }
  } catch (err) {
    console.error(`❌ [Host Startup] Failed to connect to https://discord.com: ${err.message}`);
    console.error('Check server firewall, DNS, or outbound internet access.');
  }

  console.log(`[Host Startup] Connecting to Discord Gateway WebSocket...`);
  client.login(rawToken).catch((err) => {
    console.error(`❌ FAILED TO LOG IN TO DISCORD: ${err.message}`);
    process.exit(1);
  });
})();
