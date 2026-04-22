const { EmbedBuilder } = require('discord.js');
const storage = require('../../utils/storageManager');
const { EMOJI_SUCCESS, EMOJI_ERROR, EMOJI_INFO } = require('../../utils/constants');

module.exports = {
  name: 'invoicerole',
  aliases: ['ivr', 'voicerole'],
  description: 'Configure in-voice auto role',
  usage: 'invoicerole <set|remove|list> <alias> <roleId>',
  cooldown: 3,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('ManageRoles')) {
        return message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#ff1744').setTitle(`${EMOJI_ERROR} Missing Permissions`).setDescription('You need **ManageRoles** permission.').setTimestamp()] });
      }
      const action = args[0]?.toLowerCase();
      const aliasData = storage.read('aliases.json');
      if (action === 'list') {
        const entries = Object.entries(aliasData).filter(([, c]) => c.voiceRole);
        if (entries.length === 0) {
          return message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#0099ff').setTitle(`${EMOJI_INFO} Voice Roles`).setDescription('No in-voice roles configured.').setTimestamp()] });
        }
        const list = entries.map(([name, cfg]) => {
          const role = message.guild.roles.cache.get(cfg.voiceRole);
          return `**${name}** -> ${role ? role.name : cfg.voiceRole}`;
        }).join('\n');
        return message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#0099ff').setTitle(`${EMOJI_INFO} Voice Roles`).setDescription(list).setTimestamp()] });
      }
      if (action === 'set') {
        const alias = args[1]?.toLowerCase();
        const roleId = args[2];
        if (!alias || !roleId) {
          const usageEmbed = new EmbedBuilder().setColor('#8B0000').setAuthor({ name: 'WRONG SYNTAX', iconURL: client.user.displayAvatarURL() }).setDescription('**You used this command the wrong way.**\nRead the correct format below before trying again.').addFields({ name: '\u2501\u2501 Correct Format', value: `\`\`\`fix\n${client.config.prefix}invoicerole set <name> <roleId>\n\`\`\`` }, { name: '\u2501\u2501 Example', value: `\`\`\`\n${client.config.prefix}invoicerole set vc 123456789\n\`\`\`` }, { name: 'Aliases', value: '`ivr`, `voicerole`', inline: true }, { name: 'Permission', value: '`ManageRoles`', inline: true }).setFooter({ text: 'Wild Wolf \u2022 Use it right or don\'t use it at all.' }).setTimestamp();
          return message.reply({ embeds: [usageEmbed] }).catch(() => {});
        }
        const { resolveRole } = require('../../utils/resolver');
        const role = resolveRole(message.guild, roleId);
        if (!role) {
          return message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#ff1744').setTitle(`${EMOJI_ERROR} Role Not Found`).setTimestamp()] });
        }
        if (!aliasData[alias]) aliasData[alias] = { roleId: null, aliases: [] };
        aliasData[alias].voiceRole = role.id;
        storage.write('aliases.json', aliasData);
        return message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#00e676').setTitle(`${EMOJI_SUCCESS} Voice Role Set`).setDescription(`**${role.name}** will be given when joining voice.`).setTimestamp()] });
      }
      if (action === 'remove') {
        const alias = args[1]?.toLowerCase();
        if (!alias || !aliasData[alias] || !aliasData[alias].voiceRole) {
          return message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#ff1744').setTitle(`${EMOJI_ERROR} Not Found`).setTimestamp()] });
        }
        delete aliasData[alias].voiceRole;
        storage.write('aliases.json', aliasData);
        return message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#00e676').setTitle(`${EMOJI_SUCCESS} Voice Role Removed`).setTimestamp()] });
      }
      message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#ff1744').setTitle(`${EMOJI_ERROR} Invalid Action`).setDescription('Use `add`, `remove`, or `list`.').setTimestamp()] });
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#ff1744').setTitle(`${EMOJI_ERROR} Error`).setDescription(error.message).setTimestamp()] });
    }
  }
};
