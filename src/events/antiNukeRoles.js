const { getConfig } = require('../automod/database');
const { trackNukeAction } = require('../automod/modules/security');
const { EMOJI_ERROR } = require('../utils/constants');
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');

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

      let executor = null;
      try {
        const auditLogs = await guild.fetchAuditLogs({ limit: 1, type: 32 }); // 32 = ROLE_DELETE
        const entry = auditLogs.entries.first();
        if (entry && (Date.now() - entry.createdTimestamp < 5000)) {
          executor = entry.executor;
        }
      } catch {}

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Anti-Nuke Alert`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${EMOJI_ERROR} **Rapid Role Deletion Detected**\n` +
          `Multiple roles deleted in rapid succession. Protection engaged.\n\n` +
          `**Last Deleted:** \`${role.name}\`\n` +
          `**Threshold:** \`${security.nukeThreshold}\` in \`${security.nukeWindow / 1000}s\`\n` +
          `**Suspect:** ${executor ? `${executor.tag} (\`${executor.id}\`)` : 'Unknown'}`
        ));

      if (executor && executor.id !== owner?.id && executor.id !== client.user.id) {
        const member = await guild.members.fetch(executor.id).catch(() => null);
        if (member && member.manageable) {
          await member.roles.set([], 'Security: Anti-Nuke Quarantine').catch(() => {});
          container.addSeparatorComponents(new SeparatorBuilder());
          container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Action Taken:** User stripped of all roles (Quarantined).`));
        }
      }

      const logChannel = guild.channels.cache.get(config.logChannel) || 
                         guild.channels.cache.find(c => c.name.includes('mod') || c.name.includes('log'));

      if (logChannel) {
        await logChannel.send({ content: owner ? `<@${owner.id}>` : '', components: [container], flags: 32768 }).catch(() => {});
      }
    }
  }
};
