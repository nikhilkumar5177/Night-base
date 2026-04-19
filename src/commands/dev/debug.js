const { EmbedBuilder } = require('discord.js');
const storage = require('../../utils/storageManager');

module.exports = {
  name: 'debug',
  aliases: ['dbg'],
  description: 'Debug information',
  usage: 'debug',
  cooldown: 0,
  enabled: true,
  staffOnly: false,
  devOnly: true,
  execute: async (client, message) => {
    if (message.author.id !== process.env.DEV_ID) return;
    try {
      const mem = process.memoryUsage();
      const analytics = storage.read('analytics.json');
      const totalUses = Object.values(analytics).reduce((acc, cmd) => acc + (cmd.uses || 0), 0);
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('{EMOJI_INFO} Debug Info')
        .addFields(
          { name: 'Heap Used', value: `${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true },
          { name: 'Heap Total', value: `${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB`, inline: true },
          { name: 'RSS', value: `${(mem.rss / 1024 / 1024).toFixed(2)} MB`, inline: true },
          { name: 'Commands Loaded', value: `${client.commands.size}`, inline: true },
          { name: 'Aliases Loaded', value: `${client.aliases.size}`, inline: true },
          { name: 'Total Cmd Uses', value: `${totalUses}`, inline: true },
          { name: 'Cooldowns Active', value: `${client.cooldowns.size}`, inline: true },
          { name: 'Snipe Channels', value: `${client.snipeCache.size}`, inline: true },
          { name: 'Guilds Cached', value: `${client.guilds.cache.size}`, inline: true },
          { name: 'WS Ping', value: `${client.ws.ping}ms`, inline: true },
          { name: 'Uptime', value: `${(process.uptime() / 3600).toFixed(2)}h`, inline: true },
          { name: 'Node', value: process.version, inline: true }
        )
        .setTimestamp();
      message.reply({ embeds: [embed] });
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().setColor('#ff1744').setTitle('{EMOJI_ERROR} Error').setDescription(error.message).setTimestamp()] });
    }
  }
};
