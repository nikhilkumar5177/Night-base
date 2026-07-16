const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { resolveMember } = require('../../utils/resolver');
const storage = require('../../utils/storageManager');
const { EMOJI_SUCCESS, EMOJI_DOT } = require('../../utils/constants');
const { sendUsage, cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'nickname',
  aliases: ['nick', 'setnick'],
  description: 'Change a users nickname',
  usage: 'nickname <user> <new nickname | reset>',
  cooldown: 3,
  enabled: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('ManageNicknames')) {
        return message.reply({ components: [cv2Error('You need **ManageNicknames** permission.')], flags: 32768 });
      }
      if (!message.guild.members.me.permissions.has('ManageNicknames')) {
        return message.reply({ components: [cv2Error('I need **ManageNicknames** permission.')], flags: 32768 });
      }
      const target = await resolveMember(message.guild, args[0]);
      if (!target || args.length < 2) {
        return sendUsage(message, module.exports);
      }
      if (target.roles.highest.position >= message.guild.members.me.roles.highest.position) {
        return message.reply({ components: [cv2Error('That user has a higher or equal role than me.')], flags: 32768 });
      }
      if (target.id === message.guild.ownerId) {
        return message.reply({ components: [cv2Error('You cannot change the server owner\'s nickname.')], flags: 32768 });
      }

      // Staff-aware hierarchy: only enforce between staff members
      const staffData = storage.read('staff.json');
      const guildStaffRoles = staffData[message.guild.id]?.roles || [];
      const isTargetStaff = guildStaffRoles.some(roleId => target.roles.cache.has(roleId));

      if (isTargetStaff && target.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
        return message.reply({ components: [cv2Error('Target is a staff member with a higher or equal role.')], flags: 32768 });
      }

      const newNick = args.slice(1).join(' ');
      const oldNick = target.displayName;
      if (newNick.toLowerCase() === 'reset') {
        await target.setNickname(null);
      } else {
        await target.setNickname(newNick);
      }

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Nickname Changed`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${EMOJI_SUCCESS} **Nickname updated.**\n` +
          `${EMOJI_DOT} **User:** ${target.user.tag}\n` +
          `${EMOJI_DOT} **Before:** \`${oldNick}\`\n` +
          `${EMOJI_DOT} **After:** \`${newNick.toLowerCase() === 'reset' ? target.user.username : newNick}\``
        ));

      message.reply({ components: [container], flags: 32768 }).catch(() => {});
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
