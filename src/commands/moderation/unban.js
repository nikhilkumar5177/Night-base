const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { sendUsage, sendAutoDelete, cv2Error } = require('../../utils/messageHelper');
const { EMOJI_DOT, EMOJI_SUCCESS, EMOJI_LOADING, FOOTER_TEXT } = require('../../utils/constants');

module.exports = {
  name: 'unban',
  aliases: ['ub'],
  description: 'Unban one or more users from the server',
  usage: 'unban <userIds...|mentions...> [reason]',
  example: 'unban 123456789 appeal accepted\nunban 123456789 987654321 mass appeal',
  cooldown: 5,
  enabled: true,
  userPermissions: ['BanMembers'],
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('BanMembers')) return message.reply({ components: [cv2Error('You need **BanMembers** permission.')], flags: 32768 });
      if (!message.guild.members.me.permissions.has('BanMembers')) return message.reply({ components: [cv2Error('I need **BanMembers** permission.')], flags: 32768 });
      if (args.length === 0) return sendUsage(message, module.exports);

      const idRegex = /^\d{17,20}$/;
      const mentionRegex = /^<@!?(\d{17,20})>$/;
      
      const idsToUnban = [];
      const reasonParts = [];

      for (const arg of args) {
        const match = arg.match(mentionRegex);
        if (match) idsToUnban.push(match[1]);
        else if (arg.match(idRegex)) idsToUnban.push(arg);
        else reasonParts.push(arg);
      }

      if (idsToUnban.length === 0) return sendUsage(message, module.exports);

      const reason = reasonParts.join(' ') || 'No reason provided';
      const success = [];
      const failure = [];

      const loadContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_LOADING} **Processing unbans for ${idsToUnban.length} target(s)...**`));
      
      const statusMsg = await message.reply({ components: [loadContainer], flags: 32768 }).catch(() => {});

      for (const id of idsToUnban) {
        if (!/^\d{17,20}$/.test(id)) { failure.push(`\`${id}\` (Invalid ID)`); continue; }
        try {
          await message.guild.members.unban(id, reason);
          success.push(`\`${id}\``);
        } catch (err) {
          let errorType = err.message;
          if (err.code === 10013) errorType = 'Unknown User';
          if (err.code === 10026) errorType = 'Not Banned';
          failure.push(`\`${id}\` (${errorType})`);
        }
      }

      const finalContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Unban Results`))
        .addSeparatorComponents(new SeparatorBuilder());

      let desc = '';
      if (success.length > 0) desc += `${EMOJI_SUCCESS} **Unbanned ${success.length} user(s):**\n${success.join(', ')}\n\n`;
      if (failure.length > 0) desc += `${EMOJI_DOT} **Failed ${failure.length} user(s):**\n${failure.join('\n')}\n\n`;
      desc += `${EMOJI_DOT} **Reason:** ${reason}`;

      finalContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(desc))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));

      await statusMsg.edit({ components: [finalContainer] }).catch(() => {});
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
