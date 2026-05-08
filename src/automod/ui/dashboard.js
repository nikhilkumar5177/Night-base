const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { COLORS, EMOJI_SETTINGS, EMOJI_DOT, EMOJI_LIST, EMOJI_CHECK, EMOJI_CROSS, EMOJI_ACTIVE, EMOJI_INACTIVE, FOOTER_TEXT } = require('../../utils/constants');

/**
 * Create the main AutoMod dashboard.
 * @param {object} config 
 * @returns {object} { components }
 */
function createDashboard(config) {
  const container = new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 AutoMod Dashboard`))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `Welcome to the **Wild Wolf** advanced automoderation system. \n Configure protection rules to keep your server safe.`
    ))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${EMOJI_LIST} **Module Status**\n` + getModuleStatus(config)
    ))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${EMOJI_SETTINGS} **Global Settings**\n` +
      `${EMOJI_DOT} **Status:** ${config.enabled ? `${EMOJI_ACTIVE} \`Enabled\`` : `${EMOJI_INACTIVE} \`Disabled\``}\n` +
      `${EMOJI_DOT} **Log Channel:** ${config.logChannel ? `<#${config.logChannel}>` : '`Not Set`'}\n` +
      `${EMOJI_DOT} **Bypasses:** \`${config.bypassRoles.length}\` Roles, \`${config.bypassUsers.length}\` Users`
    ))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));

  const menu = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('automod_category_select')
      .setPlaceholder('Select a category to configure')
      .addOptions([
        { label: 'Spam Protection', value: 'spam', description: 'Prevent message spam and floods' },
        { label: 'Link Filter', value: 'links', description: 'Control external links and invites' },
        { label: 'Raid Protection', value: 'raid', description: 'Detect and prevent server raids' },
        { label: 'Content Filter', value: 'content', description: 'Filter words, caps, and ghost pings' },
        { label: 'Security & Anti-Nuke', value: 'security', description: 'Account age and safety checks' },
        { label: 'Escalation', value: 'escalation', description: 'Auto-escalation warn thresholds' }
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
      .setStyle(ButtonStyle.Secondary)
  );

  return {
    components: [container, buttons, menu]
  };
}

function getModuleStatus(config) {
  const modules = config.modules;
  const format = (key, name) => `${modules[key].enabled ? EMOJI_CHECK : EMOJI_CROSS} **${name}**`;

  return [
    `${format('spam', 'Spam')} \u2502 ${format('links', 'Links')}`,
    `${format('raid', 'Raid')} \u2502 ${format('content', 'Content')}`,
    `${format('security', 'Security')}`
  ].join('\n');
}

module.exports = { createDashboard };
