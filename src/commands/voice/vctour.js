const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { EMOJI_SUCCESS, EMOJI_WARN, EMOJI_LOADING, EMOJI_DOT, EMOJI_ARROW } = require('../../utils/constants');
const { resolveMember } = require('../../utils/resolver');
const { cv2Error } = require('../../utils/messageHelper');

// Global tracker for active tours to allow stopping them
if (!global.activeVCTours) global.activeVCTours = new Set();

module.exports = {
  name: 'vctour',
  aliases: ['tour'],
  description: 'Move a user or your VC group through all visible VCs in a loop (Owner Only)',
  usage: 'vctour [@user] | vctour stop',
  cooldown: 5,
  enabled: true,
  devOnly: true,
  execute: async (client, message, args) => {
    try {
      // Handle stop command
      if (args[0]?.toLowerCase() === 'stop') {
        if (!global.activeVCTours.has(message.guild.id)) {
          const warnContainer = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_WARN} **No active VC tour found in this server.**`));
          return message.reply({ components: [warnContainer], flags: 32768 });
        }
        global.activeVCTours.delete(message.guild.id);
        const stopContainer = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} **VC Tour stopped.**`));
        return message.reply({ components: [stopContainer], flags: 32768 });
      }

      // Check if already running
      if (global.activeVCTours.has(message.guild.id)) {
        const warnContainer = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_WARN} **A VC tour is already running.** Use \`!vctour stop\` to end it.`));
        return message.reply({ components: [warnContainer], flags: 32768 });
      }

      const target = await resolveMember(message.guild, args[0]);
      if (!target) {
        return message.reply({ components: [cv2Error('Please specify a user to start a tour.')], flags: 32768 });
      }

      if (!target.voice.channel) {
        return message.reply({ components: [cv2Error(`**${target.user.tag}** is not in a voice channel.`)], flags: 32768 });
      }

      let members = [target];

      const otherChannels = Array.from(message.guild.channels.cache
        .filter(c => c.isVoiceBased() && c.permissionsFor(message.guild.members.me).has('Connect'))
        .sort((a, b) => a.position - b.position)
        .values());

      if (otherChannels.length < 2) {
        const warnContainer = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_WARN} **Need at least 2 accessible voice channels for a tour.**`));
        return message.reply({ components: [warnContainer], flags: 32768 });
      }

      const startContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} VC Tour`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${EMOJI_LOADING} **Starting 2-minute VC tour loop...**\n` +
          `${EMOJI_DOT} **Target:** ${target.user.tag}\n` +
          `${EMOJI_DOT} **Channels:** ${otherChannels.length}\n\nUse \`!vctour stop\` to end it early.`
        ));

      const statusMsg = await message.reply({ components: [startContainer], flags: 32768 }).catch(() => {});

      global.activeVCTours.add(message.guild.id);
      const startTime = Date.now();
      const duration = 120000; // 2 minutes
      let channelIndex = 0;

      while (Date.now() - startTime < duration && global.activeVCTours.has(message.guild.id)) {
        const nextChannel = otherChannels[channelIndex];

        // Move all members in the tour
        await Promise.allSettled(members.map(m => m.voice.setChannel(nextChannel, `VC Tour (Extreme Loop)`)));

        // Update index for next iteration
        channelIndex = (channelIndex + 1) % otherChannels.length;

        // Update status occasionally
        if (channelIndex === 0) {
          const remaining = Math.round((duration - (Date.now() - startTime)) / 1000);
          const updateContainer = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} VC Tour`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
              `${EMOJI_LOADING} **Touring...** Time remaining: **${remaining}s**`
            ));
          statusMsg.edit({ components: [updateContainer] }).catch(() => {});
        }

        // Minimal delay to prevent instant API exhaustion while maintaining "non-stop" feel
        await new Promise(r => setTimeout(r, 300)); 
      }

      global.activeVCTours.delete(message.guild.id);

      const endContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Tour Finished`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} **The VC tour loop has concluded.**`));

      await statusMsg.edit({ components: [endContainer] }).catch(() => {});

    } catch (error) {
      global.activeVCTours.delete(message.guild.id);
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
