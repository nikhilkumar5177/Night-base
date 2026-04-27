const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { EMOJI_SUCCESS, EMOJI_ERROR, EMOJI_WARN, EMOJI_DOT } = require('../../utils/constants');
const storage = require('../../utils/storageManager');
const { sendUsage, cv2Error } = require('../../utils/messageHelper');

const MAX_ROLES = 10;

module.exports = {
  name: 'autorole',
  aliases: ['ar-setup', 'joinrole'],
  description: 'Configure auto-role assignment for humans and bots on join',
  usage: 'autorole <add|remove|list|toggle> <human|bot> [role]',
  cooldown: 3,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('ManageRoles')) {
        return message.reply({ components: [cv2Error('You need **ManageRoles** permission.')], flags: 32768 });
      }
      if (!message.guild.members.me.permissions.has('ManageRoles')) {
        return message.reply({ components: [cv2Error('I need **ManageRoles** permission.')], flags: 32768 });
      }

      const autoroleData = storage.read('autorole.json');
      const guildId = message.guild.id;
      if (!autoroleData[guildId]) {
        autoroleData[guildId] = { enabled: true, humanRoles: [], botRoles: [] };
      }
      const config = autoroleData[guildId];
      const action = args[0]?.toLowerCase();

      if (action === 'toggle') {
        config.enabled = !config.enabled;
        storage.write('autorole.json', autoroleData);
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Auto-Role System`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${config.enabled ? EMOJI_SUCCESS : EMOJI_ERROR} **Auto-role system ${config.enabled ? 'enabled' : 'disabled'}.**\n` +
            `New members will ${config.enabled ? 'receive' : 'no longer receive'} roles automatically.`
          ));
        return message.reply({ components: [container], flags: 32768 }).catch(() => {});
      }

      if (action === 'list') {
        const botHighest = message.guild.members.me.roles.highest.position;
        let cleaned = false;

        const mapRoles = (ids, label) => {
          if (!ids || ids.length === 0) return `${EMOJI_DOT} *No ${label} roles configured.*`;
          const valid = [];
          const invalid = [];
          for (const id of ids) {
            const role = message.guild.roles.cache.get(id);
            if (!role) { invalid.push(id); continue; }
            const assignable = role.position < botHighest && !role.managed;
            valid.push(`${role} ${assignable ? '' : '\`\u26A0 Can\'t assign\`'}`);
          }
          if (invalid.length > 0) cleaned = true;
          return valid.length > 0 ? valid.map((r, i) => `\`${i + 1}.\` ${r}`).join('\n') : `${EMOJI_DOT} *No valid ${label} roles.*`;
        };

        const humanList = mapRoles(config.humanRoles, 'human');
        const botList = mapRoles(config.botRoles, 'bot');

        if (cleaned) {
          config.humanRoles = (config.humanRoles || []).filter(id => message.guild.roles.cache.has(id));
          config.botRoles = (config.botRoles || []).filter(id => message.guild.roles.cache.has(id));
          storage.write('autorole.json', autoroleData);
        }

        const buildContainer = () => {
          const container = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Auto-Role Dashboard`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
              `${EMOJI_DOT} **Status:** ${config.enabled !== false ? '\`● Enabled\`' : '\`○ Disabled\`'}\n` +
              `${EMOJI_DOT} **Guild:** ${message.guild.name}`
            ))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
              `**Human Roles [${(config.humanRoles || []).filter(id => message.guild.roles.cache.has(id)).length}/${MAX_ROLES}]**\n${humanList}\n\n` +
              `**Bot Roles [${(config.botRoles || []).filter(id => message.guild.roles.cache.has(id)).length}/${MAX_ROLES}]**\n${botList}`
            ));

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ar_toggle').setLabel(config.enabled !== false ? 'Disable' : 'Enable').setStyle(config.enabled !== false ? ButtonStyle.Danger : ButtonStyle.Success)
          );
          container.addActionRowComponents(row);
          return container;
        };

        const sent = await message.reply({ components: [buildContainer()], flags: 32768 }).catch(() => {});
        const coll = sent.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 60000 });
        coll.on('collect', async i => {
          if (i.customId === 'ar_toggle') {
            config.enabled = !config.enabled;
            storage.write('autorole.json', autoroleData);
            await i.update({ components: [buildContainer()] });
          }
        });
        coll.on('end', () => {
          const finalContainer = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Auto-Role Dashboard`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
              `${EMOJI_DOT} **Status:** ${config.enabled !== false ? '\`● Enabled\`' : '\`○ Disabled\`'}`
            ));
          sent.edit({ components: [finalContainer] }).catch(() => {});
        });
        return;
      }

      const type = args[1]?.toLowerCase();
      if (!action || !['add', 'remove'].includes(action) || !type || !['human', 'bot'].includes(type)) {
        return sendUsage(message, module.exports);
      }

      const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[2]);
      if (!role) {
        return message.reply({ components: [cv2Error(`Please mention a valid role or provide a role ID.\n\nUsage: \`${client.config.prefix}autorole ${action} ${type} @Role\``)], flags: 32768 });
      }

      const key = type === 'human' ? 'humanRoles' : 'botRoles';
      if (!config[key]) config[key] = [];

      if (action === 'add') {
        if (role.managed) {
          return message.reply({ components: [cv2Error('That role is managed by an integration and cannot be auto-assigned.')], flags: 32768 });
        }
        if (role.position >= message.guild.members.me.roles.highest.position) {
          return message.reply({ components: [cv2Error('That role is above or equal to my highest role.')], flags: 32768 });
        }
        if (config[key].includes(role.id)) {
          const warnContainer = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_WARN} **${role} is already in the ${type} autorole list.**`));
          return message.reply({ components: [warnContainer], flags: 32768 });
        }
        if (config[key].length >= MAX_ROLES) {
          return message.reply({ components: [cv2Error(`Maximum of \`${MAX_ROLES}\` ${type} autoroles reached.`)], flags: 32768 });
        }

        config[key].push(role.id);
        storage.write('autorole.json', autoroleData);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Auto-Role Added`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${EMOJI_SUCCESS} **Role added to ${type} autorole list.**\n` +
            `${EMOJI_DOT} **Role:** ${role}\n` +
            `${EMOJI_DOT} **Type:** \`${type.charAt(0).toUpperCase() + type.slice(1)}\`\n` +
            `${EMOJI_DOT} **Total:** \`${config[key].length}/${MAX_ROLES}\``
          ));
        return message.reply({ components: [container], flags: 32768 }).catch(() => {});
      }

      if (action === 'remove') {
        if (!config[key].includes(role.id)) {
          const warnContainer = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_WARN} **${role} is not in the ${type} autorole list.**`));
          return message.reply({ components: [warnContainer], flags: 32768 });
        }

        config[key] = config[key].filter(id => id !== role.id);
        storage.write('autorole.json', autoroleData);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Auto-Role Removed`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${EMOJI_SUCCESS} **Role removed from ${type} autorole list.**\n` +
            `${EMOJI_DOT} **Role:** ${role}\n` +
            `${EMOJI_DOT} **Type:** \`${type.charAt(0).toUpperCase() + type.slice(1)}\`\n` +
            `${EMOJI_DOT} **Remaining:** \`${config[key].length}/${MAX_ROLES}\``
          ));
        return message.reply({ components: [container], flags: 32768 }).catch(() => {});
      }
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
