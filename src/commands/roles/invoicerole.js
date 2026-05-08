const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const storage = require('../../utils/storageManager');
const { EMOJI_SUCCESS, EMOJI_ERROR, EMOJI_INFO, EMOJI_DOT } = require('../../utils/constants');
const { sendUsage, cv2Error } = require('../../utils/messageHelper');

/**
 * Get guild-scoped aliases with auto-migration from root-level legacy entries.
 */
function getGuildAliases(aliasData, guild) {
  const guildId = guild.id;
  if (!aliasData[guildId]) aliasData[guildId] = {};

  for (const [key, cfg] of Object.entries(aliasData)) {
    if (key === guildId || typeof cfg !== 'object' || cfg === null || Array.isArray(cfg)) continue;
    if (!cfg.roleId) continue;
    if (guild.roles.cache.has(cfg.roleId)) {
      aliasData[guildId][key] = cfg;
      delete aliasData[key];
    }
  }

  return aliasData[guildId];
}

module.exports = {
  name: 'invoicerole',
  aliases: ['ivr', 'voicerole'],
  description: 'Configure in-voice auto role',
  usage: 'invoicerole <set|remove|list> <alias> <roleId>',
  cooldown: 3,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  premiumOnly: true,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('ManageRoles')) {
        return message.reply({ components: [cv2Error('You need **ManageRoles** permission.')], flags: 32768 });
      }
      const action = args[0]?.toLowerCase();
      const aliasData = storage.read('aliases.json');
      const guildAliases = getGuildAliases(aliasData, message.guild);

      if (action === 'list') {
        const entries = Object.entries(guildAliases).filter(([, c]) => c.voiceRole);
        if (entries.length === 0) {
          const container = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Voice Roles`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_INFO} No in-voice roles configured for this server.`));
          return message.reply({ components: [container], flags: 32768 });
        }
        const list = entries.map(([name, cfg]) => {
          const role = message.guild.roles.cache.get(cfg.voiceRole);
          return `**${name}** \u2192 ${role ? role : `\`${cfg.voiceRole}\``}`;
        }).join('\n');
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Voice Roles`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(list));
        return message.reply({ components: [container], flags: 32768 });
      }

      if (action === 'set') {
        const alias = args[1]?.toLowerCase();
        const roleId = args[2];
        if (!alias || !roleId) return sendUsage(message, module.exports);

        const { resolveRole } = require('../../utils/resolver');
        const role = resolveRole(message.guild, roleId);
        if (!role) return message.reply({ components: [cv2Error('Role not found.')], flags: 32768 });

        if (!guildAliases[alias]) guildAliases[alias] = { roleId: null, aliases: [] };
        guildAliases[alias].voiceRole = role.id;
        storage.write('aliases.json', aliasData);
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Voice Role Set`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} **${role.name}** will be given when joining voice.`));
        return message.reply({ components: [container], flags: 32768 });
      }

      if (action === 'remove') {
        const alias = args[1]?.toLowerCase();
        if (!alias || !guildAliases[alias] || !guildAliases[alias].voiceRole) {
          return message.reply({ components: [cv2Error('Voice role not found for this alias.')], flags: 32768 });
        }
        delete guildAliases[alias].voiceRole;
        storage.write('aliases.json', aliasData);
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Voice Role Removed`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} Voice role removed.`));
        return message.reply({ components: [container], flags: 32768 });
      }

      return sendUsage(message, module.exports);
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
