const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { SEP, EMOJI_SUCCESS, EMOJI_ERROR, EMOJI_WARN, EMOJI_DOT } = require('../../utils/constants');
const storage = require('../../utils/storageManager');

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
        return message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_ERROR} You need **ManageRoles** permission.`).setTimestamp()] });
      }
      if (!message.guild.members.me.permissions.has('ManageRoles')) {
        return message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_ERROR} I need **ManageRoles** permission.`).setTimestamp()] });
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
        const statusEmbed = new EmbedBuilder()
          .setColor(config.enabled ? '#57F287' : '#ED4245')
          .setAuthor({ name: 'Wild Wolf \u2502 Auto-Role System', iconURL: client.user.displayAvatarURL() })
          .setDescription(`${SEP}\n${config.enabled ? `${EMOJI_SUCCESS} **Auto-role system enabled.**` : `${EMOJI_ERROR} **Auto-role system disabled.**`}\nNew members will ${config.enabled ? 'receive' : 'no longer receive'} roles automatically.\n${SEP}`)
          .setFooter({ text: 'Wild Wolf \u2022 Auto-Role Configuration', iconURL: message.guild.iconURL({ dynamic: true }) })
          .setTimestamp();
        return message.reply({ embeds: [statusEmbed] }).catch(() => {});
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

        const embed = new EmbedBuilder()
          .setColor('#5865F2')
          .setAuthor({ name: 'Wild Wolf \u2502 Auto-Role Dashboard', iconURL: client.user.displayAvatarURL() })
          .setThumbnail(message.guild.iconURL({ dynamic: true, size: 256 }))
          .setDescription(
            `${SEP}\n` +
            `${EMOJI_DOT} **Status:** ${config.enabled !== false ? '\`\u25CF Enabled\`' : '\`\u25CB Disabled\`'}\n` +
            `${EMOJI_DOT} **Guild:** ${message.guild.name}\n` +
            `${SEP}`
          )
          .addFields(
            { name: `\u25B8 Human Roles [${(config.humanRoles || []).filter(id => message.guild.roles.cache.has(id)).length}/${MAX_ROLES}]`, value: humanList },
            { name: `\u25B8 Bot Roles [${(config.botRoles || []).filter(id => message.guild.roles.cache.has(id)).length}/${MAX_ROLES}]`, value: botList }
          )
          .setFooter({ text: `Wild Wolf \u2022 Use ${client.config.prefix}autorole add/remove to manage`, iconURL: message.guild.iconURL({ dynamic: true }) })
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('ar_toggle').setLabel(config.enabled !== false ? 'Disable' : 'Enable').setStyle(config.enabled !== false ? ButtonStyle.Danger : ButtonStyle.Success),
          new ButtonBuilder().setCustomId('ar_del').setLabel('Dismiss').setStyle(ButtonStyle.Secondary).setEmoji('\u2716')
        );

        const sent = await message.reply({ embeds: [embed], components: [row] }).catch(() => {});
        const coll = sent.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 60000 });
        coll.on('collect', async i => {
          if (i.customId === 'ar_del') { await sent.delete().catch(() => {}); coll.stop(); return; }
          if (i.customId === 'ar_toggle') {
            config.enabled = !config.enabled;
            storage.write('autorole.json', autoroleData);
            embed.setDescription(
              `${SEP}\n` +
              `${EMOJI_DOT} **Status:** ${config.enabled ? '\`\u25CF Enabled\`' : '\`\u25CB Disabled\`'}\n` +
              `${EMOJI_DOT} **Guild:** ${message.guild.name}\n` +
              `${SEP}`
            );
            const newRow = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('ar_toggle').setLabel(config.enabled ? 'Disable' : 'Enable').setStyle(config.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
              new ButtonBuilder().setCustomId('ar_del').setLabel('Dismiss').setStyle(ButtonStyle.Secondary).setEmoji('\u2716')
            );
            await i.update({ embeds: [embed], components: [newRow] });
          }
        });
        coll.on('end', () => sent.edit({ components: [] }).catch(() => {}));
        return;
      }

      const type = args[1]?.toLowerCase();
      if (!action || !['add', 'remove'].includes(action) || !type || !['human', 'bot'].includes(type)) {
        const usageEmbed = new EmbedBuilder()
          .setColor('#8B0000')
          .setAuthor({ name: 'WRONG SYNTAX', iconURL: client.user.displayAvatarURL() })
          .setDescription('**You used this command the wrong way.**\nRead the correct format below before trying again.')
          .addFields(
            { name: '\u2501\u2501 Correct Format', value: `\`\`\`fix\n${client.config.prefix}autorole <add|remove|list|toggle> <human|bot> [role]\n\`\`\`` },
            { name: '\u2501\u2501 Examples', value: `\`\`\`\n${client.config.prefix}autorole add human @Member\n${client.config.prefix}autorole add bot @BotRole\n${client.config.prefix}autorole remove human @Member\n${client.config.prefix}autorole list\n${client.config.prefix}autorole toggle\n\`\`\`` },
            { name: 'Aliases', value: '`ar-setup`, `joinrole`', inline: true },
            { name: 'Max Roles', value: `\`${MAX_ROLES}/type\``, inline: true },
            { name: 'Permission', value: '`ManageRoles`', inline: true }
          )
          .setFooter({ text: 'Wild Wolf \u2022 Use it right or don\'t use it at all.' })
          .setTimestamp();
        return message.reply({ embeds: [usageEmbed] }).catch(() => {});
      }

      const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[2]);
      if (!role) {
        return message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_ERROR} Please mention a valid role or provide a role ID.\n\nUsage: \`${client.config.prefix}autorole ${action} ${type} @Role\``).setTimestamp()] });
      }

      const key = type === 'human' ? 'humanRoles' : 'botRoles';
      if (!config[key]) config[key] = [];

      if (action === 'add') {
        if (role.managed) {
          return message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_ERROR} That role is managed by an integration and cannot be auto-assigned.`).setTimestamp()] });
        }
        if (role.position >= message.guild.members.me.roles.highest.position) {
          return message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_ERROR} That role is above or equal to my highest role. I won't be able to assign it.`).setTimestamp()] });
        }
        if (config[key].includes(role.id)) {
          return message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#FEE75C').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_WARN} ${role} is already in the ${type} autorole list.`).setTimestamp()] });
        }
        if (config[key].length >= MAX_ROLES) {
          return message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_ERROR} Maximum of \`${MAX_ROLES}\` ${type} autoroles reached. Remove one first.`).setTimestamp()] });
        }

        config[key].push(role.id);
        storage.write('autorole.json', autoroleData);

        const embed = new EmbedBuilder()
          .setColor('#57F287')
          .setAuthor({ name: 'Wild Wolf \u2502 Auto-Role Added', iconURL: client.user.displayAvatarURL() })
          .setDescription(`${SEP}\n${EMOJI_SUCCESS} **Role added to ${type} autorole list.**\n${SEP}`)
          .addFields(
            { name: '\u25B8 Role', value: `${role}`, inline: true },
            { name: '\u25B8 Type', value: `\`${type.charAt(0).toUpperCase() + type.slice(1)}\``, inline: true },
            { name: '\u25B8 Total', value: `\`${config[key].length}/${MAX_ROLES}\``, inline: true }
          )
          .setFooter({ text: `Wild Wolf \u2022 New ${type}s will receive this role`, iconURL: message.guild.iconURL({ dynamic: true }) })
          .setTimestamp();
        return message.reply({ embeds: [embed] }).catch(() => {});
      }

      if (action === 'remove') {
        if (!config[key].includes(role.id)) {
          return message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#FEE75C').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_WARN} ${role} is not in the ${type} autorole list.`).setTimestamp()] });
        }

        config[key] = config[key].filter(id => id !== role.id);
        storage.write('autorole.json', autoroleData);

        const embed = new EmbedBuilder()
          .setColor('#ff6d00')
          .setAuthor({ name: 'Wild Wolf \u2502 Auto-Role Removed', iconURL: client.user.displayAvatarURL() })
          .setDescription(`${SEP}\n${EMOJI_SUCCESS} **Role removed from ${type} autorole list.**\n${SEP}`)
          .addFields(
            { name: '\u25B8 Role', value: `${role}`, inline: true },
            { name: '\u25B8 Type', value: `\`${type.charAt(0).toUpperCase() + type.slice(1)}\``, inline: true },
            { name: '\u25B8 Remaining', value: `\`${config[key].length}/${MAX_ROLES}\``, inline: true }
          )
          .setFooter({ text: `Wild Wolf \u2022 Role will no longer be auto-assigned`, iconURL: message.guild.iconURL({ dynamic: true }) })
          .setTimestamp();
        return message.reply({ embeds: [embed] }).catch(() => {});
      }
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
