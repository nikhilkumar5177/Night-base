const { EmbedBuilder, ChannelType } = require('discord.js');

const SEP = '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501';

module.exports = {
  name: 'lock',
  aliases: ['lockdown'],
  description: 'Lock a channel to prevent messages',
  usage: 'lock [#channel] [reason]',
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
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription('{EMOJI_ERROR} Can only lock text channels.').setTimestamp()] });
      }

      const reason = channel.id === message.channel.id ? args.join(' ') : args.slice(1).join(' ');
      const loadEmbed = new EmbedBuilder().setColor('#EB459E').setAuthor({ name: 'Wild Wolf \u2502 Processing', iconURL: client.user.displayAvatarURL() }).setDescription(`${SEP}\n{EMOJI_LOADING} **Locking channel...**\n${SEP}`).setTimestamp();
      const sent = await message.channel.send({ embeds: [loadEmbed] });

      await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
      await new Promise(r => setTimeout(r, 300));

      const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setAuthor({ name: 'Wild Wolf \u2502 Channel Locked', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n{EMOJI_SUCCESS} **Channel has been locked.**\n${SEP}`)
        .addFields(
          { name: '\u25B8 Channel', value: `${channel}`, inline: true },
          { name: '\u25B8 Moderator', value: message.author.tag, inline: true },
          { name: '\u25B8 Reason', value: reason || 'No reason provided' }
        )
        .setFooter({ text: 'Wild Wolf \u2022 Members cannot send messages', iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
      await sent.edit({ embeds: [embed] });

      if (channel.id !== message.channel.id) {
        channel.send({ embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf \u2502 Locked', iconURL: client.user.displayAvatarURL() }).setDescription(`${SEP}\n\uD83D\uDD12 **This channel has been locked by ${message.author.tag}.**\n${reason ? `\n\u25AA **Reason:** ${reason}` : ''}\n${SEP}`).setTimestamp()] });
      }
    } catch (error) {
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`{EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
