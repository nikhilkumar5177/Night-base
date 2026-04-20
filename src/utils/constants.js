// ══════════════════════════════════════════════
// EMOJI CONFIGURATION
// ══════════════════════════════════════════════
// Replace placeholder IDs with your own custom emoji IDs.
// Format for custom: '<:name:id>' or '<a:name:id>' for animated
// Format for Unicode fallback: '✅', '❌', etc.
//
// To find your emoji ID: send \:emojiname: in Discord
// ══════════════════════════════════════════════

const EMOJIS = {
  EMOJI_DOT: '<:white_dot:1495092726457438260>',
  EMOJI_SUCCESS: '<a:wolf_success:1425075216014377000>',
  EMOJI_ERROR: '<a:wolf_failed:1425075212646613123>',
  EMOJI_WARN: '<a:wolf_warning:1494831556663972102>',
  EMOJI_INFO: '<:wolf_page:1425073965059149967>',
  EMOJI_LOADING: '<a:wolf_dot:1425088492198822000>',
  EMOJI_ARROW_LEFT: '◀',
  EMOJI_ARROW_RIGHT: '▶',
  EMOJI_CHECK: '<a:wolf_vouch:1425073954455945217>',
  EMOJI_CROSS: '<a:rightarrow_haveli:1495585249617510501> ',
  EMOJI_STAR: '<:wolf_star:1494831555279978688>',
  EMOJI_HOME: '<:wolf_home:1494831519376605306>',
  EMOJI_COMMAND: '<a:wolf_category:1494831494986858567>',
  EMOJI_SHIELD: '<:wolf_shield:1425073969035350037>',
  EMOJI_TOOL: '<a:wolf_tool:1494826140962127903>',
  EMOJI_LOCK: '🔒',
  EMOJI_STAFF: '<:wolf_staff:1494826138613321840>',
  EMOJI_BAN: '<a:wolf_ban:1494826137799622807>',
  EMOJI_ROLE: '<a:LC_Star:1494837936989147237>',
  EMOJI_SNIPE: '<a:wolf_snipe:1494826129423466607>',
  EMOJI_CONFIG: '<a:wolf_config:1494823882430087188>',
  EMOJI_DEV: '<:wolf_owner:1494822065746743460>',
  EMOJI_UPVOTE: '🔺 ',
  EMOJI_DOWNVOTE: '🔻',
  EMOJI_ACTIVE: '<a:green_butterflyholo:1495587211423383653>',
  EMOJI_INACTIVE: '<a:z_unq_ButterflyaRed:1495587222018195496>',
  EMOJI_LIST: '<a:wolf_tool:1494826140962127903>',
  EMOJI_SPAM: '<a:hc_typing:1495585623476670627>',
  EMOJI_LINK: '<:Partner_Black:1495588708047519815>',
  EMOJI_RAID: '<:wolf_shield:1425073969035350037>',
  EMOJI_CONTENT: '<a:rd_thanda_note:1495587970416382043>',
  EMOJI_DELETE: '🗑️',
  EMOJI_MUTE: '<:wolf_mute:1425088495126446132>',
  EMOJI_KICK: '👢',
  EMOJI_SETTINGS: '<a:wolf_category:1494831494986858567>⚙️',
  EMOJI_LOGS: '<a:rd_thanda_note:1495587970416382043>',
  EMOJI_BYPASS: '🔓',
  EMOJI_ARROW: '<a:wolf_Blackdot:1495113162071212183>',
  EMOJI_OWNER: '<:wolf_owner:1494822065746743460> '
};

const SEP = '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501';

// ── Regex pattern that matches all {PLACEHOLDER} placeholders ──
const EMOJI_PATTERN = /\{([a-zA-Z0-9_]+)\}/g;
const memoCache = new Map();

/**
 * Replace all {EMOJI_*} placeholders in a string with actual emoji values.
 * @param {string} text
 * @returns {string}
 */
function resolveEmojis(text) {
  if (!text || typeof text !== 'string') return text;

  // Use cache for frequently used strings (like help menu labels)
  if (memoCache.has(text)) return memoCache.get(text);

  const resolved = text.replace(EMOJI_PATTERN, (match, key) => {
    // Try exact match, then uppercase match
    return EMOJIS[key] || EMOJIS[key.toUpperCase()] || match;
  });

  // Limit cache size to prevent memory leaks (max 500 entries)
  if (memoCache.size < 500) {
    memoCache.set(text, resolved);
  }

  return resolved;
}

/**
 * Process an entire embed's JSON data and resolve all emoji placeholders.
 * Works with EmbedBuilder.toJSON() output.
 * @param {object} embedData - Raw embed JSON
 * @returns {object}
 */
function resolveEmbedEmojis(embedData) {
  if (!embedData) return embedData;
  if (embedData.title) embedData.title = resolveEmojis(embedData.title);
  if (embedData.description) embedData.description = resolveEmojis(embedData.description);
  if (embedData.author?.name) embedData.author.name = resolveEmojis(embedData.author.name);
  if (embedData.footer?.text) embedData.footer.text = resolveEmojis(embedData.footer.text);
  if (embedData.fields) {
    embedData.fields = embedData.fields.map(f => ({
      ...f,
      name: resolveEmojis(f.name),
      value: resolveEmojis(f.value)
    }));
  }
  return embedData;
}

module.exports = {
  ...EMOJIS,
  EMOJIS,
  resolveEmojis,
  resolveEmbedEmojis,
  SEP,

  COLORS: {
    SUCCESS: '#57F287',
    ERROR: '#ED4245',
    WARN: '#FEE75C',
    INFO: '#5865F2',
    MOD: '#ff6d00',
    LOADING: '#EB459E',
    DARK: '#2B2D31',
    DEFAULT: '#5865F2'
  },

  LIMITS: {
    SNIPE_PER_CHANNEL: 20,
    MAX_PURGE: 100,
    WARN_MAX_PER_USER: 50,
    COOLDOWN_DEFAULT: 3,
    AUTO_DELETE_MS: 120000,
    PAGINATION_TIMEOUT: 60000,
    CONFIRMATION_TIMEOUT: 30000,
    MAX_ANALYTICS_ENTRIES: 500,
    MAX_SECURITY_LOGS: 100
  }
};
