const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const storage = require('../../utils/storageManager');
const { EMOJI_ERROR, EMOJI_OWNER, EMOJI_WARN, EMOJI_SUCCESS, EMOJI_DOT } = require('../../utils/constants');
const { sendUsage, cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'cmdblacklist',
  aliases: ['cbl', 'channelblock'],
  description: 'Block commands in a channel',
  usage: 'cmdblacklist <add|remove|list> [channel] [command]',
  cooldown: 0,
  enabled: true,
  staffOnly: false,
  devOnly: true,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('ManageChannels')) {
        return message.reply({ components: [cv2Error('You need **ManageChannels** permission.')], flags: 32768 });
      }
      const action = args[0]?.toLowerCase();
      const cblData = storage.read('cmdBlacklist.json');
      if (action === 'list') {
        const entries = Object.entries(cblData).filter(([chId]) => message.guild.channels.cache.has(chId));
        if (entries.length === 0) {
          const container = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Command Blacklist`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_OWNER} No channel command blacklists for this server.`));
          return message.reply({ components: [container], flags: 32768 });
        }
        const list = entries.map(([chId, cmds]) => `<#${chId}>: ${cmds.join(', ')}`).join('\n');
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Command Blacklists`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(list));
        return message.reply({ components: [container], flags: 32768 });
      }
      const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]) || message.channel;
      const cmdName = args[2] || args[1];
      if (!cmdName || !client.commands.has(cmdName)) return sendUsage(message, module.exports);

      if (action === 'add') {
        if (!cblData[channel.id]) cblData[channel.id] = [];
        if (cblData[channel.id].includes(cmdName)) {
          const warnContainer = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_WARN} \`${cmdName}\` is already blocked in ${channel}.`));
          return message.reply({ components: [warnContainer], flags: 32768 });
        }
        cblData[channel.id].push(cmdName);
        storage.write('cmdBlacklist.json', cblData);
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Command Blocked`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} \`${cmdName}\` blocked in ${channel}.`));
        return message.reply({ components: [container], flags: 32768 });
      }
      if (action === 'remove') {
        if (!cblData[channel.id]) {
          const warnContainer = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_WARN} No blacklists found for ${channel}.`));
          return message.reply({ components: [warnContainer], flags: 32768 });
        }
        cblData[channel.id] = cblData[channel.id].filter(c => c !== cmdName);
        if (cblData[channel.id].length === 0) delete cblData[channel.id];
        storage.write('cmdBlacklist.json', cblData);
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Command Unblocked`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} \`${cmdName}\` unblocked in ${channel}.`));
        return message.reply({ components: [container], flags: 32768 });
      }
      return sendUsage(message, module.exports);
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
