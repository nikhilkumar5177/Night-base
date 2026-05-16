const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { resolveMember, resolveRole } = require('../../utils/resolver');
const { EMOJI_DOT, EMOJI_SUCCESS, EMOJI_WARN } = require('../../utils/constants');
const { sendUsage, cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'role',
  aliases: ['r', 'toggle-role'],
  description: 'Add or remove a role from a user',
  usage: 'role <user> <role>',
  cooldown: 3,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  premiumOnly: false,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('ManageRoles')) {
        return message.reply({ components: [cv2Error('You need **ManageRoles** permission.')], flags: 32768 });
      }
      if (!message.guild.members.me.permissions.has('ManageRoles')) {
        return message.reply({ components: [cv2Error('I need **ManageRoles** permission.')], flags: 32768 });
      }

      const target = await resolveMember(message.guild, args[0]);
      const roleInput = args.slice(1).join(' ').trim();
      
      if (!target || !roleInput) {
        return sendUsage(message, module.exports);
      }

      const role = resolveRole(message.guild, roleInput);

      if (!role) {
        return message.reply({ components: [cv2Error(`Could not find a role matching \`${roleInput}\`.`)], flags: 32768 });
      }

      if (role.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
        return message.reply({ components: [cv2Error('That role is higher than or equal to your highest role.')], flags: 32768 });
      }
      if (role.position >= message.guild.members.me.roles.highest.position) {
        return message.reply({ components: [cv2Error('That role is higher than my highest role.')], flags: 32768 });
      }

      const hasRole = target.roles.cache.has(role.id);
      const action = hasRole ? 'Removed' : 'Added';
      const emoji = hasRole ? EMOJI_WARN : EMOJI_SUCCESS;

      if (hasRole) {
        await target.roles.remove(role, `Moderator: ${message.author.tag}`);
      } else {
        await target.roles.add(role, `Moderator: ${message.author.tag}`);
      }

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Role ${action}`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${emoji} **Role ${action.toLowerCase()}.**\n` +
          `${EMOJI_DOT} **User:** ${target}\n` +
          `${EMOJI_DOT} **Role:** ${role}\n` +
          `${EMOJI_DOT} **Moderator:** ${message.author}`
        ));

      message.reply({ components: [container], flags: 32768 }).catch(() => {});
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
