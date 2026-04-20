const LINK_REGEX = /https?:\/\/[^\s]+/i;
const INVITE_REGEX = /(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/[a-zA-Z0-9]+/i;
const PHISHING_REGEX = /(steamcommunity\.com\.login|free-nitro|gift-nitro|discord-nitro|dlscord)/i;

/**
 * Handle link filtering, anti-invite, and anti-phishing.
 * @param {object} message 
 * @param {object} config 
 * @returns {string|boolean} Violation type or false
 */
async function checkLinks(message, config) {
  if (!config.enabled) return false;

  const content = message.content;
  const allowedLinks = config.allowedLinks.map(l => l.trim().toLowerCase().replace(/^https?:\/\//, ''));

  // 1. Gather all potential links (Standard URLs + Discord Invites)
  const standardLinks = content.match(/https?:\/\/[^\s]+/gi) || [];
  const inviteLinks = content.match(/(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/[a-zA-Z0-9]+/gi) || [];
  const allLinks = [...new Set([...standardLinks, ...inviteLinks])];

  if (allLinks.length === 0) return false;

  for (const link of allLinks) {
    const cleanLink = link.toLowerCase().replace(/^https?:\/\//, '');

    // 2. Check Whitelist (Primary Bypass)
    let isWhitelisted = false;
    for (const allowed of allowedLinks) {
      if (cleanLink.includes(allowed)) {
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
      if (config.antiInvite) {
        // Smart Bypass: Check if the invite belongs to THIS server
        const code = link.split('/').pop();
        if (code) {
          try {
            // Check if it matches vanity first (fast)
            if (message.guild.vanityURLCode && code.toLowerCase() === message.guild.vanityURLCode.toLowerCase()) {
              continue;
            }
            
            // Fetch invite info to verify guild ID
            const invite = await message.client.fetchInvite(code).catch(() => null);
            if (invite && invite.guild && invite.guild.id === message.guild.id) {
              continue; // It's an invite to this server!
            }
          } catch (err) {
            // If fetch fails (invalid invite), we still treat it as a potential forbidden link
          }
        }
        return 'Discord Invite Link';
      }
    }

    // 5. General Link Block
    // If we reached here, it means it's a link that wasn't whitelisted, 
    // wasn't a self-invite, and anti-spam/phishing might have flagged it.
    // However, if antiInvite and antiPhishing are BOTH off, we should allow it.
    if (config.antiInvite || config.antiPhishing) {
       // Only block as forbidden if some protection is actually active
       return 'Forbidden Link';
    }
  }

  return false;
}

module.exports = { checkLinks };
