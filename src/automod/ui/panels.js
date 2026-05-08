const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { EMOJI_TOOL, EMOJI_DOT, EMOJI_INFO, EMOJI_ACTIVE, EMOJI_INACTIVE, EMOJI_WARN, EMOJI_BYPASS, FOOTER_TEXT } = require('../../utils/constants');

/**
 * Create a generic category panel.
 * @param {string} category 
 * @param {object} config 
 * @returns {object} { components }
 */
function createCategoryPanel(category, config) {
  // Special handling for Escalation (not under config.modules)
  if (category.toLowerCase() === 'escalation') {
    return createEscalationPanel(config);
  }

  const categoryData = config.modules[category.toLowerCase()];
  const isEnabled = categoryData.enabled;

  const container = new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 ${category.charAt(0).toUpperCase() + category.slice(1)} Module`))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `Manage detailed settings and exemptions for **${category}**.`
    ))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${EMOJI_INFO} **Status:** ${isEnabled ? `${EMOJI_ACTIVE} \`Enabled\`` : `${EMOJI_INACTIVE} \`Disabled\``}\n` +
      `${EMOJI_WARN} **Actions:** ${categoryData.actions?.length ? categoryData.actions.map(a => `\`${a.toUpperCase()}\``).join(', ') : '`None`'}\n` +
      `${EMOJI_BYPASS} **Exemptions:** Roles: \`${categoryData.exemptRoles.length}\` \u2502 Channels: \`${categoryData.exemptChannels.length}\``
    ))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${EMOJI_TOOL} **Module Settings**\n` + formatConfig(category, categoryData)
    ))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`automod_toggle_${category.toLowerCase()}`)
      .setLabel(isEnabled ? 'Disable Module' : 'Enable Module')
      .setStyle(isEnabled ? ButtonStyle.Danger : ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`automod_edit_${category.toLowerCase()}`)
      .setLabel('Edit Settings')
      .setEmoji(EMOJI_TOOL)
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('automod_home')
      .setLabel('Back')
      .setStyle(ButtonStyle.Secondary)
  );

  return { 
    components: [container, buttons] 
  };
}

function createEscalationPanel(config) {
  const esc = config.escalation || { enabled: true, steps: [] };

  const stepsText = esc.steps && esc.steps.length > 0
    ? esc.steps.map((s, i) =>
        `${EMOJI_DOT} **Step ${i + 1}:** \`${s.warns}\` warns \u2192 \`${s.action.toUpperCase()}\`${s.duration ? ` for \`${s.duration}\`` : ''}`
      ).join('\n')
    : '`No steps configured`';

  const container = new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Escalation`))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `Automatically escalate punishments based on accumulated warnings.`
    ))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${EMOJI_INFO} **Status:** ${esc.enabled ? `${EMOJI_ACTIVE} \`Enabled\`` : `${EMOJI_INACTIVE} \`Disabled\``}`
    ))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${EMOJI_TOOL} **Escalation Steps**\n${stepsText}`
    ))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('automod_toggle_escalation')
      .setLabel(esc.enabled ? 'Disable Escalation' : 'Enable Escalation')
      .setStyle(esc.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('automod_edit_escalation')
      .setLabel('Edit Steps')
      .setEmoji(EMOJI_TOOL)
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('automod_home')
      .setLabel('Back')
      .setStyle(ButtonStyle.Secondary)
  );

  return { components: [container, buttons] };
}

function formatConfig(category, data) {
  let details = '';
  const c = category.toLowerCase();
  
  if (c === 'spam') {
    details = `${EMOJI_DOT} Threshold: \`${data.limit}\` msgs in \`${data.window}\`s\n${EMOJI_DOT} Duplicates: \`${data.duplicateDetection ? 'Yes' : 'No'}\``;
  } else if (c === 'links') {
    details = `${EMOJI_DOT} Invites: \`${data.antiInvite ? 'Blocked' : 'Allowed'}\`\n${EMOJI_DOT} Phishing: \`${data.antiPhishing ? 'Blocked' : 'Allowed'}\`\n${EMOJI_DOT} GIFs: \`${data.antiGifs ? 'Blocked' : 'Allowed'}\` (\`${data.allowedGifs?.length || 0}\` links, \`${data.exemptGifsRoles?.length || 0}\` roles)\n${EMOJI_DOT} Allowed Links: \`${data.allowedLinks.length}\` domains`;
  } else if (c === 'raid') {
    details = `${EMOJI_DOT} Join Limit: \`${data.joinLimit}\` per \`${data.window}\`s\n${EMOJI_DOT} Min Age: \`${data.minAccountAge}\` days`;
  } else if (c === 'content') {
    details = `${EMOJI_DOT} Blocked Words: \`${data.blockedWords.length}\` (Whole) \u2502 \`${data.partialBlockedWords?.length || 0}\` (Partial)\n${EMOJI_DOT} Caps Limit: \`${data.capsLimit}%\`\n${EMOJI_DOT} Emoji Limit: \`${data.emojiLimit}\`\n${EMOJI_DOT} Ghost Ping: \`${data.ghostPing ? 'Yes' : 'No'}\``;
  } else if (c === 'security') {
    details = `${EMOJI_DOT} Anti-Nuke: \`${data.antiNuke ? 'Yes' : 'No'}\` (Limit: \`${data.nukeThreshold}\` actions)\n${EMOJI_DOT} Anti-Webhook: \`${data.antiWebhook ? 'Yes' : 'No'}\``;
  }

  return details || '`No data available`';
}

module.exports = { createCategoryPanel };
