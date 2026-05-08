const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { EMOJI_DOT, FOOTER_TEXT } = require('../../utils/constants');
const { cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'vcstats',
  aliases: ['vcs', 'active', 'vccount'],
  description: 'Display active voice channels and stats',
  usage: 'vcstats',
  cooldown: 5,
  enabled: true,
  staffOnly: false,
  devOnly: false,
  premiumOnly: false,
  execute: async (client, message, args) => {
    try {
      const activeChannels = message.guild.channels.cache.filter(c => c.isVoiceBased() && c.members.size > 0);
      const totalMembers = activeChannels.reduce((acc, c) => acc + c.members.size, 0);

      const list = activeChannels.map(c => `${EMOJI_DOT} **${c.name}** \u2022 \`${c.members.size}\` members`).join('\n') || 'No active voice channels.';

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 VC Stats`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(list))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${EMOJI_DOT} **Total in VC:** \`${totalMembers}\` \u2022 **Active Channels:** \`${activeChannels.size}\``
        ))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));

      message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
    }
  }
};
