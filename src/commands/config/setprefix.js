const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { EMOJI_OWNER, EMOJI_INFO, EMOJI_SUCCESS, EMOJI_DOT } = require('../../utils/constants');
const { cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'setprefix',
  aliases: ['prefix'],
  description: 'Change the bot prefix',
  usage: 'setprefix <new prefix>',
  cooldown: 5,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (message.author.id !== message.guild.ownerId && message.author.id !== process.env.DEV_ID) {
        return message.reply({ components: [cv2Error('Only the server owner can change the prefix.')], flags: 32768 });
      }
      if (!args[0]) {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_INFO} **Current prefix:** \`${client.config.prefix}\``));
        return message.reply({ components: [container], flags: 32768 });
      }
      const newPrefix = args[0];
      if (newPrefix.length > 5) {
        return message.reply({ components: [cv2Error('Prefix cannot exceed 5 characters.')], flags: 32768 });
      }
      const fs = require('fs');
      const path = require('path');
      client.config.prefix = newPrefix;
      fs.writeFileSync(path.join(__dirname, '..', '..', '..', 'config.json'), JSON.stringify(client.config, null, 2));

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Prefix Updated`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} **New prefix:** \`${newPrefix}\``));
      message.reply({ components: [container], flags: 32768 });
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
