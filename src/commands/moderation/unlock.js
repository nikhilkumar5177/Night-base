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
      const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]) || message.channel;
      if (channel.type !== ChannelType.GuildText) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription('{EMOJI_ERROR} Can only unlock text channels.').setTimestamp()] });
      }

      await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null });

      const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setAuthor({ name: 'Wild Wolf \u2502 Channel Unlocked', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n{EMOJI_SUCCESS} **Channel has been unlocked.**\n${SEP}`)
        .addFields(
          { name: '\u25B8 Channel', value: `${channel}`, inline: true },
          { name: '\u25B8 Moderator', value: message.author.tag, inline: true }
        )
        .setFooter({ text: 'Wild Wolf \u2022 Members can send messages again', iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
      message.channel.send({ embeds: [embed] });

      if (channel.id !== message.channel.id) {
        channel.send({ embeds: [new EmbedBuilder().setColor('#57F287').setAuthor({ name: 'Wild Wolf \u2502 Unlocked', iconURL: client.user.displayAvatarURL() }).setDescription(`${SEP}\n\uD83D\uDD13 **This channel has been unlocked by ${message.author.tag}.**\n${SEP}`).setTimestamp()] });
      }
    } catch (error) {
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`{EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
