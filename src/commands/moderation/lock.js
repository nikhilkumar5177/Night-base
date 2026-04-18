const { EmbedBuilder, ChannelType, PermissionsBitField } = require('discord.js')

const SEP = '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501'

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
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor('#ED4245')
              .setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() })
              .setDescription('{EMOJI_ERROR} You need **ManageChannels** permission.')
              .setTimestamp()
          ]
        })
      }

      if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor('#ED4245')
              .setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() })
              .setDescription('{EMOJI_ERROR} I need **ManageChannels** permission.')
              .setTimestamp()
          ]
        })
      }

      const channel =
        message.mentions.channels.first() ||
        message.guild.channels.cache.get(args[0]) ||
        message.channel

      if (channel.type !== ChannelType.GuildText) {
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor('#ED4245')
              .setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() })
              .setDescription('{EMOJI_ERROR} Can only lock text channels.')
              .setTimestamp()
          ]
        })
      }

      const reason =
        channel.id === message.channel.id
          ? args.join(' ')
          : args.slice(1).join(' ')

      const load = await message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('#EB459E')
            .setAuthor({ name: 'Wild Wolf │ Processing', iconURL: client.user.displayAvatarURL() })
            .setDescription(`${SEP}\n{EMOJI_LOADING} Locking channel...\n${SEP}`)
            .setTimestamp()
        ]
      })

      await channel.permissionOverwrites.edit(
        message.guild.roles.everyone,
        { SendMessages: false }
      )

      await new Promise(r => setTimeout(r, 300))

      await load.delete().catch(() => { })

      await message.react('{EMOJI_LOCK}').catch(() => { })

    } catch (error) {
      message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('#ED4245')
            .setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() })
            .setDescription(`{EMOJI_ERROR} ${error.message}`)
            .setTimestamp()
        ]
      })
    }
  }
}