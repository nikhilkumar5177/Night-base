const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const storage = require('./storageManager');
const logger = require('./logger');

const ROTATION_INTERVAL = 10 * 60 * 1000; // 10 minutes


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
      !guildConfig.blacklistedCategories.includes(c.id) &&
      c.members.filter(m => !m.user.bot).size === 0 && // Inactive
      c.type === 2 && // Voice Channel
      c.permissionsFor(guild.members.me).has(['Connect', 'Speak']) // Public/Accessible
    );


    // Exclude current channel if there are others
    let filtered = channels;
    if (guildConfig.currentChannelId && channels.size > 1) {
      filtered = channels.filter(c => c.id !== guildConfig.currentChannelId);
    }

    if (filtered.size === 0) return;
    const randomChannel = filtered.random();
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
        selfDeaf: true
      });

      // Update storage
      const vcData = storage.read('vcjoiner.json');
      if (!vcData[guild.id]) vcData[guild.id] = { enabled: true, blacklistedCategories: [] };
      vcData[guild.id].lastJoined = Date.now();
      vcData[guild.id].currentChannelId = channel.id;
      storage.write('vcjoiner.json', vcData);
      await storage.flushFile('vcjoiner.json').catch(() => { });

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
      const timeRemaining = ROTATION_INTERVAL - (now - lastJoined);

      if (!connection || timeRemaining <= 0) {
        await module.exports.joinRandomVC(guild);
      }
    }
  }
};
