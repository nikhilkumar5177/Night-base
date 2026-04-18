const storage = require('../utils/storageManager');
const { LIMITS } = require('../utils/constants');

module.exports = {
  name: 'messageDelete',
  once: false,
  execute: (client, message) => {
    if (!message.guild) return;
    if (message.author && message.author.bot) return;

    if (client.ignoredDeletes && client.ignoredDeletes.has(message.id)) {
      client.ignoredDeletes.delete(message.id);
      return;
    }

    const channelId = message.channel.id;

    if (!client.snipeCache.has(channelId)) {
      client.snipeCache.set(channelId, []);
    }

    const snipes = client.snipeCache.get(channelId);

    snipes.unshift({
      authorId: message.author ? message.author.id : 'Unknown',
      authorTag: message.author ? message.author.tag : 'Unknown',
      content: message.content || '',
      attachments: message.attachments.map(a => a.url),
      timestamp: Date.now()
    });

    if (snipes.length > LIMITS.SNIPE_PER_CHANNEL) {
      snipes.length = LIMITS.SNIPE_PER_CHANNEL;
    }

    const snipeStorage = storage.read('snipe.json');
    snipeStorage[channelId] = snipes;
    storage.write('snipe.json', snipeStorage);
  }
};
