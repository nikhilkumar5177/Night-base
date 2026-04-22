const { EmbedBuilder, ChannelType, PermissionsBitField } = require('discord.js')
const { SEP, EMOJI_SUCCESS, EMOJI_ERROR, EMOJI_LOADING, EMOJI_LOCK } = require('../../utils/constants');

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
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ED4245')
              .setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() })
              .setDescription(`${EMOJI_ERROR} You need **ManageChannels** permission.`)
              .setTimestamp()
          ]
        })
      }

      if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ED4245')
              .setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() })
              .setDescription(`${EMOJI_ERROR} I need **ManageChannels** permission.`)
              .setTimestamp()
          ]
        })
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
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#ED4245')
                .setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() })
                .setDescription(`${EMOJI_ERROR} Can only lock text channels.`)
                .setTimestamp()
            ]
          })
        }
      }

      const channelList = Array.from(channels);

      const load = await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#EB459E')
            .setAuthor({ name: 'Wild Wolf │ Processing', iconURL: client.user.displayAvatarURL() })
            .setDescription(`${SEP}\n${EMOJI_LOADING} Locking ${channelList.length} channel(s)...\n${SEP}`)
            .setTimestamp()
        ]
      })

      for (const channel of channelList) {
        await channel.permissionOverwrites.edit(
          message.guild.roles.everyone,
          { SendMessages: false }
        ).catch(() => { });
        await new Promise(r => setTimeout(r, 200));
      }

      await load.delete().catch(() => { })
      await message.react(EMOJI_LOCK).catch(() => { })

    } catch (error) {
      message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ED4245')
            .setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() })
            .setDescription(`${EMOJI_ERROR} ${error.message}`)
            .setTimestamp()
        ]
      })
    }
  }
}