/**
 * Utility for resolving Discord objects from Mentions or IDs
 */
module.exports = {
  /**
   * Resolves a GuildMember from a mention or ID.
   * @param {Guild} guild 
   * @param {string} input 
   * @returns {Promise<GuildMember|null>}
   */
  resolveMember: async (guild, input) => {
    if (!input || typeof input !== 'string') return null;
    const id = input.replace(/[<@!>]/g, '');
    if (!id.match(/^\d{17,20}$/)) return null;
    
    // Check cache first
    let member = guild.members.cache.get(id);
    if (member) return member;
    
    // Fetch from API
    try {
      return await guild.members.fetch(id);
    } catch {
      return null;
    }
  },

  /**
   * Resolves a Role from a mention, ID, or Name.
   * @param {Guild} guild 
   * @param {string} input 
   * @returns {Role|null}
   */
  resolveRole: (guild, input) => {
    if (!input || typeof input !== 'string') return null;
    const lowInput = input.toLowerCase();

    // 1. Try ID or Mention
    const id = input.replace(/[<@&>]/g, '');
    let role = guild.roles.cache.get(id);
    if (role) return role;

    // 2. Try Exact Name (case-insensitive)
    let matched = guild.roles.cache.find(r => r.name.toLowerCase() === lowInput);
    if (matched) return matched;

    // 3. Try Word match (matches if any word in the role name is exactly the input)
    // For example: "Mod" matches "Server Mod"
    matched = guild.roles.cache.find(r => 
      r.name.toLowerCase().split(/[^a-z0-9]/).includes(lowInput)
    );
    if (matched) return matched;

    // 4. Try Starts With (prefix matching)
    // For example: "mode" matches "Moderator"
    matched = guild.roles.cache.find(r => r.name.toLowerCase().startsWith(lowInput));
    if (matched) return matched;

    // 5. Try Includes (global search)
    return guild.roles.cache.find(r => r.name.toLowerCase().includes(lowInput));
  },

  /**
   * Resolves a Channel from a mention, ID, or Name.
   * @param {Guild} guild 
   * @param {string} input 
   * @returns {Channel|null}
   */
  resolveChannel: (guild, input) => {
    if (!input || typeof input !== 'string') return null;
    const id = input.replace(/[<#>]/g, '');
    
    // Try ID
    let channel = guild.channels.cache.get(id);
    if (channel) return channel;
    
    // Try Name (case-insensitive)
    return guild.channels.cache.find(c => c.name.toLowerCase() === input.toLowerCase());
  },

  /**
   * Resolves a User from a mention or ID.
   * @param {Client} client 
   * @param {string} input 
   * @returns {Promise<User|null>}
   */
  resolveUser: async (client, input) => {
    if (!input || typeof input !== 'string') return null;
    const id = input.replace(/[<@!>]/g, '');
    if (!id.match(/^\d{17,20}$/)) return null;
    
    // Check cache first
    let user = client.users.cache.get(id);
    if (user) return user;
    
    // Fetch from API
    try {
      return await client.users.fetch(id);
    } catch {
      return null;
    }
  },

  /**
   * Parses a time string (e.g. 10m, 2h, 3d, 1mo) into milliseconds
   * @param {string} timeStr 
   * @returns {number|null} Milliseconds or null if invalid
   */
  parseDuration: (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const match = timeStr.toLowerCase().match(/^(\d+)(s|m|h|d|w|mo|y)$/);
    if (!match) return null;
    
    const amount = parseInt(match[1], 10);
    const unit = match[2];
    
    const multipliers = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
      w: 7 * 24 * 60 * 60 * 1000,
      mo: 30 * 24 * 60 * 60 * 1000,
      y: 365 * 24 * 60 * 60 * 1000
    };
    
    return amount * multipliers[unit];
  }
};
