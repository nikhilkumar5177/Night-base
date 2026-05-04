const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ChannelType, PermissionsBitField, MessageFlags } = require('discord.js');
const { EMOJI_SUCCESS, EMOJI_LOADING, EMOJI_LOCK } = require('../../utils/constants');
const { cv2Error, safeDelete } = require('../../utils/messageHelper');

module.exports = {
  name: 'lock',
  aliases: ['lockdown', 'lc'],
  description: 'Lock a channel to prevent messages',
  usage: 'lock [#channel] [reason]',
  cooldown: 3,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return message.reply({ components: [cv2Error('You need **ManageChannels** permission.')], flags: 32768 });
      }
      if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return message.reply({ components: [cv2Error('I need **ManageChannels** permission.')], flags: 32768 });
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
          return message.reply({ components: [cv2Error('Can only lock text channels.')], flags: 32768 });
        }
      }

      const channelList = Array.from(channels);

      const loadContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_LOADING} Locking ${channelList.length} channel(s)...`));
      const load = await message.reply({ components: [loadContainer], flags: 32768 });

      for (const channel of channelList) {
        await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false }).catch(() => { });
        await new Promise(r => setTimeout(r, 200));
      }

      await safeDelete(load);
      await message.react(EMOJI_LOCK).catch(() => { });

    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};