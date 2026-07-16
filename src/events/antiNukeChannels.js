const { getConfig } = require('../automod/database');
const { trackNukeAction } = require('../automod/modules/security');
const { EMOJI_ERROR } = require('../utils/constants');
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');

module.exports = {
  name: 'channelDelete',
  once: false,
  execute: async (client, channel) => {
    const config = await getConfig(channel.guild.id);
    const storage = require('../utils/storageManager');
    
    const security = config.modules.security;
    if (!config.enabled || !security.enabled || !security.antiNuke) return;

    if (trackNukeAction(channel.guild.id, 'channelDelete', security)) {
      const guild = channel.guild;
      const owner = await guild.fetchOwner().catch(() => null);

      let executor = null;
      try {
        const auditLogs = await guild.fetchAuditLogs({ limit: 1, type: 12 }); // 12 = CHANNEL_DELETE
        const entry = auditLogs.entries.first();
        if (entry && (Date.now() - entry.createdTimestamp < 5000)) {
          executor = entry.executor;
        }
      } catch {}

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Anti-Nuke Alert`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${EMOJI_ERROR} **Rapid Channel Deletion Detected**\n` +
          `Multiple channels deleted in rapid succession. Lockdown initiated.\n\n` +
          `**Last Deleted:** \`#${channel.name}\` \u2502 **ID:** \`${channel.id}\`\n` +
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
