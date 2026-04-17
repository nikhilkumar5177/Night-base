const storage = require('../utils/storageManager');
const logger = require('../utils/logger');
const { EmbedBuilder } = require('discord.js');

const actionTracker = new Map();

module.exports = {
  name: 'channelDelete',
  once: false,
  execute: async (client, channel) => {
    const securityConfig = storage.read('security.json');
    if (!securityConfig.enabled) return;

    const guildId = channel.guild.id;
    const now = Date.now();
    const key = `${guildId}-channel`;

    if (!actionTracker.has(key)) actionTracker.set(key, []);
    const actions = actionTracker.get(key);
    actions.push(now);
    const recent = actions.filter(t => now - t < (securityConfig.nukeWindow || 10000));
    actionTracker.set(key, recent);

    if (recent.length >= (securityConfig.nukeThreshold || 3)) {
      const guild = channel.guild;
      const owner = await guild.fetchOwner().catch(() => null);
      const staffData = storage.read('staff.json');
      const staffMentions = staffData.roles ? staffData.roles.map(r => `<@&${r}>`).join(' ') : '';

      const alertEmbed = new EmbedBuilder()
        .setColor('#ff1744')
        .setTitle('{EMOJI_ERROR} Anti-Nuke Alert: Rapid Channel Deletion')
        .setDescription(`**${recent.length}** channels deleted in rapid succession.`)
        .addFields(
          { name: 'Last Deleted', value: channel.name || 'Unknown', inline: true },
          { name: 'Threshold', value: `${securityConfig.nukeThreshold || 3} in ${(securityConfig.nukeWindow || 10000) / 1000}s`, inline: true }
        )
        .setTimestamp();

      const alertContent = owner ? `${owner} ${staffMentions}` : staffMentions;
      const logChannel = guild.channels.cache.find(c =>
        c.name.includes('security') || c.name.includes('log') || c.name.includes('mod')
      );

      if (logChannel) {
        await logChannel.send({ content: alertContent, embeds: [alertEmbed] }).catch(() => {});
      }

      const logs = securityConfig.logs || [];
      logs.push({ type: 'nuke_channels', guildId, count: recent.length, timestamp: now });
      securityConfig.logs = logs.slice(-100);
      storage.write('security.json', securityConfig);

      actionTracker.delete(key);
    }
  }
};
