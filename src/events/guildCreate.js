const logger = require('../utils/logger');

module.exports = {
  name: 'guildCreate',
  once: false,
  execute: async (client, guild) => {
    try {
      logger.info(`Bot joined guild: ${guild.name} (${guild.id})`);
      // Removed native AutoMod rule creation on join per user request.
      // AutoMod rules are now only created when explicitly set up via the automodrule command.
    } catch (error) {
      logger.error(`Error processing join for ${guild.id}: ${error.message}`);
    }
  }
};
