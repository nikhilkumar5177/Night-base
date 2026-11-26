const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, RoleSelectMenuBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const storage = require('../../utils/storageManager');
const { EMOJI_SUCCESS, EMOJI_ERROR, EMOJI_INFO, EMOJI_DOT, EMOJI_ARROW } = require('../../utils/constants');
const { cv2Error, safeReply, safeUpdate } = require('../../utils/messageHelper');

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

function buildDashboard(guild, guildAliases) {
  const entries = Object.entries(guildAliases);
  
  let listStr = '';
  if (entries.length === 0) {
    listStr = `${EMOJI_INFO} *No alias roles configured for this server.*`;
  } else {
    listStr = entries.map(([name, cfg]) => {
      const role = guild.roles.cache.get(cfg.roleId);
      const aliases = cfg.aliases && cfg.aliases.length > 0 ? cfg.aliases.join(', ') : 'none';
      return `**${name}** \u2192 ${role ? role : `\`${cfg.roleId}\``}\n${EMOJI_DOT} Aliases: \`${aliases}\`${cfg.requiredRole ? `\n${EMOJI_DOT} Required: <@&${cfg.requiredRole}>` : ''}`;
    }).join('\n\n');
  }

  const container = new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Alias Roles`))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(listStr));

  const rows = [];

  // Add: Role Select Menu showing all server roles
  const rowCreate = new ActionRowBuilder().addComponents(
    new RoleSelectMenuBuilder().setCustomId('al_create_role').setPlaceholder('Select Role to Create Alias')
  );
  rows.push(rowCreate);

  // Delete / Remove: Show ONLY currently created alias roles
  if (entries.length > 0) {
    const deleteMenu = new StringSelectMenuBuilder()
      .setCustomId('al_delete_select')
      .setPlaceholder('Select Configured Alias to Delete');

    for (const [name, cfg] of entries.slice(0, 25)) {
      const role = guild.roles.cache.get(cfg.roleId);
      const roleName = role ? role.name : cfg.roleId;
      deleteMenu.addOptions({
        label: name.slice(0, 100),
        value: name,
        description: `Role: @${roleName}`.slice(0, 100)
      });
    }

    if (deleteMenu.options.length > 0) {
      rows.push(new ActionRowBuilder().addComponents(deleteMenu));
    }
  }

  container.addActionRowComponents(...rows);
  return container;
}

module.exports = {
  name: 'aliasrole',
  aliases: ['ar', 'setalias'],
  description: 'Configure alias-based role assignment via interactive dashboard',
  usage: 'aliasrole',
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

      const aliasData = storage.read('aliases.json');
      const guildAliases = getGuildAliases(aliasData, guild);

      const isInteraction = !!target.customId || !!target.isCommand;

      if (isInteraction && target.isMessageComponent && target.isMessageComponent()) {
        const customId = target.customId;
        
        if (target.isRoleSelectMenu && target.isRoleSelectMenu() && customId === 'al_create_role') {
          const roleId = target.values[0];
          const modal = new ModalBuilder().setCustomId(`al_modal_create_${roleId}`).setTitle('Create Alias Role');
          const triggerInput = new TextInputBuilder().setCustomId('trigger').setLabel('Primary Trigger Word').setStyle(TextInputStyle.Short).setRequired(true);
          const requiredRoleIdInput = new TextInputBuilder().setCustomId('requiredRoleId').setLabel('Required Role ID (Optional)').setStyle(TextInputStyle.Short).setRequired(false);
          const extraTriggersInput = new TextInputBuilder().setCustomId('extraTriggers').setLabel('Extra Triggers (comma separated) (Optional)').setStyle(TextInputStyle.Short).setRequired(false);
          
          modal.addComponents(
            new ActionRowBuilder().addComponents(triggerInput),
            new ActionRowBuilder().addComponents(requiredRoleIdInput),
            new ActionRowBuilder().addComponents(extraTriggersInput)
          );
          return target.showModal(modal);
        }

        if (customId === 'al_delete') {
          const modal = new ModalBuilder().setCustomId('al_modal_delete').setTitle('Delete Alias');
          const triggerInput = new TextInputBuilder().setCustomId('trigger').setLabel('Primary Trigger Word to delete').setStyle(TextInputStyle.Short).setRequired(true);
          modal.addComponents(new ActionRowBuilder().addComponents(triggerInput));
          return target.showModal(modal);
        }
      }

      if (isInteraction && target.isStringSelectMenu && target.isStringSelectMenu()) {
        const customId = target.customId;
        if (customId === 'al_delete_select') {
          const trigger = target.values[0];
          if (guildAliases[trigger]) {
            delete guildAliases[trigger];
            storage.write('aliases.json', aliasData);
          }
          return safeUpdate(target, { components: [buildDashboard(guild, guildAliases)] });
        }
      }

      if (isInteraction && target.isModalSubmit && target.isModalSubmit()) {
        const customId = target.customId;

        if (customId.startsWith('al_modal_create_')) {
          const roleId = customId.split('_')[3];
          const trigger = target.fields.getTextInputValue('trigger').trim().toLowerCase();
          const requiredRoleId = target.fields.getTextInputValue('requiredRoleId').trim() || null;
          const extraTriggers = target.fields.getTextInputValue('extraTriggers').trim().toLowerCase();

          const role = guild.roles.cache.get(roleId);
          if (!role) return safeReply(target, { components: [cv2Error('Role ID to toggle not found on this server.')], ephemeral: true });

          if (requiredRoleId && !guild.roles.cache.has(requiredRoleId)) {
            return safeReply(target, { components: [cv2Error('Required Role ID not found on this server.')], ephemeral: true });
          }

          let aliasesArray = [];
          if (extraTriggers) {
            aliasesArray = extraTriggers.split(',').map(s => s.trim()).filter(s => s.length > 0);
          }

          guildAliases[trigger] = { roleId: role.id, requiredRole: requiredRoleId, aliases: aliasesArray, timestamp: Date.now() };
          storage.write('aliases.json', aliasData);
          return safeUpdate(target, { components: [buildDashboard(guild, guildAliases)] });
        }

        if (customId === 'al_modal_delete') {
          const trigger = target.fields.getTextInputValue('trigger').trim().toLowerCase();
          
          if (!guildAliases[trigger]) {
            return safeReply(target, { components: [cv2Error(`Alias \`${trigger}\` does not exist.`)], ephemeral: true });
          }

          delete guildAliases[trigger];
          storage.write('aliases.json', aliasData);
          return safeUpdate(target, { components: [buildDashboard(guild, guildAliases)] });
        }
      }

      // Initial Command Invocation
      if (!isInteraction || (isInteraction && target.isCommand && target.isCommand())) {
        const container = buildDashboard(guild, guildAliases);
        if (target.reply) {
          return safeReply(target, { components: [container] }).catch(() => {});
        }
      }

    } catch (error) {
      safeReply(target, { components: [cv2Error(error.message)], ephemeral: true }).catch(() => { });
    }
  }
};
