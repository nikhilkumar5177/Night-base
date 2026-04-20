const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

/**
 * Create a modal for Spam Protection configuration.
 */
function createSpamModal(config) {
  const modal = new ModalBuilder()
    .setCustomId('automod_modal_spam')
    .setTitle('Spam Protection Settings');

  const limitInput = new TextInputBuilder()
    .setCustomId('spam_limit')
    .setLabel('Message Limit')
    .setPlaceholder('Number of messages (e.g. 5)')
    .setValue(String(config.limit))
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const windowInput = new TextInputBuilder()
    .setCustomId('spam_window')
    .setLabel('Time Window (Seconds)')
    .setPlaceholder('Time period in seconds (e.g. 10)')
    .setValue(String(config.window))
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const punishmentInput = new TextInputBuilder()
    .setCustomId('spam_punishment')
    .setLabel('Actions (comma separated)')
    .setPlaceholder('delete, warn, mute, kick, ban')
    .setValue(config.actions ? config.actions.join(', ') : 'delete, warn')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const responseMessageInput = new TextInputBuilder()
    .setCustomId('response_message')
    .setLabel('Response Message')
    .setPlaceholder('e.g. {EMOJI_ERROR} {user}, stop spamming! Rule: {violation}')
    .setValue(config.responseMessage || '')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(limitInput),
    new ActionRowBuilder().addComponents(windowInput),
    new ActionRowBuilder().addComponents(punishmentInput),
    new ActionRowBuilder().addComponents(responseMessageInput)
  );

  return modal;
}

/**
 * Create a modal for Link Filter configuration.
 */
function createLinkModal(config) {
  const modal = new ModalBuilder()
    .setCustomId('automod_modal_links')
    .setTitle('Link Filter Settings');

  const allowedLinksInput = new TextInputBuilder()
    .setCustomId('allowed_links')
    .setLabel('Allowed Links (One per line)')
    .setPlaceholder('e.g. discord.gg/wolf\ngithub.com')
    .setValue(config.allowedLinks ? config.allowedLinks.join('\n') : '')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false);

  const punishmentInput = new TextInputBuilder()
    .setCustomId('link_punishment')
    .setLabel('Actions (comma separated)')
    .setPlaceholder('delete, warn, mute, kick, ban')
    .setValue(config.actions ? config.actions.join(', ') : 'delete, warn')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const antiInviteInput = new TextInputBuilder()
    .setCustomId('anti_invite')
    .setLabel('Anti-Invite (yes/no)')
    .setPlaceholder('Block Discord invites?')
    .setValue(config.antiInvite ? 'yes' : 'no')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const antiPhishingInput = new TextInputBuilder()
    .setCustomId('anti_phishing')
    .setLabel('Anti-Phishing (yes/no)')
    .setPlaceholder('Block scam links?')
    .setValue(config.antiPhishing ? 'yes' : 'no')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const responseMessageInput = new TextInputBuilder()
    .setCustomId('response_message')
    .setLabel('Response Message')
    .setPlaceholder('e.g. {EMOJI_ERROR} {user}, links are not allowed here!')
    .setValue(config.responseMessage || '')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(allowedLinksInput),
    new ActionRowBuilder().addComponents(punishmentInput),
    new ActionRowBuilder().addComponents(antiInviteInput),
    new ActionRowBuilder().addComponents(antiPhishingInput),
    new ActionRowBuilder().addComponents(responseMessageInput)
  );

  return modal;
}

/**
 * Create a modal for Content Filter configuration.
 */
function createContentModal(config) {
  const modal = new ModalBuilder()
    .setCustomId('automod_modal_content')
    .setTitle('Content Filter Settings');

  const blockedWordsInput = new TextInputBuilder()
    .setCustomId('blocked_words')
    .setLabel('Blocked Words (Comma separated)')
    .setPlaceholder('badword1, badword2, ...')
    .setValue(config.blockedWords ? config.blockedWords.join(', ') : '')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false);

  const capsLimitInput = new TextInputBuilder()
    .setCustomId('caps_limit')
    .setLabel('Caps Limit (%)')
    .setPlaceholder('e.g. 70')
    .setValue(String(config.capsLimit || 70))
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const emojiLimitInput = new TextInputBuilder()
    .setCustomId('emoji_limit')
    .setLabel('Emoji Limit')
    .setPlaceholder('e.g. 10')
    .setValue(String(config.emojiLimit || 10))
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const punishmentInput = new TextInputBuilder()
    .setCustomId('content_punishment')
    .setLabel('Actions (comma separated)')
    .setPlaceholder('delete, warn, mute, kick, ban')
    .setValue(config.actions ? config.actions.join(', ') : 'delete, warn')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const responseMessageInput = new TextInputBuilder()
    .setCustomId('response_message')
    .setLabel('Response Message')
    .setPlaceholder('e.g. {EMOJI_ERROR} {user}, your message contained {violation}.')
    .setValue(config.responseMessage || '')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(blockedWordsInput),
    new ActionRowBuilder().addComponents(capsLimitInput),
    new ActionRowBuilder().addComponents(emojiLimitInput),
    new ActionRowBuilder().addComponents(punishmentInput),
    new ActionRowBuilder().addComponents(responseMessageInput)
  );

  return modal;
}

/**
 * Create a modal for Raid Protection configuration.
 */
function createRaidModal(config) {
  const modal = new ModalBuilder()
    .setCustomId('automod_modal_raid')
    .setTitle('Raid Protection Settings');

  const joinLimitInput = new TextInputBuilder()
    .setCustomId('raid_limit')
    .setLabel('Join Limit')
    .setPlaceholder('Max joins (e.g. 10)')
    .setValue(String(config.joinLimit || 10))
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const windowInput = new TextInputBuilder()
    .setCustomId('raid_window')
    .setLabel('Time Window (Seconds)')
    .setPlaceholder('Time period in seconds (e.g. 30)')
    .setValue(String(config.window || 30))
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const punishmentInput = new TextInputBuilder()
    .setCustomId('raid_punishment')
    .setLabel('Actions (comma separated)')
    .setPlaceholder('kick, ban')
    .setValue(config.actions ? config.actions.join(', ') : 'kick')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(joinLimitInput),
    new ActionRowBuilder().addComponents(windowInput),
    new ActionRowBuilder().addComponents(punishmentInput)
  );

  return modal;
}

/**
 * Create a modal for Security settings.
 */
function createSecurityModal(config) {
  const modal = new ModalBuilder()
    .setCustomId('automod_modal_security')
    .setTitle('Security Settings');

  const ageLimitInput = new TextInputBuilder()
    .setCustomId('security_age')
    .setLabel('Min Account Age (Days)')
    .setPlaceholder('e.g. 7')
    .setValue(String(config.minAccountAge || 1))
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const punishmentInput = new TextInputBuilder()
    .setCustomId('security_punishment')
    .setLabel('Actions (comma separated)')
    .setPlaceholder('kick, ban')
    .setValue(config.actions ? config.actions.join(', ') : 'kick')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(ageLimitInput),
    new ActionRowBuilder().addComponents(punishmentInput)
  );

  return modal;
}

/**
 * Create a modal for Global AutoMod settings.
 */
function createGlobalModal(config) {
  const modal = new ModalBuilder()
    .setCustomId('automod_modal_global')
    .setTitle('Global AutoMod Settings');

  const logChannelInput = new TextInputBuilder()
    .setCustomId('global_log_channel')
    .setLabel('Log Channel ID')
    .setPlaceholder('Enter channel ID (e.g. 123456789...)')
    .setValue(config.logChannel || '')
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  const bypassRolesInput = new TextInputBuilder()
    .setCustomId('global_bypass_roles')
    .setLabel('Bypass Role IDs (One per line)')
    .setPlaceholder('Enter role IDs...')
    .setValue(config.bypassRoles ? config.bypassRoles.join('\n') : '')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false);

  const bypassUsersInput = new TextInputBuilder()
    .setCustomId('global_bypass_users')
    .setLabel('Bypass User IDs (One per line)')
    .setPlaceholder('Enter user IDs...')
    .setValue(config.bypassUsers ? config.bypassUsers.join('\n') : '')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(logChannelInput),
    new ActionRowBuilder().addComponents(bypassRolesInput),
    new ActionRowBuilder().addComponents(bypassUsersInput)
  );

  return modal;
}

module.exports = {
  createSpamModal,
  createLinkModal,
  createContentModal,
  createRaidModal,
  createSecurityModal,
  createGlobalModal
};
