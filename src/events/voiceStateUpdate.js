const storage = require('../utils/storageManager');

module.exports = {
  name: 'voiceStateUpdate',
  once: false,
  execute: async (client, oldState, newState) => {
    const guildId = newState.guild?.id || oldState.guild?.id;
    if (!guildId) return;
{
      const voiceData = storage.read('voiceroles.json');
      const roles = voiceData[guildId] || [];

      for (const roleId of roles) {
        const role = newState.guild.roles.cache.get(roleId);
        if (!role) continue;

        if (!oldState.channelId && newState.channelId) {
          try {
            const member = newState.member || await newState.guild.members.fetch(newState.id).catch(() => null);
            if (member) await member.roles.add(role);
          } catch {}
        }

        if (oldState.channelId && !newState.channelId) {
          try {
            const member = oldState.member || await oldState.guild.members.fetch(oldState.id).catch(() => null);
            if (member) await member.roles.remove(role);
          } catch {}
        }
      }
    }

    // --- VC Joiner: Track bot leaving VC & Rejoin (Free Feature) ---
    if (oldState.id === client.user.id && !newState.channelId) {
      const vcData = storage.read('vcjoiner.json');
      if (vcData[oldState.guild.id]) {
        vcData[oldState.guild.id].currentChannelId = null;
        storage.write('vcjoiner.json', vcData);
        
        const { joinRandomVC } = require('../utils/vcJoiner');
        if (vcData[oldState.guild.id].enabled) {
          // Attempt to rejoin a random non-blacklisted VC immediately
          joinRandomVC(oldState.guild).catch(() => {});
        }
      }
    }
  }
};
