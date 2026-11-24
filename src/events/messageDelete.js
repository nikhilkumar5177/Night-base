const storage = require('../utils/storageManager');
const { LIMITS } = require('../utils/constants');
const { getConfig } = require('../automod/database');
const { handleGhostPing } = require('../automod/modules/ghostping');

module.exports = {
  name: 'messageDelete',
  once: false,
  execute: async (client, message) => {
    if (!message.guild) return;

    if (client.ignoredDeletes && client.ignoredDeletes.has(message.id)) {
      client.ignoredDeletes.delete(message.id);
      return;
    }

    const config = await getConfig(message.guild.id);

    // Skip ghost ping detection if deleted in a configured vouch channel to prevent false positives during vouch creation/moderation
    const vouchData = storage.read('vouch.json');
    const guildVouchChannels = vouchData[message.guild.id]?.channels || [];
    const isVouchChannel = guildVouchChannels.includes(message.channel.id);

    if (!isVouchChannel) {
      await handleGhostPing(client, message, config.modules.content, config);
    }

    if (message.author && message.author.bot) return;

    const channelId = message.channel.id;

    if (!client.snipeCache.has(channelId)) {
      client.snipeCache.set(channelId, []);
    }

    const snipes = client.snipeCache.get(channelId);

    snipes.unshift({
      authorId: message.author ? message.author.id : 'Unknown',
      authorTag: message.author ? message.author.tag : 'Unknown',
      content: message.content || '',
      attachments: message.attachments ? message.attachments.map(a => a.url) : [],
      timestamp: Date.now()
    });

    if (snipes.length > LIMITS.SNIPE_PER_CHANNEL) {
      snipes.length = LIMITS.SNIPE_PER_CHANNEL;
    }
  }
};
