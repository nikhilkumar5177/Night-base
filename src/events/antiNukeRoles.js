const storage = require('../utils/storageManager');
const { EmbedBuilder } = require('discord.js');

const actionTracker = new Map();

module.exports = {
  name: 'roleDelete',
  once: false,
  execute: async (client, role) => {
    const securityConfig = storage.read('security.json');
    if (!securityConfig.enabled) return;

    const guildId = role.guild.id;
    const now = Date.now();
    const key = `${guildId}-role`;

    if (!actionTracker.has(key)) actionTracker.set(key, []);
    const actions = actionTracker.get(key);
    actions.push(now);
    const recent = actions.filter(t => now - t < (securityConfig.nukeWindow || 10000));
    actionTracker.set(key, recent);

    if (recent.length >= (securityConfig.nukeThreshold || 3)) {
      const guild = role.guild;
      const owner = await guild.fetchOwner().catch(() => null);
      const staffData = storage.read('staff.json');
      const staffMentions = staffData.roles ? staffData.roles.map(r => `<@&${r}>`).join(' ') : '';

      const alertEmbed = new EmbedBuilder()
        .setColor('#ff1744')
        .setTitle('{EMOJI_ERROR} Anti-Nuke Alert: Rapid Role Deletion')
        .setDescription(`**${recent.length}** roles deleted in rapid succession.`)
        .addFields(
          { name: 'Last Deleted', value: role.name || 'Unknown', inline: true },
          { name: 'Threshold', value: `${securityConfig.nukeThreshold || 3} in ${(securityConfig.nukeWindow || 10000) / 1000}s`, inline: true }
        )
        .setTimestamp();

      const logChannel = guild.channels.cache.find(c =>
        c.name.includes('security') || c.name.includes('log') || c.name.includes('mod')
      );

      if (logChannel) {
        await logChannel.send({ content: owner ? `${owner} ${staffMentions}` : staffMentions, embeds: [alertEmbed] }).catch(() => {});
      }

      const logs = securityConfig.logs || [];
      logs.push({ type: 'nuke_roles', guildId, count: recent.length, timestamp: now });
      securityConfig.logs = logs.slice(-100);
      storage.write('security.json', securityConfig);

      actionTracker.delete(key);
    }
  }
};
