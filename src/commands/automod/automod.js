const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getConfig, saveConfig, resetConfig } = require('../../automod/database');
const { createDashboard } = require('../../automod/ui/dashboard');
const { createCategoryPanel } = require('../../automod/ui/panels');
const { createSpamModal, createLinkModal, createContentModal, createRaidModal, createSecurityModal, createGlobalModal } = require('../../automod/ui/modals');
const { SEP, EMOJI_ERROR } = require('../../utils/constants');

module.exports = {
  name: 'automod',
  slash: true,
  description: 'Premium AutoModeration system with advanced filtering and security features.',
  usage: 'automod',
  category: 'security',
  details: 'Configure advanced protection for your server. Support modules include Spam, Links, Raid, Content Filtering (Caps/Emojis/GhostPings), and Security (Anti-Nuke/Anti-Webhook).\n\n**Setup Instructions:**\n1. Use `/automod` to open the dashboard.\n2. Select a category from the dropdown.\n3. Configure actions (delete, warn, mute, kick, ban).\n4. Set a custom response message using placeholders:\n   - `{user}`: Mentions the violator.\n   - `{violation}`: Displays the rule triggered.',
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Configure Wild Wolf AutoModeration system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  staffOnly: true,
  devOnly: false,
  cooldown: 5,
  enabled: true,

  execute: async (client, interaction, args) => {
    try {
      const guildId = interaction.guildId;
      const config = { ...(await getConfig(guildId)), clientAvatar: client.user.displayAvatarURL() };

      // Initial Command Call (Slash Only)
      if (interaction.isChatInputCommand && interaction.isChatInputCommand()) {
        const dashboard = createDashboard(config);
        return interaction.reply({ ...dashboard, ephemeral: true }).catch(() => {});
      }

      // Handle Button Interactions
      if (interaction.isButton && interaction.isButton()) {
        const customId = interaction.customId;

        if (customId === 'automod_home') {
          const dashboard = createDashboard(config);
          return interaction.update({ ...dashboard });
        }

        if (customId === 'automod_toggle_main') {
          config.enabled = !config.enabled;
          await saveConfig(guildId, config);
          const dashboard = createDashboard(config);
          return interaction.update({ ...dashboard });
        }

        if (customId.startsWith('automod_toggle_')) {
          const moduleName = customId.split('_')[2];
          if (config.modules[moduleName]) {
            config.modules[moduleName].enabled = !config.modules[moduleName].enabled;
            await saveConfig(guildId, config);
            const panel = createCategoryPanel(moduleName.charAt(0).toUpperCase() + moduleName.slice(1), config);
            return interaction.update({ ...panel });
          }
        }

        if (customId.startsWith('automod_edit_')) {
          const moduleName = customId.split('_')[2];
          let modal;
          switch (moduleName) {
            case 'spam': modal = createSpamModal(config.modules.spam); break;
            case 'links': modal = createLinkModal(config.modules.links); break;
            case 'content': modal = createContentModal(config.modules.content); break;
            case 'raid': modal = createRaidModal(config.modules.raid); break;
            case 'security': modal = createSecurityModal(config.modules.security); break;
          }
          if (modal) return interaction.showModal(modal);
        }

        if (customId === 'automod_global_settings') {
          const modal = createGlobalModal(config);
          return interaction.showModal(modal);
        }

        if (customId === 'automod_dismiss') {
          return interaction.message.delete().catch(() => {});
        }

        if (customId === 'automod_reset') {
          await resetConfig(guildId);
          const dashboard = createDashboard(await getConfig(guildId));
          return interaction.update({ ...dashboard });
        }
      }

      // Handle Select Menu
      if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'automod_category_select') {
          const category = interaction.values[0];
          const panel = createCategoryPanel(category, config);
          return interaction.update({ ...panel });
        }
      }

      // Handle Modal Submits
      if (interaction.isModalSubmit()) {
        if (interaction.customId === 'automod_modal_spam') {
          config.modules.spam.limit = parseInt(interaction.fields.getTextInputValue('spam_limit')) || config.modules.spam.limit;
          config.modules.spam.window = parseInt(interaction.fields.getTextInputValue('spam_window')) || config.modules.spam.window;

          // Handle actions as array
          const rawActions = interaction.fields.getTextInputValue('spam_punishment').toLowerCase();
          config.modules.spam.actions = rawActions.split(',').map(a => a.trim()).filter(a => ['delete', 'warn', 'mute', 'kick', 'ban'].includes(a));

          config.modules.spam.responseMessage = interaction.fields.getTextInputValue('response_message') || null;

          await saveConfig(guildId, config);
          const panel = createCategoryPanel('spam', config);
          return interaction.update({ ...panel });
        }

        if (interaction.customId === 'automod_modal_links') {
          config.modules.links.allowedLinks = interaction.fields.getTextInputValue('allowed_links').split('\n').map(l => l.trim()).filter(l => l !== '');
          
          const gifInput = interaction.fields.getTextInputValue('allowed_gifs').split('\n').map(l => l.trim()).filter(l => l !== '');
          config.modules.links.allowedGifs = gifInput.filter(item => isNaN(item) || item.includes('.'));
          config.modules.links.exemptGifsRoles = gifInput.filter(item => !isNaN(item) && item.length >= 17);

          const rawActions = interaction.fields.getTextInputValue('link_punishment').toLowerCase();
          config.modules.links.actions = rawActions.split(',').map(a => a.trim()).filter(a => ['delete', 'warn', 'mute', 'kick', 'ban'].includes(a));

          const toggles = interaction.fields.getTextInputValue('link_toggles').toLowerCase();
          config.modules.links.antiInvite = toggles.includes('invite: yes');
          config.modules.links.antiPhishing = toggles.includes('phish: yes');
          config.modules.links.antiGifs = toggles.includes('gifs: yes');

          config.modules.links.responseMessage = interaction.fields.getTextInputValue('response_message') || null;

          await saveConfig(guildId, config);
          const panel = createCategoryPanel('links', config);
          return interaction.update({ ...panel });
        }

        if (interaction.customId === 'automod_modal_content') {
          config.modules.content.blockedWords = interaction.fields.getTextInputValue('blocked_words').split(',').map(w => w.trim()).filter(w => w !== '');
          config.modules.content.partialBlockedWords = interaction.fields.getTextInputValue('partial_words').split(',').map(w => w.trim()).filter(w => w !== '');
          
          const limits = interaction.fields.getTextInputValue('content_limits').toLowerCase();
          config.modules.content.capsLimit = parseInt(limits.match(/caps:\s*(\d+)/)?.[1]) || config.modules.content.capsLimit;
          config.modules.content.emojiLimit = parseInt(limits.match(/emojis:\s*(\d+)/)?.[1]) || config.modules.content.emojiLimit;

          const rawActions = interaction.fields.getTextInputValue('content_punishment').toLowerCase();
          config.modules.content.actions = rawActions.split(',').map(a => a.trim()).filter(a => ['delete', 'warn', 'mute', 'kick', 'ban'].includes(a));

          config.modules.content.responseMessage = interaction.fields.getTextInputValue('response_message') || null;

          await saveConfig(guildId, config);
          const panel = createCategoryPanel('content', config);
          return interaction.update({ ...panel });
        }

        if (interaction.customId === 'automod_modal_raid') {
          config.modules.raid.joinLimit = parseInt(interaction.fields.getTextInputValue('raid_limit')) || config.modules.raid.joinLimit;
          config.modules.raid.window = parseInt(interaction.fields.getTextInputValue('raid_window')) || config.modules.raid.window;

          const rawActions = interaction.fields.getTextInputValue('raid_punishment').toLowerCase();
          config.modules.raid.actions = rawActions.split(',').map(a => a.trim()).filter(a => ['kick', 'ban'].includes(a));

          await saveConfig(guildId, config);
          const panel = createCategoryPanel('raid', config);
          return interaction.update({ ...panel });
        }

        if (interaction.customId === 'automod_modal_security') {
          config.modules.security.minAccountAge = parseInt(interaction.fields.getTextInputValue('security_age')) || config.modules.security.minAccountAge;

          const rawActions = interaction.fields.getTextInputValue('security_punishment').toLowerCase();
          config.modules.security.actions = rawActions.split(',').map(a => a.trim()).filter(a => ['delete', 'warn', 'mute', 'kick', 'ban'].includes(a));

          await saveConfig(guildId, config);
          const panel = createCategoryPanel('security', config);
          return interaction.update({ ...panel });
        }

        if (interaction.customId === 'automod_modal_global') {
          config.logChannel = interaction.fields.getTextInputValue('global_log_channel') || null;
          config.bypassRoles = interaction.fields.getTextInputValue('global_bypass_roles').split('\n').filter(id => id.trim() !== '');
          config.bypassUsers = interaction.fields.getTextInputValue('global_bypass_users').split('\n').filter(id => id.trim() !== '');

          await saveConfig(guildId, config);
          const dashboard = createDashboard(config);
          return interaction.update({ ...dashboard });
        }
      }
    } catch (error) {
      console.error('AutoMod Command Error:', error);
      const errorEmbed = new EmbedBuilder()
        .setColor('#ED4245')
        .setAuthor({ name: 'Wild Wolf \u2502 Error', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n${EMOJI_ERROR} **An error occurred:** \`${error.message}\`\n${SEP}`);

      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ embeds: [errorEmbed], ephemeral: true }).catch(() => { });
      } else if (interaction.isRepliable()) {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => { });
      }
    }
  }
};
