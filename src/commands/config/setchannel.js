const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const storage = require('../../utils/storageManager');
const { EMOJI_SUCCESS, EMOJI_DOT } = require('../../utils/constants');
const { sendUsage, cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'setchannel',
  aliases: ['channelcmd'],
  description: 'Enable or disable commands in a channel',
  usage: 'setchannel <enable|disable> [channel] <command>',
  cooldown: 3,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('ManageChannels')) {
        return message.reply({ components: [cv2Error('You need **ManageChannels** permission.')], flags: 32768 });
      }
      const action = args[0]?.toLowerCase();
      if (!action || !['enable', 'disable'].includes(action)) {
        return sendUsage(message, module.exports);
      }
      const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]) || message.channel;
      const cmdName = args[2] || args[1];
      if (!cmdName || !client.commands.has(cmdName)) {
        return message.reply({ components: [cv2Error('Specify a valid command name.')], flags: 32768 });
      }
      const configData = storage.read('config.json');
      if (!configData.channelCommands) configData.channelCommands = {};
      if (!configData.channelCommands[channel.id]) configData.channelCommands[channel.id] = { disabled: [] };
      if (action === 'disable') {
        if (!configData.channelCommands[channel.id].disabled.includes(cmdName)) {
          configData.channelCommands[channel.id].disabled.push(cmdName);
        }
        storage.write('config.json', configData);
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Command Disabled`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} \`${cmdName}\` is now disabled in ${channel}.`));
        return message.reply({ components: [container], flags: 32768 });
      }
      configData.channelCommands[channel.id].disabled = configData.channelCommands[channel.id].disabled.filter(c => c !== cmdName);
      storage.write('config.json', configData);
      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Command Enabled`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} \`${cmdName}\` is now enabled in ${channel}.`));
      message.reply({ components: [container], flags: 32768 });
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
