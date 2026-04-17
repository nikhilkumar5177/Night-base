const storage = require('../utils/storageManager');

module.exports = {
  name: 'voiceStateUpdate',
  once: false,
  execute: async (client, oldState, newState) => {
    const aliasData = storage.read('aliases.json');

    for (const [, config] of Object.entries(aliasData)) {
      if (!config.voiceRole) continue;

      const role = newState.guild.roles.cache.get(config.voiceRole);
      if (!role) continue;

      if (!oldState.channelId && newState.channelId) {
        try {
          await newState.member.roles.add(role);
        } catch {}
      }

      if (oldState.channelId && !newState.channelId) {
        try {
          await oldState.member.roles.remove(role);
        } catch {}
      }
    }
  }
};
