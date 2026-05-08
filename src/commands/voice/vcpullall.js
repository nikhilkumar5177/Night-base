const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { EMOJI_SUCCESS, EMOJI_WARN, EMOJI_LOADING, EMOJI_OWNER, EMOJI_DOT } = require('../../utils/constants');
const { cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'vcpullall',
  aliases: ['pullall', 'dragall'],
  description: 'Pull everyone into your voice channel (Owner Only)',
  usage: 'vcpullall',
  cooldown: 10,
  enabled: true,
  staffOnly: false,
  devOnly: true,
  premiumOnly: false,
  execute: async (client, message, args) => {
    try {
      if (message.author.id !== message.guild.ownerId && message.author.id !== process.env.DEV_ID) {
        return message.reply({ components: [cv2Error('Only the server owner can use this command.')], flags: 32768 });
      }

      const channel = message.member.voice.channel;
      if (!channel) {
        return message.reply({ components: [cv2Error('You must be in a voice channel to pull people.')], flags: 32768 });
      }

      const allMembers = [];
      message.guild.channels.cache.filter(c => c.isVoiceBased() && c.id !== channel.id).forEach(c => {
        c.members.forEach(m => allMembers.push(m));
      });

      if (allMembers.length === 0) {
        const warnContainer = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_WARN} **No other users found in voice channels.**`));
        return message.reply({ components: [warnContainer], flags: 32768 });
      }

      const loadContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_LOADING} **Pulling ${allMembers.length} members into ${channel}...**`));
      const statusMsg = await message.reply({ components: [loadContainer], flags: 32768 }).catch(() => {});

      let count = 0;
      for (const member of allMembers) {
        try {
          await member.voice.setChannel(channel, `Pulled by ${message.author.tag}`);
          count++;
        } catch (e) { }
      }

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Mass Pull`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${EMOJI_SUCCESS} **Pulled ${count} members.**\n` +
          `${EMOJI_DOT} **Channel:** ${channel}\n` +
          `${EMOJI_DOT} **Moderator:** ${message.author.tag}`
        ));

      statusMsg.edit({ components: [container] }).catch(() => {});
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
