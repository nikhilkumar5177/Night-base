const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { sendUsage, sendAutoDelete, cv2Error } = require('../../utils/messageHelper');
const { EMOJI_DOT, EMOJI_SUCCESS, EMOJI_WARN, EMOJI_LOADING, FOOTER_TEXT } = require('../../utils/constants');

module.exports = {
  name: 'ban',
  aliases: ['b', 'bkl'],
  description: 'Ban a user with button confirmation',
  usage: 'ban <user> [reason]',
  cooldown: 10,
  enabled: true,
  staffOnly: true,
  userPermissions: ['BanMembers'],
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('BanMembers')) return message.reply({ components: [cv2Error('You need **BanMembers** permission.')], flags: 32768 });
      if (!message.guild.members.me.permissions.has('BanMembers')) return message.reply({ components: [cv2Error('I need **BanMembers** permission.')], flags: 32768 });

      const { resolveMember, resolveUser } = require('../../utils/resolver');
      const targets = new Set();
      const reasonArgs = [];

      for (const arg of args) {
        if (arg.match(/^\d{17,20}$/) || arg.match(/^<@!?\d{17,20}>$/)) {
          const member = await resolveMember(message.guild, arg);
          if (member) {
            targets.add({ type: 'member', data: member, id: member.id, tag: member.user.tag });
          } else {
            const user = await resolveUser(client, arg);
            if (user) targets.add({ type: 'user', data: user, id: user.id, tag: user.tag });
          }
        } else { reasonArgs.push(arg); }
      }

      const finalTargets = Array.from(targets).filter(t => t.id !== message.author.id);
      if (finalTargets.length === 0) return sendUsage(message, module.exports);

      const reason = reasonArgs.join(' ') || 'No reason provided';
      const validTargets = [];
      const invalidTargets = [];

      for (const target of finalTargets) {
        if (target.type === 'member') {
          if (!target.data.bannable || target.data.roles.highest.position >= message.member.roles.highest.position) {
            invalidTargets.push(target.tag);
          } else {
            validTargets.push(target);
          }
        } else {
          // It's a user not in the guild, always try to ban
          validTargets.push(target);
        }
      }

      if (validTargets.length === 0) {
        return sendAutoDelete(message, { components: [cv2Error(`I cannot ban any of the specified users.\n**Invalid:** ${invalidTargets.join(', ')}`)], flags: 32768 }, 10000);
      }

      const buildConfirmContainer = () => new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Ban Confirmation`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${EMOJI_WARN} **Permanently ban ${validTargets.length} user(s)?**\n\n` +
          `${EMOJI_DOT} **Targets:** ${validTargets.map(t => `\`${t.tag}\``).join(', ')}\n` +
          `${EMOJI_DOT} **Reason:** ${reason}\n` +
          `${EMOJI_DOT} **Messages:** \`7 days will be purged\``
        ));

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ban_yes').setLabel(`Confirm (${validTargets.length})`).setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('ban_no').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
      );

      const sent = await message.reply({ components: [buildConfirmContainer(), row], flags: 32768 }).catch(() => {});
      if (!sent) return;

      const coll = sent.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 30000, max: 1 });

      coll.on('collect', async i => {
        if (i.customId === 'ban_yes') {
          const loadContainer = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_LOADING} **Mass banning ${validTargets.length} users...**`));
          await i.update({ components: [loadContainer] });

          let successCount = 0;
          let failCount = 0;

          for (const target of validTargets) {
            try {
              if (target.type === 'member') {
                await target.data.send(`**Banned from ${message.guild.name}**\nReason: ${reason}\nModerator: ${message.author.tag}`).catch(() => {});
                await target.data.ban({ reason, deleteMessageSeconds: 604800 });
              } else {
                await message.guild.members.ban(target.id, { reason, deleteMessageSeconds: 604800 });
              }
              successCount++;
            } catch { failCount++; }
          }

          const successContainer = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Action Executed`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
              `${EMOJI_SUCCESS} **Mass ban completed.**\n\n` +
              `Success: \`${successCount}\` \u2502 Failed: \`${failCount}\`\n` +
              `Reason: ${reason}`
            ))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));
          await sent.edit({ components: [successContainer] }).catch(() => {});
        } else {
          const cancelContainer = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_WARN} **Mass ban cancelled.**`));
          await i.update({ components: [cancelContainer] });
          setTimeout(() => sent.delete().catch(() => {}), 5000);
        }
      });
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
