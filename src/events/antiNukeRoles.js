const { getConfig } = require('../automod/database');
const { trackNukeAction } = require('../automod/modules/security');
const { COLORS, resolveEmbedEmojis } = require('../utils/constants');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'roleDelete',
  once: false,
  execute: async (client, role) => {
    const config = getConfig(role.guild.id);
    const security = config.modules.security;
    if (!config.enabled || !security.enabled || !security.antiNuke) return;

    if (trackNukeAction(role.guild.id, 'roleDelete', security)) {
      const guild = role.guild;
      const owner = await guild.fetchOwner().catch(() => null);

      const alertEmbed = new EmbedBuilder()
        .setColor(COLORS.ERROR)
        .setTitle('{EMOJI_ERROR} Anti-Nuke: Rapid Role Deletion')
        .setDescription(`**Multiple roles** deleted in rapid succession. Protection engaged.`)
        .addFields(
          { name: 'Last Deleted', value: `\`${role.name}\``, inline: true },
          { name: 'Threshold', value: `\`${security.nukeThreshold}\` in \`${security.nukeWindow / 1000}s\``, inline: true }
        )
        .setTimestamp();

      const logChannel = guild.channels.cache.get(config.logChannel) || 
                         guild.channels.cache.find(c => c.name.includes('mod') || c.name.includes('log'));

      if (logChannel) {
        await logChannel.send({ content: owner ? `<@${owner.id}>` : '', embeds: [resolveEmbedEmojis(alertEmbed.toJSON())] }).catch(() => {});
      }
    }
  }
};
