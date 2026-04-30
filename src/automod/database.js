const fs = require('fs');
const path = require('path');
const { EMOJI_ERROR } = require('../utils/constants');

const CONFIG_DIR = path.join(__dirname, '..', '..', 'storage', 'automod');

// Ensure config directory exists
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

const DEFAULT_CONFIG = {
  enabled: false,
  logChannel: null,
  bypassRoles: [],
  bypassUsers: [],
  modules: {
    spam: {
      enabled: false,
      limit: 5,
      window: 10,
      actions: ['delete', 'warn'],
      exemptChannels: [],
      exemptRoles: [],
      exemptUsers: [],
      responseMessage: `${EMOJI_ERROR} **{user}**, please stop spamming!`,
      duplicateDetection: true
    },
    links: {
      enabled: false,
      allowedLinks: [],
      antiInvite: true,
      antiPhishing: true,
      antiGifs: false,
      allowedGifs: [],
      exemptGifsRoles: [],
      actions: ['delete', 'warn'],
      exemptChannels: [],
      exemptRoles: [],
      exemptUsers: [],
      responseMessage: `${EMOJI_ERROR} **{user}**, links are not allowed here.`
    },
    raid: {
      enabled: false,
      joinLimit: 10,
      window: 30,
      autoLockdown: true,
      minAccountAge: 1, // in days
      actions: ['kick'],
      exemptChannels: [],
      exemptRoles: [],
      exemptUsers: []
    },
    content: {
      enabled: false,
      blockedWords: [], // Whole word matching only
      partialBlockedWords: [], // Substring/in-between matching
      capsLimit: 70, // percentage
      lineLimit: 10,
      ghostPing: true,
      actions: ['delete', 'warn'],
      exemptChannels: [],
      exemptRoles: [],
      exemptUsers: [],
      responseMessage: `${EMOJI_ERROR} **{user}**, your message contained prohibited content.`
    },
    security: {
      enabled: false,
      antiNuke: true,
      nukeThreshold: 3,
      nukeWindow: 10000, // ms
      antiWebhook: true,
      actions: ['kick'],
      exemptChannels: [],
      exemptRoles: [],
      exemptUsers: []
    }
  },
  escalation: {
    enabled: true,
    steps: [
      { warns: 3, action: 'mute', duration: '1h' },
      { warns: 5, action: 'kick' },
      { warns: 7, action: 'ban' }
    ]
  }
};

const cache = new Map();

/**
 * Deep merge source into target.
 */
function deepMerge(target, source) {
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

/**
 * Preload all configurations from disk.
 * Called once during bot startup.
 */
function initConfigs() {
  const files = fs.readdirSync(CONFIG_DIR).filter(f => f.endsWith('.json'));
  let loadedCount = 0;

  for (const file of files) {
    const guildId = file.replace('.json', '');
    try {
      const data = fs.readFileSync(path.join(CONFIG_DIR, file), 'utf8');
      const loaded = JSON.parse(data);
      
      // Clone default and merge loaded data
      const config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
      deepMerge(config, loaded);
      
      cache.set(guildId, config);
      loadedCount++;
    } catch (err) {
      console.error(`Failed to preload config for ${guildId}:`, err);
    }
  }
  console.log(`[AutoMod] Preloaded ${loadedCount} server configurations.`);
}

/**
 * Get the config for a specific guild (Synchronous).
 * @param {string} guildId 
 * @returns {object}
 */
function getConfig(guildId) {
  if (cache.has(guildId)) return cache.get(guildId);

  // Fallback for new guilds (Clone default to avoid mutation of the master object)
  const config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  cache.set(guildId, config);
  return config;
}

/**
 * Save the config for a specific guild.
 * Updates cache instantly, writes to disk asynchronously.
 * @param {string} guildId 
 * @param {object} config 
 */
async function saveConfig(guildId, config) {
  cache.set(guildId, config);
  const filePath = path.join(CONFIG_DIR, `${guildId}.json`);
  fs.promises.writeFile(filePath, JSON.stringify(config, null, 2)).catch(err => {
    console.error(`Error saving config for guild ${guildId}:`, err);
  });
}

/**
 * Reset config to default for a guild.
 * @param {string} guildId 
 */
async function resetConfig(guildId) {
  const config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  await saveConfig(guildId, config);
}

module.exports = {
  initConfigs,
  getConfig,
  saveConfig,
  resetConfig,
  DEFAULT_CONFIG
};
