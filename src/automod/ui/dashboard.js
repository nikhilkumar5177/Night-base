const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { COLORS, resolveEmbedEmojis, SEP, EMOJI_SPAM, EMOJI_LINK, EMOJI_RAID, EMOJI_CONTENT, EMOJI_SECURITY, EMOJI_SETTINGS, EMOJI_DOT } = require('../../utils/constants');

/**
 * Create the main AutoMod dashboard.
 * @param {object} config 
 * @returns {object} { embeds, components }
 */
function createDashboard(config) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.DEFAULT)
    .setAuthor({ name: 'Wild Wolf \u2502 AutoMod Dashboard', iconURL: config.clientAvatar || '' }) // Avatar passed from command
    .setDescription(
      `${SEP}\n` +
      `Welcome to the **Wild Wolf** advanced automoderation system. ` +
      `Configure protection rules to keep your server safe.\n` +
      `${SEP}`
    )
    .addFields(
      { name: '{EMOJI_LIST} Module Status', value: getModuleStatus(config), inline: false },
      { name: '{EMOJI_SETTINGS} Global Settings', value: 
        `${EMOJI_DOT} **Status:** ${config.enabled ? '{EMOJI_ACTIVE} `Enabled`' : '{EMOJI_INACTIVE} `Disabled`'}\n` +
        `${EMOJI_DOT} **Log Channel:** ${config.logChannel ? `<#${config.logChannel}>` : '`Not Set`'}\n` +
        `${EMOJI_DOT} **Bypasses:** \`${config.bypassRoles.length}\` Roles, \`${config.bypassUsers.length}\` Users`,
        inline: false 
      }
    )
    .setTimestamp()
    .setFooter({ text: 'Wild Wolf \u2022 Advanced Protection System' });

  const menu = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('automod_category_select')
      .setPlaceholder('Select a category to configure')
      .addOptions([
        { label: 'Spam Protection', value: 'spam', description: 'Prevent message spam and floods' },
        { label: 'Link Filter', value: 'links', description: 'Control external links and invites' },
        { label: 'Raid Protection', value: 'raid', description: 'Detect and prevent server raids' },
        { label: 'Content Filter', value: 'content', description: 'Filter words, caps, and ghost pings' },
        { label: 'Security & Anti-Nuke', value: 'security', description: 'Account age and safety checks' }
      ])
  );

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('automod_toggle_main')
      .setLabel(config.enabled ? 'Disable System' : 'Enable System')
      .setStyle(config.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('automod_global_settings')
      .setLabel('Global Settings')
      .setEmoji(EMOJI_SETTINGS)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('automod_reset')
      .setLabel('Reset Defaults')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('automod_dismiss')
      .setLabel('Dismiss')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('\u2716')
  );

  return {
    embeds: [resolveEmbedEmojis(embed.toJSON())],
    components: [menu, buttons]
  };
}

function getModuleStatus(config) {
  const modules = config.modules;
  const format = (key, name) => `${modules[key].enabled ? '{EMOJI_CHECK}' : '{EMOJI_CROSS}'} **${name}**`;
  
  return [
    `${format('spam', 'Spam')} \u2502 ${format('links', 'Links')}`,
    `${format('raid', 'Raid')} \u2502 ${format('content', 'Content')}`,
    `${format('security', 'Security')}`
  ].join('\n');
}

module.exports = { createDashboard };
