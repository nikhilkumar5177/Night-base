const { getConfig } = require('../automod/database');
const { syncNativeRules } = require('../automod/utils/nativeSync');
const logger = require('../utils/logger');

module.exports = {
  name: 'guildCreate',
  once: false,
  execute: async (client, guild) => {
    try {
      const config = await getConfig(guild.id);
      await syncNativeRules(guild, config, true);
      logger.info(`AutoMod Rule Sync: Initialized for joined guild ${guild.name} (${guild.id})`);
    } catch (error) {
      logger.error(`Failed to sync AutoMod rules on join for ${guild.id}: ${error.message}`);
    }
  }
};
