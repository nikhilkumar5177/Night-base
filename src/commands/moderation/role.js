const { EmbedBuilder } = require('discord.js');
const { resolveMember, resolveRole } = require('../../utils/resolver');
const { SEP, EMOJI_DOT, EMOJI_SUCCESS, EMOJI_ERROR, EMOJI_WARN } = require('../../utils/constants');

module.exports = {
  name: 'role',
  aliases: ['r', 'toggle-role'],
  description: 'Add or remove a role from a user',
  usage: 'role <user> <role>',
  cooldown: 3,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('ManageRoles')) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_ERROR} You need **ManageRoles** permission.`).setTimestamp()] });
      }
      if (!message.guild.members.me.permissions.has('ManageRoles')) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_ERROR} I need **ManageRoles** permission.`).setTimestamp()] });
      }

      const target = await resolveMember(message.guild, args[0]);
      const roleInput = args.slice(1).join(' ');
      const role = resolveRole(message.guild, roleInput);

      if (!target || !role) {
        const usageEmbed = new EmbedBuilder().setColor('#8B0000').setAuthor({ name: 'WRONG SYNTAX', iconURL: client.user.displayAvatarURL() }).setDescription('**You used this command the wrong way.**\nRead the correct format below before trying again.').addFields({ name: '\u2501\u2501 Correct Format', value: `\`\`\`fix\n${client.config.prefix}role <@user|id> <@role|id|name>\n\`\`\`` }, { name: '\u2501\u2501 Example', value: `\`\`\`\n${client.config.prefix}role @User Moderator\n\`\`\`` }, { name: 'Aliases', value: '`r`', inline: true }, { name: 'Permission', value: '`ManageRoles`', inline: true }).setFooter({ text: 'Wild Wolf \u2022 Use it right or don\'t use it at all.' }).setTimestamp();
        return message.reply({ embeds: [usageEmbed] });
      }

      // Hierarchy Checks
      if (role.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`${EMOJI_ERROR} That role is higher than or equal to your highest role.`).setTimestamp()] });
      }
      if (role.position >= message.guild.members.me.roles.highest.position) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`${EMOJI_ERROR} That role is higher than my highest role.`).setTimestamp()] });
      }

      const hasRole = target.roles.cache.has(role.id);
      const action = hasRole ? 'Removed' : 'Added';
      const color = hasRole ? '#ffab00' : '#00e676';
      const emoji = hasRole ? EMOJI_WARN : EMOJI_SUCCESS;

      if (hasRole) {
        await target.roles.remove(role, `Moderator: ${message.author.tag}`);
      } else {
        await target.roles.add(role, `Moderator: ${message.author.tag}`);
      }

      const embed = new EmbedBuilder()
        .setColor(color)
        .setAuthor({ name: `Wild Wolf \u2502 Role ${action}`, iconURL: client.user.displayAvatarURL() })
        .setDescription(
          `${SEP}\n` +
          `${emoji} **Successfully ${action.toLowerCase()} role.**\n` +
          `${SEP}\n\n` +
          `${EMOJI_DOT} **User:** ${target}\n` +
          `${EMOJI_DOT} **Role:** ${role}\n` +
          `${EMOJI_DOT} **Moderator:** ${message.author}`
        )
        .setTimestamp();

      message.reply({ embeds: [embed] });
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`${EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
