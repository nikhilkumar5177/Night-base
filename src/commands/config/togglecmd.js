const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const storage = require('../../utils/storageManager');
const { EMOJI_OWNER, EMOJI_SUCCESS, EMOJI_WARN, EMOJI_ARROW } = require('../../utils/constants');
const { sendUsage, cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'togglecmd',
  aliases: ['toggle', 'cmdenable'],
  description: 'Enable or disable a command globally',
  usage: 'togglecmd <command>',
  cooldown: 3,
  enabled: true,
  devOnly: true,
  execute: async (client, message, args) => {
    try {
      if (message.author.id !== message.guild.ownerId && message.author.id !== process.env.DEV_ID) {
        return message.reply({ components: [cv2Error('Only the server owner can use this.')], flags: 32768 });
      }
      const cmdName = args[0]?.toLowerCase();
      if (!cmdName) {
        return sendUsage(message, module.exports);
      }
      const command = client.commands.get(cmdName);
      if (!command) {
        return message.reply({ components: [cv2Error('Command not found.')], flags: 32768 });
      }
      const configData = storage.read('config.json');
      if (!configData.disabledCommands) configData.disabledCommands = [];
      if (configData.disabledCommands.includes(cmdName)) {
        configData.disabledCommands = configData.disabledCommands.filter(c => c !== cmdName);
        storage.write('config.json', configData);
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Command Enabled`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} \`${cmdName}\` is now enabled.`));
        return message.reply({ components: [container], flags: 32768 });
      }
      configData.disabledCommands.push(cmdName);
      storage.write('config.json', configData);
      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Command Disabled`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_WARN} \`${cmdName}\` is now disabled globally.`));
      message.reply({ components: [container], flags: 32768 });
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
