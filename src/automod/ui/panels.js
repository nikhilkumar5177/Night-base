const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { EMOJI_TOOL, EMOJI_DOT, EMOJI_INFO, EMOJI_ACTIVE, EMOJI_INACTIVE, EMOJI_WARN, EMOJI_BYPASS, FOOTER_TEXT, EMOJI_ARROW } = require('../../utils/constants');

/**
 * Create a generic category panel.
 * @param {string} category 
 * @param {object} config 
 * @returns {object} { components }
 */
function createCategoryPanel(category, config) {
  const c = category.toLowerCase();
  const categoryData = c === 'escalation' ? config.escalation : config.modules[c];
  const isEnabled = categoryData.enabled;

  const container = new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} ${category.charAt(0).toUpperCase() + category.slice(1)} Module`))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `Manage detailed settings and exemptions for **${category}**.`
    ))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${EMOJI_INFO} **Status:** ${isEnabled ? `${EMOJI_ACTIVE} \`Enabled\`` : `${EMOJI_INACTIVE} \`Disabled\``}\n` +
      (c === 'escalation' ? `${EMOJI_WARN} **Steps:** \`${categoryData.steps?.length || 0}\` configured thresholds` : 
      `${EMOJI_WARN} **Actions:** ${categoryData.actions?.length ? categoryData.actions.map(a => `\`${a.toUpperCase()}\``).join(', ') : '`None`'}\n` +
      `${EMOJI_BYPASS} **Exemptions:** Roles: \`${categoryData.exemptRoles?.length || 0}\` ${EMOJI_ARROW} Channels: \`${categoryData.exemptChannels?.length || 0}\``)
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
    details = `${EMOJI_DOT} Blocked Words: \`${data.blockedWords.length}\` (Whole) ${EMOJI_ARROW} \`${data.partialBlockedWords?.length || 0}\` (Partial)\n${EMOJI_DOT} Caps Limit: \`${data.capsLimit}%\`\n${EMOJI_DOT} Emoji Limit: \`${data.emojiLimit}\`\n${EMOJI_DOT} Ghost Ping: \`${data.ghostPing ? 'Yes' : 'No'}\``;
  } else if (c === 'security') {
    details = `${EMOJI_DOT} Anti-Nuke: \`${data.antiNuke ? 'Yes' : 'No'}\` (Limit: \`${data.nukeThreshold}\` actions)\n${EMOJI_DOT} Anti-Webhook: \`${data.antiWebhook ? 'Yes' : 'No'}\`${data.webhookWhitelist?.length ? ` (Whitelisted: \`${data.webhookWhitelist.length}\` IDs)` : ''}`;
  } else if (c === 'escalation') {
    details = data.steps?.map(step => `${EMOJI_DOT} \`${step.warns} Warns\` \u2192 \`${step.action.toUpperCase()}\`${step.duration ? ` (\`${step.duration}\`)` : ''}`).join('\n');
  }

  return details || '`No data available`';
}

module.exports = { createCategoryPanel };
