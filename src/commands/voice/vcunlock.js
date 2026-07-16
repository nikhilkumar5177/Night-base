const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, PermissionsBitField } = require('discord.js');
const { EMOJI_SUCCESS, EMOJI_DOT } = require('../../utils/constants');
const { cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'vcunlock',
  aliases: ['vcul'],
  description: 'Unlock a voice channel',
  usage: 'vcunlock [#channel]',
  cooldown: 5,
  enabled: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      const channel = message.mentions.channels.first() || message.member.voice.channel;
      if (!channel || !channel.isVoiceBased()) {
        return message.reply({ components: [cv2Error('Please mention a voice channel or join one.')], flags: 32768 });
      }
      if (!channel.permissionsFor(message.guild.members.me).has('ManageRoles')) {
        return message.reply({ components: [cv2Error('I need **ManageRoles** permission for this channel.')], flags: 32768 });
      }

      await channel.permissionOverwrites.edit(message.guild.roles.everyone, { Connect: null }).catch(() => {});

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 VC Unlocked`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${EMOJI_SUCCESS} **Voice channel has been unlocked.**\n` +
          `${EMOJI_DOT} **Channel:** ${channel}\n` +
          `${EMOJI_DOT} **Moderator:** ${message.author.tag}`
        ));

      message.reply({ components: [container], flags: 32768 }).catch(() => {});
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
