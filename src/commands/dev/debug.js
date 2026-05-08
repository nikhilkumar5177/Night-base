const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const storage = require('../../utils/storageManager');
const { EMOJI_OWNER } = require('../../utils/constants');
const { cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'debug',
  aliases: ['dbg'],
  description: 'Debug information',
  usage: 'debug',
  cooldown: 0,
  enabled: true,
  staffOnly: false,
  devOnly: true,
  premiumOnly: false,
  execute: async (client, message) => {
    if (message.author.id !== process.env.DEV_ID) return;
    try {
      const mem = process.memoryUsage();
      const analytics = storage.read('analytics.json');
      const totalUses = Object.values(analytics).reduce((acc, cmd) => acc + (cmd.uses || 0), 0);
      
      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_OWNER} **System Debug Info**`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `**Memory:**\n` +
          `\u25B8 Heap Used: \`${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB\`\n` +
          `\u25B8 RSS: \`${(mem.rss / 1024 / 1024).toFixed(2)} MB\`\n\n` +
          `**Registry:**\n` +
          `\u25B8 Commands: \`${client.commands.size}\` \u2502 Aliases: \`${client.aliases.size}\`\n` +
          `\u25B8 Total Uses: \`${totalUses}\` \u2502 Cooldowns: \`${client.cooldowns.size}\`\n\n` +
          `**Status:**\n` +
          `\u25B8 Ping: \`${client.ws.ping}ms\` \u2502 Uptime: \`${(process.uptime() / 3600).toFixed(2)}h\`\n` +
          `\u25B8 Snipe: \`${client.snipeCache.size} ch\` \u2502 Node: \`${process.version}\``
        ));

      message.reply({ components: [container], flags: 32768 }).catch(() => {});
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 });
    }
  }
};
