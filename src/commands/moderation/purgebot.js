const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { LIMITS, EMOJI_SUCCESS, EMOJI_WARN, EMOJI_LOADING, EMOJI_DOT, FOOTER_TEXT } = require('../../utils/constants');
const { cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'purgebot',
  aliases: ['pb', 'clearbot'],
  description: 'Purge only bot messages from the channel',
  usage: 'purgebot [count]',
  cooldown: 5,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('ManageMessages')) {
        return message.reply({ components: [cv2Error('You need **ManageMessages** permission.')], flags: 32768 });
      }
      if (!message.guild.members.me.permissions.has('ManageMessages')) {
        return message.reply({ components: [cv2Error('I need **ManageMessages** permission.')], flags: 32768 });
      }

      let count = Math.min(parseInt(args[0]) || 50, LIMITS.MAX_PURGE);
      const loadContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_LOADING} **Scanning and deleting bot messages...**`));
      const progressMsg = await message.reply({ components: [loadContainer], flags: 32768 }).catch(() => {});

      // Delete the command message after replying
      const { safeDelete } = require('../../utils/messageHelper');
      await safeDelete(message);

      let fetched = await message.channel.messages.fetch({ limit: 100 });
      let filtered = fetched.filter(m => m.author.bot && m.id !== progressMsg.id);

      const twoWeeks = Date.now() - 14 * 24 * 60 * 60 * 1000;
      const deletable = filtered.filter(m => m.createdTimestamp > twoWeeks).first(count);

      if (deletable.length === 0) {
        const warnContainer = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_WARN} **No bot messages found.**`));
        return progressMsg.edit({ components: [warnContainer] }).catch(() => {});
      }

      const deleted = await message.channel.bulkDelete(deletable, true);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Purge Complete`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${EMOJI_SUCCESS} **Bot messages purged.**\n` +
          `${EMOJI_DOT} **Deleted:** \`${deleted.size}\` messages\n` +
          `${EMOJI_DOT} **By:** ${message.author.tag}`
        ))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));

      await progressMsg.edit({ components: [container] }).catch(() => {});
      const { safeDelete } = require('../../utils/messageHelper');
      setTimeout(() => safeDelete(progressMsg), 5000);
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
