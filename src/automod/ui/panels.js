const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { COLORS, SEP, EMOJI_TOOL, EMOJI_DOT, EMOJI_INFO, EMOJI_ACTIVE, EMOJI_INACTIVE, EMOJI_WARN, EMOJI_BYPASS } = require('../../utils/constants');

/**
 * Create a generic category panel.
 * @param {string} category 
 * @param {object} config 
 * @returns {object} { embed, components }
 */
function createCategoryPanel(category, config) {
  const categoryData = config.modules[category.toLowerCase()];
  const isEnabled = categoryData.enabled;

  const embed = new EmbedBuilder()
    .setColor(isEnabled ? COLORS.SUCCESS : COLORS.ERROR)
    .setAuthor({ name: `Wild Wolf \u2502 ${category.charAt(0).toUpperCase() + category.slice(1)} Module`, iconURL: config.clientAvatar || '' })
    .setDescription(`${SEP}\nManage detailed settings and exemptions for **${category}**.\n${SEP}`)
    .addFields(
      { name: `${EMOJI_INFO} Status`, value: isEnabled ? `${EMOJI_ACTIVE} \`Enabled\`` : `${EMOJI_INACTIVE} \`Disabled\``, inline: true },
      { name: `${EMOJI_WARN} Actions`, value: categoryData.actions?.length ? categoryData.actions.map(a => `\`${a.toUpperCase()}\``).join(', ') : '`None`', inline: true },
      { name: `${EMOJI_BYPASS} Exemptions`, value: `${EMOJI_DOT} Roles: \`${categoryData.exemptRoles.length}\` \u2502 Channels: \`${categoryData.exemptChannels.length}\``, inline: false },
      { name: `${EMOJI_TOOL} Module Settings`, value: formatConfig(category, categoryData) }
    )
    .setTimestamp()
    .setFooter({ text: `Wild Wolf \u2022 ${category.toUpperCase()} Configuration` });

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
      .setLabel('Back to Dashboard')
      .setStyle(ButtonStyle.Secondary)
  );

  return { 
    embeds: [embed], 
    components: [buttons] 
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
    details = `${EMOJI_DOT} Blocked Words: \`${data.blockedWords.length}\` (Whole) \u2502 \`${data.partialBlockedWords?.length || 0}\` (Partial)\n${EMOJI_DOT} Caps Limit: \`${data.capsLimit}%\`\n${EMOJI_DOT} Emoji Limit: \`${data.emojiLimit}\`\n${EMOJI_DOT} Ghost Ping: \`${data.ghostPing ? 'Yes' : 'No'}\``;
  } else if (c === 'security') {
    details = `${EMOJI_DOT} Anti-Nuke: \`${data.antiNuke ? 'Yes' : 'No'}\` (Limit: \`${data.nukeThreshold}\` actions)\n${EMOJI_DOT} Anti-Webhook: \`${data.antiWebhook ? 'Yes' : 'No'}\``;
  }

  return details || '`No data available`';
}

module.exports = { createCategoryPanel };
