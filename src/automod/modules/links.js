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
  const { allowedLinks } = config;

  // 1. Gather all potential links (Standard URLs + Discord Invites)
  const standardLinks = content.match(LINK_REGEX) || [];
  const inviteLinks = content.match(INVITE_REGEX) || [];
  const allLinks = [...new Set([...standardLinks, ...inviteLinks])];

  if (allLinks.length === 0) return false;

  for (const link of allLinks) {
    // 2. Check Whitelist (Primary Bypass)
    let isWhitelisted = false;
    for (const allowed of allowedLinks) {
      if (link.toLowerCase().includes(allowed.toLowerCase())) {
        isWhitelisted = true;
        break;
      }
    }
    if (isWhitelisted) continue;

    // 3. Anti-Phishing (Only if not whitelisted)
    if (config.antiPhishing && PHISHING_REGEX.test(link)) {
      return 'Phishing/Scam Link';
    }

    // 4. Anti-Invite (Only if not whitelisted)
    if (INVITE_REGEX.test(link)) {
      if (config.antiInvite) return 'Discord Invite Link';
      // If antiInvite is off, we still proceed to General Link Block
    }

    // 5. General Link Block (Treat all remaining links as forbidden)
    return 'Forbidden Link';
  }

  return false;
}

module.exports = { checkLinks };
