const { EmbedBuilder } = require('discord.js');
const storage = require('../../utils/storageManager');
const { SEP, EMOJI_SUCCESS, EMOJI_ERROR, EMOJI_INFO } = require('../../utils/constants');
const { sendUsage, sendAutoDelete } = require('../../utils/messageHelper');

module.exports = {
  name: 'aliasrole',
  aliases: ['ar', 'setalias'],
  description: 'Configure alias-based role assignment',
  usage: 'aliasrole <add|remove|list> <alias> [roleId] [requiredRoleId]',
  example: 'aliasrole add gg 123456789\naliasrole addalias gg goodgame\naliasrole list',
  cooldown: 3,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  userPermissions: ['ManageRoles'],
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('ManageRoles')) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ff1744').setTitle(`${EMOJI_ERROR} Missing Permissions`).setDescription('You need **ManageRoles** permission.').setTimestamp()] });
      }
      const action = args[0]?.toLowerCase();
      const aliasData = storage.read('aliases.json');
      if (action === 'list') {
        const entries = Object.entries(aliasData);
        if (entries.length === 0) {
          return message.reply({ embeds: [new EmbedBuilder().setColor('#0099ff').setTitle(`${EMOJI_INFO} Alias Roles`).setDescription('No alias roles configured.').setTimestamp()] });
        }
        const list = entries.map(([name, cfg]) => {
          const role = message.guild.roles.cache.get(cfg.roleId);
          const aliases = cfg.aliases ? cfg.aliases.join(', ') : 'none';
          return `**${name}** -> ${role ? role.name : cfg.roleId}\nAliases: ${aliases}${cfg.requiredRole ? `\nRequired: <@&${cfg.requiredRole}>` : ''}`;
        }).join('\n\n');
        return message.reply({ embeds: [new EmbedBuilder().setColor('#0099ff').setTitle(`${EMOJI_INFO} Alias Roles`).setDescription(list).setTimestamp()] });
      }
      if (action === 'add') {
        const alias = args[1]?.toLowerCase();
        const roleId = args[2];
        if (!alias || !roleId) {
          return sendUsage(message, module.exports);
        }
        const { resolveRole } = require('../../utils/resolver');
        const role = resolveRole(message.guild, roleId);
        if (!role) {
          return message.reply({ embeds: [new EmbedBuilder().setColor('#ff1744').setTitle(`${EMOJI_ERROR} Role Not Found`).setTimestamp()] });
        }
        aliasData[alias] = { roleId: role.id, requiredRole: args[3] || null, aliases: [], timestamp: Date.now() };
        storage.write('aliases.json', aliasData);
        return message.reply({ embeds: [new EmbedBuilder().setColor('#00e676').setTitle(`${EMOJI_SUCCESS} Alias Role Added`).setDescription(`Typing \`${alias}\` or \`${alias} @user\` will now toggle **${role.name}**.`).setTimestamp()] });
      }
      if (action === 'remove') {
        const alias = args[1]?.toLowerCase();
        if (!alias || !aliasData[alias]) {
          return message.reply({ embeds: [new EmbedBuilder().setColor('#ff1744').setTitle(`${EMOJI_ERROR} Not Found`).setDescription('That alias does not exist.').setTimestamp()] });
        }
        delete aliasData[alias];
        storage.write('aliases.json', aliasData);
        return message.reply({ embeds: [new EmbedBuilder().setColor('#00e676').setTitle(`${EMOJI_SUCCESS} Alias Removed`).setTimestamp()] });
      }
      if (action === 'addalias') {
        const primary = args[1]?.toLowerCase();
        const newAlias = args[2]?.toLowerCase();
        if (!primary || !newAlias || !aliasData[primary]) {
          return sendUsage(message, module.exports);
        }
        if (!aliasData[primary].aliases) aliasData[primary].aliases = [];
        aliasData[primary].aliases.push(newAlias);
        storage.write('aliases.json', aliasData);
        return message.reply({ embeds: [new EmbedBuilder().setColor('#00e676').setTitle(`${EMOJI_SUCCESS} Alias Added`).setDescription(`\`${newAlias}\` now also triggers the role.`).setTimestamp()] });
      }
      message.reply({ embeds: [new EmbedBuilder().setColor('#ff1744').setTitle(`${EMOJI_ERROR} Invalid Action`).setDescription('Use `add`, `remove`, `addalias`, or `list`.').setTimestamp()] });
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().setColor('#ff1744').setTitle(`${EMOJI_ERROR} Error`).setDescription(error.message).setTimestamp()] });
    }
  }
};
