const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { getConfig, saveConfig } = require('../../automod/database');
const { EMOJI_SUCCESS, EMOJI_WARN, EMOJI_INFO, EMOJI_DOT, EMOJI_ERROR } = require('../../utils/constants');
const { cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'webhookwhitelist',
  aliases: ['whwebhook', 'webhookwl', 'wwhitelist'],
  description: 'Manage whitelisted webhooks that bypass Anti-Webhook security checks',
  usage: 'webhookwhitelist <add|remove|list> [webhook_id]',
  cooldown: 3,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  premiumOnly: true,
  execute: async (client, message, args) => {
    try {
      const action = args[0]?.toLowerCase();
      const targetId = args[1]?.trim();

      const config = await getConfig(message.guild.id);
      if (!config.modules.security.whitelistedWebhooks) {
        config.modules.security.whitelistedWebhooks = [];
      }

      if (action === 'add') {
        if (!targetId || !/^\d{17,20}$/.test(targetId)) {
          return message.reply({ components: [cv2Error('Please provide a valid Webhook ID to add.')], flags: MessageFlags.IsComponentsV2 });
        }

        if (config.modules.security.whitelistedWebhooks.includes(targetId)) {
          return message.reply({ components: [cv2Error('This Webhook ID is already whitelisted.')], flags: MessageFlags.IsComponentsV2 });
        }

        config.modules.security.whitelistedWebhooks.push(targetId);
        await saveConfig(message.guild.id, config);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Webhook Whitelist`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${EMOJI_SUCCESS} **Webhook Whitelisted Successfully**\n` +
            `${EMOJI_DOT} **ID:** \`${targetId}\`\n\n` +
            `This webhook will now bypass all anti-webhook spam/malicious filters.`
          ));
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      if (action === 'remove' || action === 'delete') {
        if (!targetId || !/^\d{17,20}$/.test(targetId)) {
          return message.reply({ components: [cv2Error('Please provide a valid Webhook ID to remove.')], flags: MessageFlags.IsComponentsV2 });
        }

        if (!config.modules.security.whitelistedWebhooks.includes(targetId)) {
          return message.reply({ components: [cv2Error('This Webhook ID is not whitelisted.')], flags: MessageFlags.IsComponentsV2 });
        }

        config.modules.security.whitelistedWebhooks = config.modules.security.whitelistedWebhooks.filter(id => id !== targetId);
        await saveConfig(message.guild.id, config);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Webhook Whitelist`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${EMOJI_SUCCESS} **Webhook Removed Successfully**\n` +
            `${EMOJI_DOT} **ID:** \`${targetId}\`\n\n` +
            `This webhook will no longer bypass security filters.`
          ));
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      if (action === 'list' || !action) {
        const whitelisted = config.modules.security.whitelistedWebhooks;
        
        const listText = whitelisted.length > 0 
          ? whitelisted.map((id, index) => `\`${index + 1}.\` \`${id}\``).join('\n')
          : '*No webhooks are currently whitelisted.*';

        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Whitelisted Webhooks`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${EMOJI_INFO} **Active Whitelisted Webhooks:**\n${listText}\n\n` +
            `Use \`${client.config.prefix}webhookwhitelist add <id>\` to add\n` +
            `Use \`${client.config.prefix}webhookwhitelist remove <id>\` to remove`
          ));
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      return message.reply({ components: [cv2Error(`Unknown action. Use \`add\`, \`remove\`, or \`list\`.`)], flags: MessageFlags.IsComponentsV2 });

    } catch (error) {
      console.error(error);
      return message.reply({ components: [cv2Error(error.message)], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
