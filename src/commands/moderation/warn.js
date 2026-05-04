const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SectionBuilder, ThumbnailBuilder, MessageFlags } = require('discord.js');
const { resolveMember } = require('../../utils/resolver');
const storage = require('../../utils/storageManager');
const { sendUsage, sendAutoDelete, cv2Error } = require('../../utils/messageHelper');
const { EMOJI_DOT, EMOJI_SUCCESS, EMOJI_LOADING, FOOTER_TEXT } = require('../../utils/constants');

module.exports = {
  name: 'warn',
  aliases: ['w'],
  description: 'Warn a user',
  usage: 'warn <user> [reason]',
  example: 'warn @User being toxic\nwarn 123456789 spamming',
  cooldown: 3,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('ModerateMembers')) {
        return sendAutoDelete(message, { components: [cv2Error('You need **ModerateMembers** permission.')], flags: 32768 }, 5000);
      }
      if (!args[0]) {
        return sendUsage(message, module.exports);
      }

      const { resolveMember, resolveUser } = require('../../utils/resolver');
      let targetMember = await resolveMember(message.guild, args[0]);
      let targetUser = targetMember ? targetMember.user : await resolveUser(client, args[0]);

      if (!targetUser) {
        return message.reply({ components: [cv2Error('Could not find the specified user.')], flags: 32768 });
      }
      if (targetUser.id === message.author.id) {
        return message.reply({ components: [cv2Error('You cannot warn yourself.')], flags: 32768 });
      }
      if (targetMember) {
        if (targetMember.id === message.guild.ownerId) {
          return message.reply({ components: [cv2Error('You cannot warn the server owner.')], flags: 32768 });
        }
        
        // Check if target is staff
        const staffData = storage.read('staff.json');
        const guildStaffRoles = staffData[message.guild.id]?.roles || [];
        const isTargetStaff = guildStaffRoles.some(roleId => targetMember.roles.cache.has(roleId));
        const isModeratorOwner = message.author.id === message.guild.ownerId;

        if (isTargetStaff) {
          // Hierarchy strictly enforced between staff
          if (targetMember.roles.highest.position >= message.member.roles.highest.position && !isModeratorOwner) {
            return message.reply({ components: [cv2Error('Target is a staff member with a higher or equal role.')], flags: 32768 });
          }
        }

        // Always protect the bot itself
        if (targetMember.roles.highest.position >= message.guild.members.me.roles.highest.position) {
          return message.reply({ components: [cv2Error('Target has a higher or equal role than me.')], flags: 32768 });
        }
      }

      const loadContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_LOADING} **Issuing warning...**`));
      const sent = await message.reply({ components: [loadContainer], flags: 32768 }).catch(() => {});

      const reason = args.slice(1).join(' ') || 'No reason provided';
      const warns = storage.read('warns.json');
      if (!warns[targetUser.id]) warns[targetUser.id] = [];
      const caseId = Date.now().toString(36).toUpperCase();
      warns[targetUser.id].push({ caseId, moderator: message.author.id, reason, guildId: message.guild.id, timestamp: Date.now() });
      if (warns[targetUser.id].length > 50) warns[targetUser.id] = warns[targetUser.id].slice(-50);
      storage.write('warns.json', warns);

      await new Promise(r => setTimeout(r, 400));

      const totalWarns = warns[targetUser.id].length;
      const warnBar = totalWarns >= 10 ? '\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588' : '\u2588'.repeat(Math.min(totalWarns, 10)) + '\u2591'.repeat(Math.max(0, 10 - totalWarns));
      const severity = totalWarns >= 10 ? 'CRITICAL' : totalWarns >= 5 ? 'HIGH' : totalWarns >= 3 ? 'MODERATE' : 'LOW';

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Warning Issued`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(new SectionBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${EMOJI_SUCCESS} **Warning recorded.**\n` +
            `${EMOJI_DOT} **User:** ${targetUser.tag} \`${targetUser.id}\`\n` +
            `${EMOJI_DOT} **Moderator:** ${message.author.tag}\n` +
            `${EMOJI_DOT} **Case:** \`${caseId}\``
          ))
          .setThumbnailAccessory(new ThumbnailBuilder().setURL(targetUser.displayAvatarURL({ dynamic: true })))
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${EMOJI_DOT} **Reason:** ${reason}\n` +
          `${EMOJI_DOT} **Warn Level [${totalWarns}/10]:** \`${warnBar}\` **${severity}**`
        ))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));

      await sent.edit({ components: [container] }).catch(() => {});

      // DM notice — plain content (V2 not supported in DMs)
      if (targetMember) {
        targetMember.send({ content: `\u26A0\uFE0F **You received a warning in ${message.guild.name}**\n\u2022 Reason: ${reason}\n\u2022 Case: \`${caseId}\`\n\u2022 Total: \`${totalWarns}\`` }).catch(() => {});
      } else {
        targetUser.send({ content: `\u26A0\uFE0F **You received a warning in ${message.guild.name}**\n\u2022 Reason: ${reason}\n\u2022 Case: \`${caseId}\`\n\u2022 Total: \`${totalWarns}\`` }).catch(() => {});
      }
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
