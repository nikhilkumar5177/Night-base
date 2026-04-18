const { EmbedBuilder, ChannelType } = require('discord.js');

const SEP = '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501';

module.exports = {
  name: 'unlock',
  aliases: ['unlockdown'],
  description: 'Unlock a channel to allow messages',
  usage: 'unlock [#channel]',
  cooldown: 3,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('ManageChannels')) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription('{EMOJI_ERROR} You need **ManageChannels** permission.').setTimestamp()] });
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
          return message.channel.send({ embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription('{EMOJI_ERROR} Can only unlock text channels.').setTimestamp()] });
        }
      }

      const channelList = Array.from(channels);

      for (const channel of channelList) {
        await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null }).catch(() => {});
        
        if (channel.id !== message.channel.id) {
          channel.send({ embeds: [new EmbedBuilder().setColor('#57F287').setAuthor({ name: 'Wild Wolf \u2502 Unlocked', iconURL: client.user.displayAvatarURL() }).setDescription(`${SEP}\n\uD83D\uDD13 **This channel has been unlocked by ${message.author.tag}.**\n${SEP}`).setTimestamp()] }).catch(() => {});
        }
        await new Promise(r => setTimeout(r, 200));
      }

      const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setAuthor({ name: 'Wild Wolf \u2502 Channel(s) Unlocked', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n{EMOJI_SUCCESS} **${channelList.length} channel(s) have been unlocked.**\n${SEP}`)
        .addFields(
          { name: '\u25B8 Channels', value: channelList.map(c => `${c}`).join(', '), inline: false },
          { name: '\u25B8 Moderator', value: message.author.tag, inline: true }
        )
        .setFooter({ text: 'Wild Wolf \u2022 Members can send messages again', iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
      message.channel.send({ embeds: [embed] });
    } catch (error) {
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`{EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
