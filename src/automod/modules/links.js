const LINK_REGEX = /https?:\/\/[^\s]+/gi;
const INVITE_REGEX = /(discord\.(gg|io|me|li|com\/invite|app\.com\/invite)|\.gg\/|discord\.com\/vanity)\/[a-zA-Z0-9_-]+/gi;
const DOMAIN_REGEX = /\b([a-z0-9-]+)\.([a-z]{2,})\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/gi;
const PHISHING_REGEX = /(steamcommunity\.com\.login|free-nitro|gift-nitro|discord-nitro|dlscord)/i;
const GIF_REGEX = /(tenor\.com|giphy\.com|.+\.gif)/i;

// Invite code cache — prevents repeated API calls for the same code
const inviteCache = new Map();
const INVITE_CACHE_TTL = 300000; // 5 minutes

// Evict stale invite cache entries
setInterval(() => {
  const now = Date.now();
  for (const [code, entry] of inviteCache.entries()) {
    if (now - entry.ts > INVITE_CACHE_TTL) inviteCache.delete(code);
  }
}, 60000);

/**
 * Handle link filtering, anti-invite, and anti-phishing.
 * @param {object} message 
 * @param {object} config 
 * @returns {string|boolean} Violation type or false
 */
async function checkLinks(message, config) {
  if (!config.enabled) return false;

  const content = message.content;
  
  // Use pre-hydrated arrays from database.js (computed on config load/save, not per message)
  const allowedLinks = config._allowedLinksLower || config.allowedLinks.map(l => l.trim().toLowerCase().replace(/^https?:\/\//, ''));
  const allowedGifSet = config._allowedGifSet || new Set((config.allowedGifs || []).map(l => l.trim().toLowerCase().replace(/^https?:\/\//, '')));

  // 1. Gather all potential links
  const standardLinks = content.match(LINK_REGEX) || [];
  const inviteLinks = content.match(INVITE_REGEX) || [];
  const domainLinks = content.match(DOMAIN_REGEX) || [];
  
  // Filter out noisy domain matches
  const cleanDomainLinks = domainLinks.filter(d => {
    if (/^\d+(\.\d+)+$/.test(d)) return false;
    if (d.split('/')[0].length < 4) return false;
    return true;
  });

  const allLinks = [...new Set([...standardLinks, ...inviteLinks, ...cleanDomainLinks])];

  if (allLinks.length === 0) return false;

  for (const link of allLinks) {
    const cleanLink = link.toLowerCase().replace(/^https?:\/\//, '');

    // 2. Check Whitelist
    let isWhitelisted = false;
    for (const allowed of allowedLinks) {
      if (cleanLink.includes(allowed)) {
        isWhitelisted = true;
        break;
      }
    }
    if (isWhitelisted) continue;

    // 3. Anti-Phishing
    if (config.antiPhishing && PHISHING_REGEX.test(link)) {
      return 'Phishing/Scam Link';
    }

    // 4. Anti-GIF
    if (config.antiGifs && GIF_REGEX.test(link)) {
      const hasGifRole = config.exemptGifsRoles?.some(roleId => message.member.roles.cache.has(roleId));
      if (hasGifRole) continue;

      let isGifWhitelisted = false;
      for (const allowed of allowedGifSet) {
        if (cleanLink.includes(allowed)) {
          isGifWhitelisted = true;
          break;
        }
      }
      if (!isGifWhitelisted) return 'GIF Link';
    }

    // 5. Anti-Invite — with cached invite resolution
    if (INVITE_REGEX.test(link) || (link.includes('.gg/') && !link.includes('http'))) {
      if (config.antiInvite) {
        const parts = link.split('/');
        const code = parts[parts.length - 1] || parts[parts.length - 2];
        if (code) {
          // Check vanity first (no API call)
          if (message.guild.vanityURLCode && code.toLowerCase() === message.guild.vanityURLCode.toLowerCase()) {
            continue;
          }

          // Check invite cache before hitting Discord API
          const cached = inviteCache.get(code.toLowerCase());
          if (cached) {
            if (cached.guildId === message.guild.id) continue;
          } else {
            // Only fetch if not cached
            const invite = await message.client.fetchInvite(code).catch(() => null);
            if (invite && invite.guild) {
              inviteCache.set(code.toLowerCase(), { guildId: invite.guild.id, ts: Date.now() });
              if (invite.guild.id === message.guild.id) continue;
            }
          }
        }
        return 'Discord Invite Link';
      }
    }

    // 6. Suspicious Domain Block
    if (DOMAIN_REGEX.test(link) && !link.includes('http')) {
        return 'Unauthorized Domain/Link';
    }

    // 7. General Link Block
    if (config.antiInvite || config.antiPhishing) {
       return 'Forbidden Link';
    }
  }

  return false;
}

module.exports = { checkLinks };
