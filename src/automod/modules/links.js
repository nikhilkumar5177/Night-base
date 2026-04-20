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
  const links = content.match(LINK_REGEX);
  if (!links) return false;

  const { allowedLinks } = config;

  for (const link of links) {
    // 1. Check Whitelist (Primary Bypass)
    let isWhitelisted = false;
    for (const allowed of allowedLinks) {
      if (link.toLowerCase().includes(allowed.toLowerCase())) {
        isWhitelisted = true;
        break;
      }
    }
    if (isWhitelisted) continue; // Skip all other checks for this link

    // 2. Anti-Phishing (Only if not whitelisted)
    if (config.antiPhishing && PHISHING_REGEX.test(link)) {
      return 'Phishing/Scam Link';
    }

    // 3. Anti-Invite (Only if not whitelisted)
    if (config.antiInvite && INVITE_REGEX.test(link)) {
      return 'Discord Invite Link';
    }

    // 4. General Link Block (If any link is present and not whitelisted, we treat it as forbidden)
    // Note: If you want to allow general links but only block specific ones, 
    // you would normally have a 'blockAllLinks' toggle. 
    // Currently, enabling the module acts as 'Block All except whitelisted'.
    return 'Forbidden Link';
  }

  return false;
}

module.exports = { checkLinks };
