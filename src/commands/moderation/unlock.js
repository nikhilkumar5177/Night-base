const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ChannelType, MessageFlags } = require('discord.js');
const { EMOJI_SUCCESS, EMOJI_BYPASS, EMOJI_DOT } = require('../../utils/constants');
const { cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'unlock',
  aliases: ['unlockdown'],
  description: 'Unlock a channel to allow messages',
  usage: 'unlock [#channel]',
  cooldown: 3,
  enabled: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('ManageChannels')) {
        return message.reply({ components: [cv2Error('You need **ManageChannels** permission.')], flags: 32768 });
      }

      const channels = new Set();
      message.mentions.channels.forEach(c => {
        if (c.type === ChannelType.GuildText) channels.add(c);
      });

      for (const arg of args) {
        if (arg.match(/^\d{17,20}$/) || arg.match(/^<#\d{17,20}>$/)) {
          const id = arg.replace(/[<#>]/g, '');
          const channel = message.guild.channels.cache.get(id);
          if (channel && channel.type === ChannelType.GuildText) channels.add(channel);
        }
      }

      if (channels.size === 0) {
        if (message.channel.type === ChannelType.GuildText) {
          channels.add(message.channel);
        } else {
          return message.reply({ components: [cv2Error('Can only unlock text channels.')], flags: 32768 });
        }
      }

      const channelList = Array.from(channels);

      for (const channel of channelList) {
        await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null }).catch(() => {});

        if (channel.id !== message.channel.id) {
          const notifyContainer = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_BYPASS} **This channel has been unlocked by ${message.author.tag}.**`));
          channel.send({ components: [notifyContainer], flags: 32768 }).catch(() => {});
        }
        await new Promise(r => setTimeout(r, 200));
      }

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Channel Unlocked`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${EMOJI_SUCCESS} **${channelList.length} channel(s) unlocked.**\n` +
          `${EMOJI_DOT} **Channels:** ${channelList.map(c => `${c}`).join(', ')}\n` +
          `${EMOJI_DOT} **Moderator:** ${message.author.tag}`
        ));

      message.reply({ components: [container], flags: 32768 }).catch(() => {});
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
