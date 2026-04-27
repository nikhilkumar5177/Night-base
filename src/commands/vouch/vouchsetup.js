const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const storage = require('../../utils/storageManager');
const { EMOJI_SUCCESS, EMOJI_WARN, EMOJI_INFO, EMOJI_DOT } = require('../../utils/constants');
const { sendUsage, cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'vouchsetup',
  aliases: ['vouch', 'vouchchannel'],
  description: 'Configure vouch channels',
  usage: 'vouchsetup <add|remove|list> [channel]',
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
      const vouchData = storage.read('vouch.json');

      if (action === 'list') {
        if (!vouchData.channels || vouchData.channels.length === 0) {
          const container = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Vouch Channels`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_INFO} No vouch channels configured.`));
          return message.reply({ components: [container], flags: 32768 });
        }
        const list = vouchData.channels.map((id, i) => `**${i + 1}.** <#${id}>`).join('\n');
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Vouch Channels`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(list));
        return message.reply({ components: [container], flags: 32768 });
      }

      const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]) || message.channel;
      
      if (action === 'add') {
        if (vouchData.channels.includes(channel.id)) {
          const warnContainer = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_WARN} **${channel}** is already a vouch channel.`));
          return message.reply({ components: [warnContainer], flags: 32768 });
        }
        vouchData.channels.push(channel.id);
        storage.write('vouch.json', vouchData);
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Vouch Channel Added`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} ${channel} is now a vouch channel.`));
        return message.reply({ components: [container], flags: 32768 });
      }

      if (action === 'remove') {
        vouchData.channels = vouchData.channels.filter(id => id !== channel.id);
        storage.write('vouch.json', vouchData);
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Vouch Channel Removed`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} Vouch channel removed.`));
        return message.reply({ components: [container], flags: 32768 });
      }

      return sendUsage(message, module.exports);
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
