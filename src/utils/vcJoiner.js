const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const storage = require('./storageManager');
const logger = require('./logger');

const ROTATION_INTERVAL = 30 * 60 * 1000; // 30 minutes

/**
 * VC Joiner Utility
 */
module.exports = {
  /**
   * Joins a random inactive voice channel in the guild.
   * @param {Guild} guild 
   */
  joinRandomVC: async (guild) => {
    const vcData = storage.read('vcjoiner.json');
    const guildConfig = vcData[guild.id];
    if (!guildConfig || !guildConfig.enabled) return;

    // Filter channels
    const channels = guild.channels.cache.filter(c => 
      c.isVoiceBased() && 
      !guildConfig.blacklistedCategories.includes(c.parentId) &&
      c.members.filter(m => !m.user.bot).size === 0 && // Inactive
      c.viewable &&
      c.permissionsFor(guild.members.me).has(['Connect', 'Speak']) // Public/Accessible
    );

    if (channels.size === 0) return;

    const randomChannel = channels.random();
    await module.exports.joinSpecificVC(randomChannel);
  },

  /**
   * Joins a specific voice channel.
   * @param {VoiceChannel|StageChannel} channel 
   */
  joinSpecificVC: async (channel) => {
    const guild = channel.guild;
    const client = guild.client;

    try {
      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfMute: false,
        selfDeaf: false
      });

      // Update storage
      const vcData = storage.read('vcjoiner.json');
      if (!vcData[guild.id]) vcData[guild.id] = { enabled: true, blacklistedCategories: [] };
      vcData[guild.id].lastJoined = Date.now();
      vcData[guild.id].currentChannelId = channel.id;
      storage.write('vcjoiner.json', vcData);

      // Set Status
      client.user.setPresence({
        activities: [{ name: `VC: ${channel.name.slice(0, 100)}`, type: 0 }], // Playing
        status: 'online'
      });

      logger.info(`VCJoiner: Joined ${channel.name} in ${guild.name}`);
      return true;
    } catch (err) {
      logger.error(`VCJoiner Error in ${guild.name}: ${err.message}`);
      return false;
    }
  },

  /**
   * Leaves the voice channel in a guild.
   * @param {Guild} guild 
   */
  leaveVC: (guild) => {
    const connection = getVoiceConnection(guild.id);
    if (connection) {
      connection.destroy();
      
      const vcData = storage.read('vcjoiner.json');
      if (vcData[guild.id]) {
        vcData[guild.id].currentChannelId = null;
        storage.write('vcjoiner.json', vcData);
      }

      // Reset Status
      guild.client.user.setPresence({
        activities: [{ name: `${guild.client.config.prefix}help`, type: 3 }],
        status: 'online'
      });
      
      return true;
    }
    return false;
  },

  /**
   * Checks all guilds and rotates VCs if needed.
   * @param {Client} client 
   */
  runRotation: async (client) => {
    const vcData = storage.read('vcjoiner.json');
    const now = Date.now();

    for (const [guildId, config] of Object.entries(vcData)) {
      if (!config.enabled) continue;

      const guild = client.guilds.cache.get(guildId);
      if (!guild) continue;

      const lastJoined = config.lastJoined || 0;
      const connection = getVoiceConnection(guildId);

      // If disconnected or 30 mins passed
      if (!connection || (now - lastJoined >= ROTATION_INTERVAL)) {
        await module.exports.joinRandomVC(guild);
      }
    }
  }
};
