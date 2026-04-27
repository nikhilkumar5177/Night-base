const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SectionBuilder, ThumbnailBuilder, MessageFlags } = require('discord.js');
const { EMOJI_SUCCESS, EMOJI_WARN, EMOJI_LOADING, EMOJI_DOT, FOOTER_TEXT } = require('../../utils/constants');
const { resolveMember } = require('../../utils/resolver');
const { sendUsage, cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'unmute',
  aliases: ['untimeout', 'uto'],
  description: 'Remove timeout from a user',
  usage: 'unmute <user>',
  cooldown: 3,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('ModerateMembers')) {
        return message.reply({ components: [cv2Error('You need **ModerateMembers** permission.')], flags: MessageFlags.IsComponentsV2 });
      }
      if (!message.guild.members.me.permissions.has('ModerateMembers')) {
        return message.reply({ components: [cv2Error('I need **ModerateMembers** permission.')], flags: MessageFlags.IsComponentsV2 });
      }
      const target = await resolveMember(message.guild, args[0]);
      if (!target) {
        return sendUsage(message, module.exports);
      }
      if (!target.isCommunicationDisabled()) {
        const warnContainer = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_WARN} **This user is not currently timed out.**`));
        return message.reply({ components: [warnContainer], flags: MessageFlags.IsComponentsV2 });
      }

      const loadContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_LOADING} **Removing timeout...**`));
      const sent = await message.reply({ components: [loadContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => {});

      await target.timeout(null);
      await new Promise(r => setTimeout(r, 400));

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Timeout Removed`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(new SectionBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${EMOJI_SUCCESS} **User timeout has been removed.**\n` +
            `${EMOJI_DOT} **User:** ${target.user.tag} \`${target.id}\`\n` +
            `${EMOJI_DOT} **Moderator:** ${message.author.tag}`
          ))
          .setThumbnailAccessory(new ThumbnailBuilder().setURL(target.user.displayAvatarURL({ dynamic: true })))
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));

      await sent.edit({ components: [container] }).catch(() => {});
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
    }
  }
};
