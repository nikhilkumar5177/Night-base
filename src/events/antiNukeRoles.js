const { getConfig } = require('../automod/database');
const { trackNukeAction } = require('../automod/modules/security');
const { COLORS, EMOJI_ERROR } = require('../utils/constants');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'roleDelete',
  once: false,
  execute: async (client, role) => {
    const config = await getConfig(role.guild.id);
    const security = config.modules.security;
    if (!config.enabled || !security.enabled || !security.antiNuke) return;

    if (trackNukeAction(role.guild.id, 'roleDelete', security)) {
      const guild = role.guild;
      const owner = await guild.fetchOwner().catch(() => null);

      // Identify Executor from Audit Logs
      let executor = null;
      try {
        const auditLogs = await guild.fetchAuditLogs({ limit: 1, type: 32 }); // 32 = ROLE_DELETE
        const entry = auditLogs.entries.first();
        if (entry && (Date.now() - entry.createdTimestamp < 5000)) {
          executor = entry.executor;
        }
      } catch {}

      const alertEmbed = new EmbedBuilder()
        .setColor(COLORS.ERROR)
        .setTitle(`${EMOJI_ERROR} Anti-Nuke: Rapid Role Deletion`)
        .setDescription(`**Multiple roles** deleted in rapid succession. Protection engaged.`)
        .addFields(
          { name: 'Last Deleted', value: `\`${role.name}\``, inline: true },
          { name: 'Threshold', value: `\`${security.nukeThreshold}\` in \`${security.nukeWindow / 1000}s\``, inline: true },
          { name: 'Suspected Moderator', value: executor ? `${executor.tag} (\`${executor.id}\`)` : 'Unknown/Bot', inline: false }
        )
        .setTimestamp();

      // Action: Quarantine the executor if possible
      if (executor && executor.id !== owner?.id && executor.id !== client.user.id) {
        const member = await guild.members.fetch(executor.id).catch(() => null);
        if (member && member.manageable) {
          await member.roles.set([], 'Security: Anti-Nuke Quarantine').catch(() => {});
          alertEmbed.addFields({ name: 'Action Taken', value: 'User has been stripped of all roles (Quarantined).' });
        }
      }

      const logChannel = guild.channels.cache.get(config.logChannel) || 
                         guild.channels.cache.find(c => c.name.includes('mod') || c.name.includes('log'));

      if (logChannel) {
        await logChannel.send({ content: owner ? `<@${owner.id}>` : '', embeds: [alertEmbed] }).catch(() => {});
      }
    }
  }
};
