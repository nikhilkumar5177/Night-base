const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const storage = require('../../utils/storageManager');
const { EMOJI_OWNER, EMOJI_INFO, EMOJI_SUCCESS, EMOJI_DOT, EMOJI_ARROW } = require('../../utils/constants');
const { cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'setprefix',
  aliases: ['prefix'],
  description: 'Change the bot prefix for this server',
  usage: 'setprefix <new prefix | reset>',
  cooldown: 5,
  enabled: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      const isDev = client.devIds ? client.devIds.has(message.author.id) : (process.env.DEV_ID || '').split(',').includes(message.author.id);
      if (message.author.id !== message.guild.ownerId && !isDev) {
        return message.reply({ components: [cv2Error('Only the server owner or devs can change the prefix.')], flags: 32768 });
      }

      const configData = storage.read('config.json');
      if (!configData.guildPrefixes) configData.guildPrefixes = {};
      const currentPrefix = configData.guildPrefixes[message.guild.id] || configData.prefix || client.config.prefix;

      if (!args[0]) {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_INFO} **Current prefix for this server:** \`${currentPrefix}\``));
        return message.reply({ components: [container], flags: 32768 });
      }

      const newPrefix = args[0].trim();
      if (newPrefix.toLowerCase() === 'reset') {
        delete configData.guildPrefixes[message.guild.id];
        storage.write('config.json', configData);
        const defaultPrefix = configData.prefix || client.config.prefix;
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Prefix Reset`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} Prefix reset to default: \`${defaultPrefix}\``));
        return message.reply({ components: [container], flags: 32768 });
      }

      if (newPrefix.length > 5) {
        return message.reply({ components: [cv2Error('Prefix cannot exceed 5 characters.')], flags: 32768 });
      }

      configData.guildPrefixes[message.guild.id] = newPrefix;
      storage.write('config.json', configData);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Prefix Updated`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} **New server prefix:** \`${newPrefix}\``));
      message.reply({ components: [container], flags: 32768 });
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
