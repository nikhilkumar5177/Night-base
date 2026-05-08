const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const storage = require('../../utils/storageManager');
const { EMOJI_SUCCESS, EMOJI_WARN, EMOJI_INFO, EMOJI_DOT } = require('../../utils/constants');
const { sendUsage, cv2Error, safeReply } = require('../../utils/messageHelper');

module.exports = {
  name: 'vouchsetup',
  aliases: ['vouchchannel', 'vouchset'],
  description: 'Configure vouch channels',
  usage: 'vouchsetup <add|remove|list> [channel]',
  cooldown: 3,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  premiumOnly: false,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('ManageChannels')) {
        return safeReply(message, { components: [cv2Error('You need **ManageChannels** permission.')] });
      }
      const action = args[0]?.toLowerCase();
      const vouchData = storage.read('vouch.json');
      if (!vouchData[message.guild.id]) vouchData[message.guild.id] = { channels: [] };

      if (action === 'list') {
        const guildChannels = vouchData[message.guild.id].channels;
        if (guildChannels.length === 0) {
          const container = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Vouch Channels`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_INFO} No vouch channels configured for this server.`));
          return safeReply(message, { components: [container] });
        }
        const list = guildChannels.map((id, i) => `**${i + 1}.** <#${id}>`).join('\n');
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Vouch Channels`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(list));
        return safeReply(message, { components: [container] });
      }

      const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]) || message.channel;

      if (action === 'add') {
        if (vouchData[message.guild.id].channels.includes(channel.id)) {
          const warnContainer = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_WARN} **${channel}** is already a vouch channel.`));
          return safeReply(message, { components: [warnContainer] });
        }
        vouchData[message.guild.id].channels.push(channel.id);
        storage.write('vouch.json', vouchData);
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Vouch Channel Added`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} ${channel} is now a vouch channel.`));
        return safeReply(message, { components: [container] });
      }

      if (action === 'remove') {
        vouchData[message.guild.id].channels = vouchData[message.guild.id].channels.filter(id => id !== channel.id);
        storage.write('vouch.json', vouchData);
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Vouch Channel Removed`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} Vouch channel removed.`));
        return safeReply(message, { components: [container] });
      }

      return sendUsage(message, module.exports);
    } catch (error) {
      safeReply(message, { components: [cv2Error(error.message)] }).catch(() => { });
    }
  }
};
