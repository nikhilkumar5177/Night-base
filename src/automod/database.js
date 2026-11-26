const storage = require('../utils/storageManager');
const { EMOJI_ERROR } = require('../utils/constants');

const DEFAULT_CONFIG = {
  enabled: false,
  logChannel: null,
  ghostPingChannel: null,
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
      minAccountAge: 1, // in days
      antiWebhook: true,
      actions: ['kick'],
      exemptChannels: [],
      exemptRoles: [],
      exemptUsers: [],
      webhookWhitelist: []
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

/**
 * Get the config for a specific guild from SQLite database.
 * @param {string} guildId 
 * @returns {Promise<object>}
 */
async function getConfig(guildId) {
  const loaded = storage.getAutomodConfig(guildId);
  let config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

  if (loaded) {
    config = {
      ...DEFAULT_CONFIG,
      ...loaded,
      modules: {
        ...DEFAULT_CONFIG.modules,
        ...(loaded.modules || {})
      }
    };
    
    // Ensure all module keys have their defaults
    for (const key in config.modules) {
      config.modules[key] = {
        ...DEFAULT_CONFIG.modules[key],
        ...config.modules[key]
      };
    }
  } else {
    storage.saveAutomodConfig(guildId, config);
  }

  return config;
}

/**
 * Save the config for a specific guild into SQLite.
 * @param {string} guildId 
 * @param {object} config 
 */
async function saveConfig(guildId, config) {
  storage.saveAutomodConfig(guildId, config);
}

/**
 * Reset config to default for a guild.
 * @param {string} guildId 
 */
async function resetConfig(guildId) {
  storage.resetAutomodConfig(guildId);
  storage.saveAutomodConfig(guildId, DEFAULT_CONFIG);
}

module.exports = {
  getConfig,
  saveConfig,
  resetConfig,
  DEFAULT_CONFIG
};
