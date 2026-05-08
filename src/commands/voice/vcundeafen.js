const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { EMOJI_SUCCESS, EMOJI_DOT } = require('../../utils/constants');
const { resolveMember } = require('../../utils/resolver');
const { cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'vcundeafen',
  aliases: ['vud', 'undeafen'],
  description: 'Server-undeafen a user in voice',
  usage: 'vcundeafen <@user/id>',
  cooldown: 3,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  premiumOnly: false,
  execute: async (client, message, args) => {
    try {
      const target = await resolveMember(message.guild, args[0]);
      if (!target) {
        return message.reply({ components: [cv2Error('Please specify a user to undeafen.')], flags: 32768 });
      }
      if (!target.voice.channel) {
        return message.reply({ components: [cv2Error('That user is not in a voice channel.')], flags: 32768 });
      }
      if (target.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
        return message.reply({ components: [cv2Error('Target has a higher or equal role.')], flags: 32768 });
      }

      await target.voice.setDeaf(false, `Server-undeafened by ${message.author.tag}`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 VC Undeafen`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${EMOJI_SUCCESS} **User has been server-undeafened.**\n` +
          `${EMOJI_DOT} **User:** ${target.user.tag}\n` +
          `${EMOJI_DOT} **Moderator:** ${message.author.tag}`
        ));

      message.reply({ components: [container], flags: 32768 }).catch(() => {});
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
