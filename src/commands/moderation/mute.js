const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SectionBuilder, ThumbnailBuilder, MessageFlags } = require('discord.js');
const { resolveMember } = require('../../utils/resolver');
const storage = require('../../utils/storageManager');
const { sendUsage, sendAutoDelete, cv2Error } = require('../../utils/messageHelper');
const { EMOJI_DOT, EMOJI_SUCCESS, EMOJI_LOADING, FOOTER_TEXT, EMOJI_ARROW } = require('../../utils/constants');

module.exports = {
  name: 'mute',
  aliases: ['timeout', 'to', 'm'],
  description: 'Timeout a user',
  usage: 'mute <user> [duration] [reason]',
  example: 'mute @User 30m spamming\nmute 123456789 2h repetitive messages',
  cooldown: 3,
  enabled: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('ModerateMembers')) {
        return sendAutoDelete(message, { components: [cv2Error('You need **ModerateMembers** permission.')], flags: 32768 }, 5000);
      }
      if (!message.guild.members.me.permissions.has('ModerateMembers')) {
        return sendAutoDelete(message, { components: [cv2Error('I need **ModerateMembers** permission.')], flags: 32768 }, 5000);
      }
      const target = await resolveMember(message.guild, args[0]);
      if (!target) {
        return sendUsage(message, module.exports);
      }
      if (!target.moderatable) {
        return message.reply({ components: [cv2Error('I cannot timeout this user.')], flags: 32768 });
      }
      if (target.id === message.guild.ownerId) {
        return message.reply({ components: [cv2Error('You cannot timeout the server owner.')], flags: 32768 });
      }

      // Staff-aware hierarchy: only enforce between staff members
      const staffData = storage.read('staff.json');
      const guildStaffRoles = staffData[message.guild.id]?.roles || [];
      const isTargetStaff = guildStaffRoles.some(roleId => target.roles.cache.has(roleId));

      if (isTargetStaff && target.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
        return message.reply({ components: [cv2Error('Target is a staff member with a higher or equal role.')], flags: 32768 });
      }

      let durationMs = 10 * 60 * 1000;
      let durationLabel = '10 minutes';
      let reasonIndex = 1;

      if (args[1]) {
        const timeStr = args[1].toLowerCase();
        const timeMatch = timeStr.match(/^(\d+)(s|m|h|d)$/);
        if (timeMatch) {
          const amount = parseInt(timeMatch[1], 10);
          const unit = timeMatch[2];
          const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
          durationMs = amount * multipliers[unit];
          durationLabel = `${amount}${unit}`;
          reasonIndex = 2;
        } else {
          const amount = parseInt(timeStr, 10);
          if (!isNaN(amount)) {
            durationMs = amount * 60 * 1000;
            durationLabel = `${amount} minutes`;
            reasonIndex = 2;
          }
        }
      }

      durationMs = Math.min(durationMs, 28 * 24 * 60 * 60 * 1000);
      const reason = args.slice(reasonIndex).join(' ') || 'No reason provided';

      await target.timeout(durationMs, reason);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Timeout Applied`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(new SectionBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${EMOJI_SUCCESS} **User has been timed out.**\n` +
            `${EMOJI_DOT} **User:** ${target.user.tag} \`${target.id}\`\n` +
            `${EMOJI_DOT} **Duration:** \`${durationLabel}\`\n` +
            `${EMOJI_DOT} **Moderator:** ${message.author.tag}`
          ))
          .setThumbnailAccessory(new ThumbnailBuilder().setURL(target.user.displayAvatarURL({ dynamic: true })))
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${EMOJI_DOT} **Reason:** ${reason}\n` +
          `${EMOJI_DOT} **Expires:** <t:${Math.floor((Date.now() + durationMs) / 1000)}:R>`
        ))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));

      await message.reply({ components: [container], flags: 32768 }).catch(() => {});

      // DM notice — stays as plain content (V2 not supported in DMs)
      target.send({ content: `\u26A0\uFE0F **You have been timed out in ${message.guild.name}**\n\u2022 Duration: \`${durationLabel}\`\n\u2022 Reason: ${reason}\n\u2022 Expires: <t:${Math.floor((Date.now() + durationMs) / 1000)}:R>` }).catch(() => { });
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
