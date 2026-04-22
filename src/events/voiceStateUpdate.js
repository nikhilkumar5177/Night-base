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

    // VC Joiner: Track bot leaving VC
    if (oldState.id === client.user.id && !newState.channelId) {
      const vcData = storage.read('vcjoiner.json');
      if (vcData[oldState.guild.id]) {
        vcData[oldState.guild.id].currentChannelId = null;
        storage.write('vcjoiner.json', vcData);
        
        // Reset Status
        client.user.setPresence({
          activities: [{ name: `${client.config.prefix}help`, type: 3 }], // Watching
          status: 'online'
        });
      }
    }
  }
};
