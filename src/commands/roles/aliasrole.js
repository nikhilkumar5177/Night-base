const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const storage = require('../../utils/storageManager');
const { EMOJI_SUCCESS, EMOJI_ERROR, EMOJI_INFO, EMOJI_DOT } = require('../../utils/constants');
const { sendUsage, cv2Error } = require('../../utils/messageHelper');

/**
 * Auto-migrate root-level aliases to guild-scoped structure.
 * Moves any root-level alias whose roleId exists in this guild under aliasData[guildId].
 */
function getGuildAliases(aliasData, guild) {
  const guildId = guild.id;
  if (!aliasData[guildId]) aliasData[guildId] = {};

  // Auto-migrate root-level legacy entries
  for (const [key, cfg] of Object.entries(aliasData)) {
    if (key === guildId || typeof cfg !== 'object' || cfg === null || Array.isArray(cfg)) continue;
    if (!cfg.roleId) continue; // Skip guild containers (they have nested alias objects, not roleId)
    if (guild.roles.cache.has(cfg.roleId)) {
      aliasData[guildId][key] = cfg;
      delete aliasData[key];
    }
  }

  return aliasData[guildId];
}

module.exports = {
  name: 'aliasrole',
  aliases: ['ar', 'setalias'],
  description: 'Configure alias-based role assignment',
  usage: 'aliasrole <add|remove|list> <alias> [roleId] [requiredRoleId]',
  cooldown: 3,
  enabled: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('ManageRoles')) {
        return message.reply({ components: [cv2Error('You need **ManageRoles** permission.')], flags: 32768 });
      }
      const action = args[0]?.toLowerCase();
      const aliasData = storage.read('aliases.json');
      const guildAliases = getGuildAliases(aliasData, message.guild);

      if (action === 'list') {
        const entries = Object.entries(guildAliases);
        if (entries.length === 0) {
          const container = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Alias Roles`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_INFO} No alias roles configured for this server.`));
          return message.reply({ components: [container], flags: 32768 });
        }
        const list = entries.map(([name, cfg]) => {
          const role = message.guild.roles.cache.get(cfg.roleId);
          const aliases = cfg.aliases && cfg.aliases.length > 0 ? cfg.aliases.join(', ') : 'none';
          return `**${name}** \u2192 ${role ? role : `\`${cfg.roleId}\``}\n${EMOJI_DOT} Aliases: \`${aliases}\`${cfg.requiredRole ? `\n${EMOJI_DOT} Required: <@&${cfg.requiredRole}>` : ''}`;
        }).join('\n\n');
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Alias Roles`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(list));
        return message.reply({ components: [container], flags: 32768 });
      }

      if (action === 'add') {
        const alias = args[1]?.toLowerCase();
        const roleId = args[2];
        if (!alias || !roleId) return sendUsage(message, module.exports);

        const { resolveRole } = require('../../utils/resolver');
        const role = resolveRole(message.guild, roleId);
        if (!role) return message.reply({ components: [cv2Error('Role not found.')], flags: 32768 });

        guildAliases[alias] = { roleId: role.id, requiredRole: args[3] || null, aliases: [], timestamp: Date.now() };
        storage.write('aliases.json', aliasData);
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Alias Role Added`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} Typing \`${alias}\` will now toggle **${role.name}**.`));
        return message.reply({ components: [container], flags: 32768 });
      }

      if (action === 'remove') {
        const alias = args[1]?.toLowerCase();
        if (!alias || !guildAliases[alias]) {
          return message.reply({ components: [cv2Error('That alias does not exist.')], flags: 32768 });
        }
        delete guildAliases[alias];
        storage.write('aliases.json', aliasData);
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Alias Removed`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} Alias removed.`));
        return message.reply({ components: [container], flags: 32768 });
      }

      if (action === 'addalias') {
        const primary = args[1]?.toLowerCase();
        const newAlias = args[2]?.toLowerCase();
        if (!primary || !newAlias || !guildAliases[primary]) return sendUsage(message, module.exports);

        if (!guildAliases[primary].aliases) guildAliases[primary].aliases = [];
        guildAliases[primary].aliases.push(newAlias);
        storage.write('aliases.json', aliasData);
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Alias Added`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} \`${newAlias}\` now also triggers the role.`));
        return message.reply({ components: [container], flags: 32768 });
      }

      return sendUsage(message, module.exports);
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => { });
    }
  }
};
