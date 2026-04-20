const LINK_REGEX = /https?:\/\/[^\s]+/gi;
const INVITE_REGEX = /(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/[a-zA-Z0-9]+/gi;
const PHISHING_REGEX = /(steamcommunity\.com\.login|free-nitro|gift-nitro|discord-nitro|dlscord)/gi;

/**
 * Handle link filtering, anti-invite, and anti-phishing.
 * @param {object} message 
 * @param {object} config 
 * @returns {string|boolean} Violation type or false
 */
async function checkLinks(message, config) {
  if (!config.enabled) return false;

  const content = message.content;

  // Anti-Phishing
  if (config.antiPhishing && PHISHING_REGEX.test(content)) {
    return 'Phishing/Scam Link';
  }

  // Anti-Invite
  if (config.antiInvite && INVITE_REGEX.test(content)) {
    // Check if it's an internal invite (optional, but usually we block all)
    return 'Discord Invite Link';
  }

  const links = content.match(LINK_REGEX);
  if (!links) return false;

  const { allowedLinks } = config;
  for (const link of links) {
    let isAllowed = false;
    for (const allowed of allowedLinks) {
      if (link.includes(allowed)) {
        isAllowed = true;
        break;
      }
    }
    if (!isAllowed) return 'Forbidden Link';
  }

  return false;
}

module.exports = { checkLinks };
