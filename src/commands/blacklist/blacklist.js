const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const storage = require('../../utils/storageManager');
const { EMOJI_ERROR, EMOJI_OWNER, EMOJI_WARN, EMOJI_SUCCESS, EMOJI_DOT } = require('../../utils/constants');
const { sendUsage, cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'blacklist',
  aliases: ['bl'],
  description: 'Add or remove a user from global blacklist',
  usage: 'blacklist <add|remove|list> [user]',
  cooldown: 0,
  enabled: true,
  staffOnly: false,
  devOnly: true,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('Administrator')) {
        return message.reply({ components: [cv2Error('You need **Administrator** permission.')], flags: 32768 });
      }
      const action = args[0]?.toLowerCase();
      const blData = storage.read('blacklist.json');
      if (action === 'list') {
        if (blData.users.length === 0) {
          const container = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Blacklist`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_OWNER} No blacklisted users.`));
          return message.reply({ components: [container], flags: 32768 });
        }
        const list = blData.users.map((id, i) => {
          const user = client.users.cache.get(id);
          return `**${i + 1}.** ${user ? user.tag : id}`;
        }).join('\n');
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Blacklisted Users`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(list));
        return message.reply({ components: [container], flags: 32768 });
      }
      const target = message.mentions.users.first() || client.users.cache.get(args[1]);
      if (!target) return sendUsage(message, module.exports);

      if (action === 'add') {
        if (blData.users.includes(target.id)) {
          const warnContainer = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_WARN} **${target.tag}** is already blacklisted.`));
          return message.reply({ components: [warnContainer], flags: 32768 });
        }
        blData.users.push(target.id);
        storage.write('blacklist.json', blData);
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 User Blacklisted`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} **${target.tag}** has been blacklisted.`));
        return message.reply({ components: [container], flags: 32768 });
      }
      if (action === 'remove') {
        blData.users = blData.users.filter(id => id !== target.id);
        storage.write('blacklist.json', blData);
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 User Removed`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} **${target.tag}** removed from blacklist.`));
        return message.reply({ components: [container], flags: 32768 });
      }
      return sendUsage(message, module.exports);
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
