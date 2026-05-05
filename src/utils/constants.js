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
  EMOJI_INFO: '<:info:1498885783711645807>',
  EMOJI_LOADING: '<a:wolf_dot:1425088492198822000>',
  EMOJI_ARROW_LEFT: '<a:hc_left:1498885240490299503>',
  EMOJI_ARROW_RIGHT: '<a:hc_right:1498885243057213460>',
  EMOJI_LEGIT: '<a:LEGIT:1498884683742580806>',
  EMOJI_CHECK: '<a:wolf_vouch:1425073954455945217>',
  EMOJI_CROSS: '<a:rightarrow_haveli:1495585245712482374> ',
  EMOJI_STAR: '<a:LC_Star:1494837936989147237>',
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
  EMOJI_UPVOTE: '<:upvote:1501031321898586292>',
  EMOJI_DOWNVOTE: '<:downvote:1501033218340814888>',
  EMOJI_ACTIVE: '<a:green_butterflyholo:1495587202170753074>',
  EMOJI_INACTIVE: '<a:z_unq_ButterflyaRed:1495587222018195496>',
  EMOJI_LIST: '<a:wolf_tool:1494826140962127903>',
  EMOJI_SPAM: '<a:hc_typing:1495585623476670627>',
  EMOJI_LINK: '<:Partner_Black:1495588708047519815>',
  EMOJI_RAID: '<:wolf_shield:1425073969035350037>',
  EMOJI_CONTENT: '<a:rd_thanda_note:1495587962711179394>',
  EMOJI_DELETE: '<:deletthis:1498886932305023148>',
  EMOJI_MUTE: '<:wolf_mute:1425088495126446132>',
  EMOJI_KICK: '<:kick:1498887065427902644>',
  EMOJI_SETTINGS: '<a:wolf_category:1494831494986858567>',
  EMOJI_LOGS: '<a:rd_thanda_note:1495587962711179394>',
  EMOJI_BYPASS: '🔓',
  EMOJI_ARROW: '<a:wolf_Blackdot:1495113162071212183>',
  EMOJI_OWNER: '<:wolf_owner:1494822065746743460> ',
  EMOJI_CONGRATS: '<a:wolf_vouch:1425073954455945217>'
};

const SEP = '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501';
const FOOTER_TEXT = 'Wild Wolf \u2502 Premium Security \u2502 v2.0';

module.exports = {
  ...EMOJIS,
  EMOJIS,
  SEP,
  FOOTER_TEXT,

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
