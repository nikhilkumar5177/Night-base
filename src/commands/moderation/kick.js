const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { sendUsage, sendAutoDelete, cv2Error, safeDelete } = require('../../utils/messageHelper');
const { EMOJI_DOT, EMOJI_SUCCESS, EMOJI_WARN, EMOJI_LOADING, FOOTER_TEXT } = require('../../utils/constants');

module.exports = {
  name: 'kick',
  aliases: ['k', 'fuckoff'],
  description: 'Kick a user with button confirmation',
  usage: 'kick <user> [reason]',
  cooldown: 5,
  enabled: true,
  userPermissions: ['KickMembers'],
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('KickMembers')) return message.reply({ components: [cv2Error('You need **KickMembers** permission.')], flags: 32768 });
      if (!message.guild.members.me.permissions.has('KickMembers')) return message.reply({ components: [cv2Error('I need **KickMembers** permission.')], flags: 32768 });

      const { resolveMember } = require('../../utils/resolver');
      const targets = new Set();
      const reasonArgs = [];

      for (const arg of args) {
        if (arg.match(/^\d{17,20}$/) || arg.match(/^<@!?\d{17,20}>$/)) {
          const member = await resolveMember(message.guild, arg);
          if (member) targets.add(member);
        } else { reasonArgs.push(arg); }
      }

      const finalTargets = Array.from(targets).filter(t => t.id !== message.author.id);
      if (finalTargets.length === 0) return sendUsage(message, module.exports);

      const reason = reasonArgs.join(' ') || 'No reason provided';
      const validTargets = [];
      const invalidTargets = [];

      for (const target of finalTargets) {
        if (!target.kickable || target.roles.highest.position >= message.member.roles.highest.position) {
          invalidTargets.push(target.user.tag);
        } else {
          validTargets.push(target);
        }
      }

      if (validTargets.length === 0) {
        return sendAutoDelete(message, { components: [cv2Error(`I cannot kick any of the specified users.\n**Invalid:** ${invalidTargets.join(', ')}`)], flags: 32768 }, 10000);
      }

      const buildConfirmContainer = () => new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Kick Confirmation`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${EMOJI_WARN} **Kick ${validTargets.length} user(s)?**\n\n` +
          `${EMOJI_DOT} **Targets:** ${validTargets.map(t => `\`${t.user.tag}\``).join(', ')}\n` +
          `${EMOJI_DOT} **Reason:** ${reason}`
        ));

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('kick_yes').setLabel(`Confirm (${validTargets.length})`).setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('kick_no').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
      );

      const sent = await message.reply({ components: [buildConfirmContainer(), row], flags: 32768 }).catch(() => {});
      if (!sent) return;

      const coll = sent.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 30000, max: 1 });

      coll.on('collect', async i => {
        if (i.customId === 'kick_yes') {
          const loadContainer = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_LOADING} **Mass kicking ${validTargets.length} users...**`));
          await i.update({ components: [loadContainer] });

          let successCount = 0;
          let failCount = 0;

          for (const target of validTargets) {
            try {
              await target.send(`**Kicked from ${message.guild.name}**\nReason: ${reason}\nModerator: ${message.author.tag}`).catch(() => {});
              await target.kick(reason);
              successCount++;
            } catch { failCount++; }
          }

          const successContainer = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Action Executed`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
              `${EMOJI_SUCCESS} **Mass kick completed.**\n\n` +
              `Success: \`${successCount}\` \u2502 Failed: \`${failCount}\`\n` +
              `Reason: ${reason}`
            ))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));
          await sent.edit({ components: [successContainer] }).catch(() => {});
        } else {
          const cancelContainer = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_WARN} **Mass kick cancelled.**`));
          await i.update({ components: [cancelContainer] });
          setTimeout(() => safeDelete(sent), 5000);
        }
      });
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
