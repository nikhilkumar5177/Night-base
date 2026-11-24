const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const storage = require('../../utils/storageManager');
const { getConfig, saveConfig } = require('../../automod/database');
const { EMOJI_SUCCESS, EMOJI_WARN, EMOJI_INFO, EMOJI_DOT, EMOJI_ARROW } = require('../../utils/constants');
const { cv2Error, safeReply, safeUpdate } = require('../../utils/messageHelper');

function buildDashboard(client, securityConfig) {
  const container = new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Anti-Nuke Dashboard`))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${EMOJI_DOT} **Status:** ${securityConfig.enabled ? '\`● Enabled\`' : '\`○ Disabled\`'}\n` +
      `${EMOJI_DOT} **Threshold:** \`${securityConfig.nukeThreshold || 3} actions\`\n` +
      `${EMOJI_DOT} **Window:** \`${(securityConfig.nukeWindow || 10000) / 1000}s\`\n` +
      `${EMOJI_DOT} **Recent Events:** \`${(securityConfig.logs || []).length}\``
    ));

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('an_toggle').setLabel(securityConfig.enabled ? 'Disable' : 'Enable').setStyle(securityConfig.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
    new ButtonBuilder().setCustomId('an_config').setLabel('Configure Limits').setStyle(ButtonStyle.Primary)
  );

  container.addActionRowComponents(row);
  return container;
}

module.exports = {
  name: 'antinuke',
  aliases: ['security'],
  description: 'Manage anti-nuke system via interactive dashboard',
  usage: 'antinuke',
  cooldown: 5,
  enabled: true,
  devOnly: false,
  execute: async (client, target, args) => {
    try {
      const authorId = target.author ? target.author.id : target.user.id;
      const guild = target.guild;

      const isDev = client.devIds ? client.devIds.has(authorId) : (process.env.DEV_ID || '').split(',').includes(authorId);
      if (authorId !== guild.ownerId && !isDev) {
        return safeReply(target, { components: [cv2Error('Only the server owner or devs can configure anti-nuke.')], ephemeral: true });
      }
      
      const securityConfig = storage.read('security.json');
      if (!securityConfig.nukeThreshold) securityConfig.nukeThreshold = 3;
      if (!securityConfig.nukeWindow) securityConfig.nukeWindow = 10000;

      const isInteraction = !!target.customId || !!target.isCommand;

      if (isInteraction && target.isMessageComponent && target.isMessageComponent()) {
        const customId = target.customId;

        if (customId === 'an_toggle') {
          securityConfig.enabled = !securityConfig.enabled;
          storage.write('security.json', securityConfig);
          if (guild) {
            const autoModCfg = await getConfig(guild.id);
            if (!autoModCfg.modules.security) autoModCfg.modules.security = {};
            autoModCfg.modules.security.enabled = securityConfig.enabled;
            autoModCfg.modules.security.antiNuke = securityConfig.enabled;
            await saveConfig(guild.id, autoModCfg);
          }
          return safeUpdate(target, { components: [buildDashboard(client, securityConfig)] });
        }

        if (customId === 'an_config') {
          const modal = new ModalBuilder().setCustomId('an_modal_config').setTitle('Configure Anti-Nuke Limits');
          const thresholdInput = new TextInputBuilder().setCustomId('threshold').setLabel('Max Actions').setStyle(TextInputStyle.Short).setValue(securityConfig.nukeThreshold.toString()).setRequired(true);
          const windowInput = new TextInputBuilder().setCustomId('window').setLabel('Time Window (ms)').setStyle(TextInputStyle.Short).setValue(securityConfig.nukeWindow.toString()).setRequired(true);
          modal.addComponents(new ActionRowBuilder().addComponents(thresholdInput), new ActionRowBuilder().addComponents(windowInput));
          return target.showModal(modal);
        }
      }

      if (isInteraction && target.isModalSubmit && target.isModalSubmit()) {
        const customId = target.customId;

        if (customId === 'an_modal_config') {
          const threshold = parseInt(target.fields.getTextInputValue('threshold').trim());
          const window = parseInt(target.fields.getTextInputValue('window').trim());

          if (isNaN(threshold) || threshold < 1) return safeReply(target, { components: [cv2Error('Invalid threshold (must be number >= 1)')], ephemeral: true });
          if (isNaN(window) || window < 1000) return safeReply(target, { components: [cv2Error('Invalid window (must be number >= 1000 ms)')], ephemeral: true });

          securityConfig.nukeThreshold = threshold;
          securityConfig.nukeWindow = window;
          storage.write('security.json', securityConfig);
          if (guild) {
            const autoModCfg = await getConfig(guild.id);
            if (!autoModCfg.modules.security) autoModCfg.modules.security = {};
            autoModCfg.modules.security.nukeThreshold = threshold;
            autoModCfg.modules.security.nukeWindow = window;
            await saveConfig(guild.id, autoModCfg);
          }
          return safeUpdate(target, { components: [buildDashboard(client, securityConfig)] });
        }
      }

      // Initial Command Invocation
      if (!isInteraction || (isInteraction && target.isCommand && target.isCommand())) {
        const container = buildDashboard(client, securityConfig);
        if (target.reply) {
          return safeReply(target, { components: [container] }).catch(() => {});
        }
      }

    } catch (error) {
      safeReply(target, { components: [cv2Error(error.message)], ephemeral: true }).catch(() => {});
    }
  }
};
