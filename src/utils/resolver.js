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
    const id = input.replace(/[<@&>]/g, '');
    
    // Try ID
    let role = guild.roles.cache.get(id);
    if (role) return role;
    
    // Try Name (case-insensitive)
    let matched = guild.roles.cache.find(r => r.name.toLowerCase() === input.toLowerCase());
    if (matched) return matched;

    // Try Starts With
    matched = guild.roles.cache.find(r => r.name.toLowerCase().startsWith(input.toLowerCase()));
    if (matched) return matched;

    // Try Includes
    return guild.roles.cache.find(r => r.name.toLowerCase().includes(input.toLowerCase()));
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
  }
};
