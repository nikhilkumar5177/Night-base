const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const storage = require('../../utils/storageManager');
const { EMOJI_SUCCESS, EMOJI_WARN, EMOJI_INFO, EMOJI_DOT, EMOJI_ARROW } = require('../../utils/constants');
const { cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'antinuke',
  aliases: ['security'],
  description: 'Toggle anti-nuke system',
  usage: 'antinuke <on|off|config> [threshold] [window]',
  cooldown: 5,
  enabled: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (message.author.id !== message.guild.ownerId && message.author.id !== process.env.DEV_ID) {
        return message.reply({ components: [cv2Error('Only the server owner can configure anti-nuke.')], flags: 32768 });
      }
      const action = args[0]?.toLowerCase();
      const securityConfig = storage.read('security.json');

      if (action === 'on') {
        securityConfig.enabled = true;
        storage.write('security.json', securityConfig);
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Anti-Nuke`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} **Anti-nuke enabled.** Security monitoring is now active.`));
        return message.reply({ components: [container], flags: 32768 });
      }

      if (action === 'off') {
        securityConfig.enabled = false;
        storage.write('security.json', securityConfig);
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Anti-Nuke`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_WARN} **Anti-nuke disabled.** Security monitoring is off.`));
        return message.reply({ components: [container], flags: 32768 });
      }

      if (action === 'config') {
        const threshold = parseInt(args[1]) || securityConfig.nukeThreshold || 3;
        const window = parseInt(args[2]) || securityConfig.nukeWindow || 10000;
        securityConfig.nukeThreshold = threshold;
        securityConfig.nukeWindow = window;
        storage.write('security.json', securityConfig);
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Config Updated`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${EMOJI_SUCCESS} **Anti-nuke config updated.**\n` +
            `${EMOJI_DOT} **Threshold:** ${threshold} actions\n` +
            `${EMOJI_DOT} **Window:** ${window / 1000}s`
          ));
        return message.reply({ components: [container], flags: 32768 });
      }

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Anti-Nuke Status`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${EMOJI_DOT} **Status:** ${securityConfig.enabled ? '\`● Enabled\`' : '\`○ Disabled\`'}\n` +
          `${EMOJI_DOT} **Threshold:** \`${securityConfig.nukeThreshold || 3} actions\`\n` +
          `${EMOJI_DOT} **Window:** \`${(securityConfig.nukeWindow || 10000) / 1000}s\`\n` +
          `${EMOJI_DOT} **Events:** \`${(securityConfig.logs || []).length}\`\n\n` +
          `\`${client.config.prefix}antinuke on\` \u2022 Enable\n` +
          `\`${client.config.prefix}antinuke off\` \u2022 Disable\n` +
          `\`${client.config.prefix}antinuke config <threshold> <window_ms>\` \u2022 Configure`
        ));
      message.reply({ components: [container], flags: 32768 }).catch(() => {});
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
