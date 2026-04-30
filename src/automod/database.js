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

// Pre-serialized default for fast cloning (avoids JSON.parse(JSON.stringify) per call)
const DEFAULT_CONFIG_STR = JSON.stringify(DEFAULT_CONFIG);

const cache = new Map();

/**
 * Deep merge source into target (non-recursive for flat module structure).
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
 * Clone default config using pre-serialized string (fastest safe clone).
 */
function cloneDefault() {
  return JSON.parse(DEFAULT_CONFIG_STR);
}

/**
 * Hydrate computed caches on a config object.
 * Pre-computes Sets and lowercase arrays to avoid per-message work.
 */
function hydrateConfig(config) {
  // Bypass sets for O(1) lookup
  config._bypassRoleSet = new Set(config.bypassRoles);
  config._bypassUserSet = new Set(config.bypassUsers);

  // Pre-compute allowed links (lowercase, stripped) for links module
  const links = config.modules.links;
  if (links) {
    links._allowedLinksLower = links.allowedLinks.map(l => l.trim().toLowerCase().replace(/^https?:\/\//, ''));
    links._allowedGifSet = new Set((links.allowedGifs || []).map(l => l.trim().toLowerCase().replace(/^https?:\/\//, '')));
  }

  return config;
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
      
      const config = cloneDefault();
      deepMerge(config, loaded);
      hydrateConfig(config);
      
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

  // Fallback for new guilds
  const config = cloneDefault();
  hydrateConfig(config);
  cache.set(guildId, config);
  return config;
}

/**
 * Save the config for a specific guild.
 * Updates cache instantly, writes to disk asynchronously.
 * Re-hydrates computed caches on save.
 * @param {string} guildId 
 * @param {object} config 
 */
async function saveConfig(guildId, config) {
  hydrateConfig(config);
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
  const config = cloneDefault();
  await saveConfig(guildId, config);
}

module.exports = {
  initConfigs,
  getConfig,
  saveConfig,
  resetConfig,
  DEFAULT_CONFIG
};
