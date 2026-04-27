const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const storage = require('../../utils/storageManager');
const { EMOJI_SUCCESS, EMOJI_ERROR, EMOJI_INFO, EMOJI_DOT } = require('../../utils/constants');
const { sendUsage, cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'aliasrole',
  aliases: ['ar', 'setalias'],
  description: 'Configure alias-based role assignment',
  usage: 'aliasrole <add|remove|list> <alias> [roleId] [requiredRoleId]',
  cooldown: 3,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('ManageRoles')) {
        return message.reply({ components: [cv2Error('You need **ManageRoles** permission.')], flags: 32768 });
      }
      const action = args[0]?.toLowerCase();
      const aliasData = storage.read('aliases.json');

      if (action === 'list') {
        const entries = Object.entries(aliasData);
        if (entries.length === 0) {
          const container = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Alias Roles`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_INFO} No alias roles configured.`));
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

        aliasData[alias] = { roleId: role.id, requiredRole: args[3] || null, aliases: [], timestamp: Date.now() };
        storage.write('aliases.json', aliasData);
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Alias Role Added`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} Typing \`${alias}\` will now toggle **${role.name}**.`));
        return message.reply({ components: [container], flags: 32768 });
      }

      if (action === 'remove') {
        const alias = args[1]?.toLowerCase();
        if (!alias || !aliasData[alias]) {
          return message.reply({ components: [cv2Error('That alias does not exist.')], flags: 32768 });
        }
        delete aliasData[alias];
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
        if (!primary || !newAlias || !aliasData[primary]) return sendUsage(message, module.exports);

        if (!aliasData[primary].aliases) aliasData[primary].aliases = [];
        aliasData[primary].aliases.push(newAlias);
        storage.write('aliases.json', aliasData);
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Alias Added`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} \`${newAlias}\` now also triggers the role.`));
        return message.reply({ components: [container], flags: 32768 });
      }

      return sendUsage(message, module.exports);
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
