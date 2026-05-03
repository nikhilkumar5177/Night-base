const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { LIMITS, EMOJI_SUCCESS, EMOJI_WARN, EMOJI_LOADING, FOOTER_TEXT } = require('../../utils/constants');
const { sendUsage, sendAutoDelete, cv2Error, safeDelete } = require('../../utils/messageHelper');

module.exports = {
  name: 'purge',
  aliases: ['clear', 'prune'],
  description: 'Purge messages with filters',
  usage: 'purge <count | bots | embeds | @user> [count]',
  example: 'purge 50\npurge bots 20\npurge @User 10',
  cooldown: 5,
  enabled: true,
  staffOnly: true,
  userPermissions: ['ManageMessages'],
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('ManageMessages')) return message.reply({ components: [cv2Error('You need **ManageMessages** permission.')], flags: 32768 });
      if (!message.guild.members.me.permissions.has('ManageMessages')) return message.reply({ components: [cv2Error('I need **ManageMessages** permission.')], flags: 32768 });
      if (!args[0]) return sendUsage(message, module.exports);

      let count = Math.min(parseInt(args[0]) || parseInt(args[1]) || 50, LIMITS.MAX_PURGE);
      const type = args[0].toLowerCase();

      const loadContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_LOADING} **Scanning and deleting messages...**`));
      
      const progressMsg = await sendAutoDelete(message, { components: [loadContainer], flags: 32768 }, 0);
      
      // Delete command message after sending progress
      await safeDelete(message);

      let fetched = await message.channel.messages.fetch({ limit: count });
      let filtered;
      let filterLabel = 'All Messages';

      if (type === 'bots') { filtered = fetched.filter(m => m.author.bot); filterLabel = 'Bot Messages'; }
      else if (type === 'embeds') { filtered = fetched.filter(m => m.embeds.length > 0); filterLabel = 'Embeds'; }
      else if (message.mentions.users.size > 0) {
        const tu = message.mentions.users.first();
        count = parseInt(args[1]) || 50;
        fetched = await message.channel.messages.fetch({ limit: Math.min(count, LIMITS.MAX_PURGE) });
        filtered = fetched.filter(m => m.author.id === tu.id);
        filterLabel = `Messages by ${tu.tag}`;
      } else {
        count = parseInt(type);
        if (isNaN(count) || count < 1) {
          await safeDelete(progressMsg);
          return message.reply({ components: [cv2Error('Invalid message count.')], flags: 32768 });
        }
        filtered = fetched;
      }

      const twoWeeks = Date.now() - 14 * 24 * 60 * 60 * 1000;
      const deletable = filtered.filter(m => m.createdTimestamp > twoWeeks && m.id !== progressMsg.id);

      if (deletable.size === 0) {
        const warnContainer = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_WARN} **No deletable messages found.**\nMessages older than 14 days cannot be bulk deleted.`));
        return progressMsg.edit({ components: [warnContainer] });
      }

      // Add to ignoredDeletes before bulkDelete
      deletable.forEach(m => {
        if (client.ignoredDeletes) {
          client.ignoredDeletes.add(m.id);
          setTimeout(() => client.ignoredDeletes?.delete(m.id), 15000);
        }
      });

      const deleted = await message.channel.bulkDelete(deletable, true);

      const successContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Purge Complete`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${EMOJI_SUCCESS} **Messages purged successfully.**\n\n` +
          `Deleted: \`${deleted.size}\` \u2502 Filter: \`${filterLabel}\``
        ))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));

      await progressMsg.edit({ components: [successContainer] }).catch(() => {});
      setTimeout(() => safeDelete(progressMsg), 5000);
    } catch (error) {
      sendAutoDelete(message, { components: [cv2Error(error.message)], flags: 32768 }, 5000);
    }
  }
};
