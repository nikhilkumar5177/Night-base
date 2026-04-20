const fs = require('fs');
const path = require('path');

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
      responseMessage: '{EMOJI_ERROR} **{user}**, please stop spamming!',
      autoSlowmode: true,
      duplicateDetection: true
    },
    links: {
      enabled: false,
      allowedLinks: [],
      antiInvite: true,
      antiPhishing: true,
      actions: ['delete', 'warn'],
      exemptChannels: [],
      exemptRoles: [],
      exemptUsers: [],
      responseMessage: '{EMOJI_ERROR} **{user}**, links are not allowed here.'
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
      blockedWords: [],
      capsLimit: 70, // percentage
      emojiLimit: 10,
      ghostPing: true,
      actions: ['delete', 'warn'],
      exemptChannels: [],
      exemptRoles: [],
      exemptUsers: [],
      responseMessage: '{EMOJI_ERROR} **{user}**, your message contained prohibited content.'
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
 * Get the config for a specific guild.
 * @param {string} guildId 
 * @returns {object}
 */
async function getConfig(guildId) {
  if (cache.has(guildId)) return cache.get(guildId);

  const filePath = path.join(CONFIG_DIR, `${guildId}.json`);
  let config = { ...DEFAULT_CONFIG };

  if (fs.existsSync(filePath)) {
    try {
      const data = await fs.promises.readFile(filePath, 'utf8');
      const loaded = JSON.parse(data);
      
      // Deep merge modules to handle missing modules or fields
      config = {
        ...DEFAULT_CONFIG,
        ...loaded,
        modules: {
          ...DEFAULT_CONFIG.modules,
          ...(loaded.modules || {})
        }
      };
      
      // Ensure each module has its own defaults merged
      for (const key in config.modules) {
        config.modules[key] = {
          ...DEFAULT_CONFIG.modules[key],
          ...config.modules[key]
        };
      }
    } catch (err) {
      console.error(`Error reading config for guild ${guildId}:`, err);
    }
  } else {
    await saveConfig(guildId, config);
  }
  
  cache.set(guildId, config);
  return config;
}

/**
 * Save the config for a specific guild.
 * @param {string} guildId 
 * @param {object} config 
 */
async function saveConfig(guildId, config) {
  cache.set(guildId, config);
  const filePath = path.join(CONFIG_DIR, `${guildId}.json`);
  try {
    await fs.promises.writeFile(filePath, JSON.stringify(config));
  } catch (err) {
    console.error(`Error saving config for guild ${guildId}:`, err);
  }
}

/**
 * Reset config to default for a guild.
 * @param {string} guildId 
 */
async function resetConfig(guildId) {
  cache.delete(guildId);
  await saveConfig(guildId, DEFAULT_CONFIG);
}

module.exports = {
  getConfig,
  saveConfig,
  resetConfig,
  DEFAULT_CONFIG
};
