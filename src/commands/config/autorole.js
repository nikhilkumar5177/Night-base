const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, RoleSelectMenuBuilder } = require('discord.js');
const { EMOJI_SUCCESS, EMOJI_ERROR, EMOJI_WARN, EMOJI_DOT, EMOJI_ARROW } = require('../../utils/constants');
const storage = require('../../utils/storageManager');
const { cv2Error, safeReply, safeUpdate } = require('../../utils/messageHelper');

const MAX_ROLES = 10;

function buildDashboard(guild, config) {
  const botHighest = guild.members.me.roles.highest.position;
  
  const mapRoles = (ids, label) => {
    if (!ids || ids.length === 0) return `${EMOJI_DOT} *No ${label} roles configured.*`;
    const valid = [];
    for (const id of ids) {
      const role = guild.roles.cache.get(id);
      if (!role) continue;
      const assignable = role.position < botHighest && !role.managed;
      valid.push(`${role} ${assignable ? '' : '\`\u26A0 Can\'t assign\`'}`);
    }
    return valid.length > 0 ? valid.map((r, i) => `\`${i + 1}.\` ${r}`).join('\n') : `${EMOJI_DOT} *No valid ${label} roles.*`;
  };

  const humanList = mapRoles(config.humanRoles, 'human');
  const botList = mapRoles(config.botRoles, 'bot');

  const container = new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Auto-Role Dashboard`))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${EMOJI_DOT} **Status:** ${config.enabled !== false ? '\`● Enabled\`' : '\`○ Disabled\`'}\n` +
      `${EMOJI_DOT} **Guild:** ${guild.name}`
    ))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `**Human Roles [${(config.humanRoles || []).filter(id => guild.roles.cache.has(id)).length}/${MAX_ROLES}]**\n${humanList}\n\n` +
      `**Bot Roles [${(config.botRoles || []).filter(id => guild.roles.cache.has(id)).length}/${MAX_ROLES}]**\n${botList}`
    ));

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ar_toggle').setLabel(config.enabled !== false ? 'Disable System' : 'Enable System').setStyle(config.enabled !== false ? ButtonStyle.Danger : ButtonStyle.Success)
  );

  const humanMenu = new RoleSelectMenuBuilder().setCustomId('ar_add_human').setPlaceholder('Search Role to Add for Humans');
  const botMenu = new RoleSelectMenuBuilder().setCustomId('ar_add_bot').setPlaceholder('Search Role to Add for Bots');

  const row2 = new ActionRowBuilder().addComponents(humanMenu);
  const row3 = new ActionRowBuilder().addComponents(botMenu);

  const removeRow = new ActionRowBuilder();
  if (config.humanRoles?.length || config.botRoles?.length) {
    const removeMenu = new StringSelectMenuBuilder()
      .setCustomId('ar_remove')
      .setPlaceholder('Remove a configured role');
    
    (config.humanRoles || []).forEach(id => {
      const role = guild.roles.cache.get(id);
      if (role) removeMenu.addOptions({ label: `[Human] ${role.name}`, value: `human_${id}` });
    });
    (config.botRoles || []).forEach(id => {
      const role = guild.roles.cache.get(id);
      if (role) removeMenu.addOptions({ label: `[Bot] ${role.name}`, value: `bot_${id}` });
    });
    if (removeMenu.options.length > 0) removeRow.addComponents(removeMenu);
  }

  if (removeRow.components.length > 0) {
    container.addActionRowComponents(row1, row2, row3, removeRow);
  } else {
    container.addActionRowComponents(row1, row2, row3);
  }

  return container;
}

module.exports = {
  name: 'autorole',
  aliases: ['ar-setup', 'joinrole'],
  description: 'Configure auto-role assignment via interactive dashboard',
  usage: 'autorole',
  cooldown: 3,
  enabled: true,
  devOnly: false,
  execute: async (client, target, args) => {
    try {
      const member = target.member;
      const guild = target.guild;

      if (!member.permissions.has('ManageRoles')) {
        return safeReply(target, { components: [cv2Error('You need **ManageRoles** permission.')], ephemeral: true });
      }
      if (!guild.members.me.permissions.has('ManageRoles')) {
        return safeReply(target, { components: [cv2Error('I need **ManageRoles** permission.')], ephemeral: true });
      }

      const autoroleData = storage.read('autorole.json');
      const guildId = guild.id;
      if (!autoroleData[guildId]) {
        autoroleData[guildId] = { enabled: true, humanRoles: [], botRoles: [] };
      }
      let config = autoroleData[guildId];

      const isInteraction = !!target.customId || !!target.isCommand;

      // Handle Component Interactions
      if (isInteraction && target.isMessageComponent && target.isMessageComponent()) {
        const customId = target.customId;

        if (customId === 'ar_toggle') {
          config.enabled = !config.enabled;
          storage.write('autorole.json', autoroleData);
          return safeUpdate(target, { components: [buildDashboard(guild, config)] });
        }

        if (customId === 'ar_add_human' || customId === 'ar_add_bot') {
          const type = customId.split('_')[2];
          const key = type === 'human' ? 'humanRoles' : 'botRoles';
          const roleId = target.values[0];
          if (roleId === 'none') return target.deferUpdate();
          const role = guild.roles.cache.get(roleId);

          if (!role) return safeReply(target, { components: [cv2Error('Role not found.')], ephemeral: true });
          if (role.managed) return safeReply(target, { components: [cv2Error('That role is managed by an integration and cannot be auto-assigned.')], ephemeral: true });
          if (role.position >= guild.members.me.roles.highest.position) return safeReply(target, { components: [cv2Error('That role is above or equal to my highest role.')], ephemeral: true });
          if (config[key].includes(role.id)) return safeReply(target, { components: [cv2Error('Role is already in the list.')], ephemeral: true });
          if (config[key].length >= MAX_ROLES) return safeReply(target, { components: [cv2Error(`Maximum of \`${MAX_ROLES}\` ${type} autoroles reached.`)], ephemeral: true });

          config[key].push(role.id);
          storage.write('autorole.json', autoroleData);
          return safeUpdate(target, { components: [buildDashboard(guild, config)] });
        }

        if (customId === 'ar_remove') {
          const selection = target.values[0];
          const [type, roleId] = selection.split('_');
          const key = type === 'human' ? 'humanRoles' : 'botRoles';

          config[key] = config[key].filter(id => id !== roleId);
          storage.write('autorole.json', autoroleData);
          return safeUpdate(target, { components: [buildDashboard(guild, config)] });
        }
      }

      // Initial Command Invocation
      const container = buildDashboard(guild, config);
      return safeReply(target, { components: [container] }).catch(() => {});

    } catch (error) {
      safeReply(target, { components: [cv2Error(error.message)], ephemeral: true }).catch(() => {});
    }
  }
};
