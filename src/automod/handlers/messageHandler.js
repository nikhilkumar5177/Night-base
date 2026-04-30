const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const { getConfig } = require('../database');
const { checkSpam } = require('../modules/spam');
const { checkLinks } = require('../modules/links');
const { checkContent } = require('../modules/content');
const { checkSecurity } = require('../modules/security');
const { EMOJI_DOT, EMOJI_ERROR, EMOJI_WARN } = require('../../utils/constants');

const warningCooldowns = new Map();
const logChannelCache = new Map();

// Pre-filter: per-user rate limiter to skip heavy processing for well-behaved users
const userRateLimit = new Map();
const RATE_LIMIT_WINDOW = 1000; // 1 second cooldown between full pipeline runs per user

// Priority-ordered module keys (spam first — cheapest, highest signal)
const MODULE_PRIORITY = ['spam', 'content', 'links', 'security'];

// Module dispatch table (avoids switch statement overhead)
const MODULE_CHECKS = {
  spam: checkSpam,
  links: checkLinks,
  content: checkContent,
  security: checkSecurity
};

// TTL eviction for Maps
setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of warningCooldowns.entries()) {
    if (now - ts > 30000) warningCooldowns.delete(key);
  }
  for (const [key, entry] of logChannelCache.entries()) {
    if (now - entry.ts > 300000) logChannelCache.delete(key);
  }
  for (const [key, ts] of userRateLimit.entries()) {
    if (now - ts > 5000) userRateLimit.delete(key);
  }
}, 60000);

/**
 * Handle AutoMod logic for every message.
 * Priority-ordered, rate-limited, parallel execution.
 */
async function handleAutoMod(client, message) {
  if (!message.guild || message.author.bot) return;

  const config = getConfig(message.guild.id);
  if (!config.enabled) return;

  if (message.member.permissions.has('Administrator')) return;

  // Use pre-hydrated Sets from database (O(1) bypass checks)
  const bypassRoleSet = config._bypassRoleSet;
  const bypassUserSet = config._bypassUserSet;

  if (bypassUserSet && bypassUserSet.has(message.author.id)) return;
  if (bypassRoleSet && message.member.roles.cache.some(r => bypassRoleSet.has(r.id))) return;

  // Pre-filter: rate limit full pipeline per user (skip if processed recently)
  const userKey = `${message.guild.id}-${message.author.id}`;
  const now = Date.now();
  const lastProcessed = userRateLimit.get(userKey) || 0;
  if (now - lastProcessed < RATE_LIMIT_WINDOW) return;
  userRateLimit.set(userKey, now);

  const modules = config.modules;

  // Build check list in priority order (spam → content → links → security)
  const checks = [];
  const enabledModules = [];

  for (const key of MODULE_PRIORITY) {
    const module = modules[key];
    if (!module || !module.enabled) continue;
    if (module.exemptRoles?.some(roleId => message.member.roles.cache.has(roleId))) continue;
    if (module.exemptChannels?.includes(message.channel.id)) continue;
    if (module.exemptUsers?.includes(message.author.id)) continue;

    enabledModules.push(module);
    checks.push(MODULE_CHECKS[key](message, module));
  }

  if (checks.length === 0) return;

  const results = await Promise.all(checks);
  const vIdx = results.findIndex(v => v);

  if (vIdx !== -1) {
    await executeActions(client, message, results[vIdx], enabledModules[vIdx]);
  }
}

/**
 * Execute violation actions in parallel with Promise.allSettled.
 */
async function executeActions(client, message, violation, moduleConfig) {
  const actions = moduleConfig.actions || [];

  try {
    const tasks = [];

    // Delete (fire immediately)
    if (actions.includes('delete')) {
      tasks.push(message.delete().catch(() => {}));
    }

    // Warn (with cooldown)
    if (actions.includes('warn')) {
      const cooldownKey = `${message.author.id}-${message.channel.id}`;
      const now = Date.now();
      const lastWarn = warningCooldowns.get(cooldownKey) || 0;

      if (now - lastWarn >= 5000) {
        warningCooldowns.set(cooldownKey, now);
        const response = moduleConfig.responseMessage || `${EMOJI_ERROR} **{user}**, your message was flagged for **{violation}**.`;
        const formatted = response
          .replace(/{user}/g, `<@${message.author.id}>`)
          .replace(/{violation}/g, violation);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 AutoMod Violation`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${EMOJI_WARN} **Violation Detected**\n\n` +
            `${EMOJI_DOT} **User:** <@${message.author.id}>\n` +
            `${EMOJI_DOT} **Rule:** ${violation}\n` +
            `${EMOJI_DOT} **Notice:** ${formatted}`
          ));

        const payload = { components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: true } };
        tasks.push(
          message.reply(payload).catch(() => message.channel.send(payload).catch(() => {}))
            .then(msg => { if (msg) setTimeout(() => msg.delete().catch(() => {}), 10000); })
        );
      }
    }

    // DM + Moderation actions (parallel)
    const majorActions = actions.filter(a => ['warn', 'mute', 'kick', 'ban'].includes(a));
    if (majorActions.length > 0) {
      const dmEmbed = new EmbedBuilder()
        .setColor('#ff1744')
        .setAuthor({ name: `AutoMod Alert \u2502 ${message.guild.name}`, iconURL: message.guild.iconURL() })
        .setTitle(`${EMOJI_WARN} You have been flagged by AutoMod`)
        .setDescription(
          `Your recent activity in **${message.guild.name}** triggered the security system.\n\n` +
          `${EMOJI_DOT} **Rule Violated:** ${violation}\n` +
          `${EMOJI_DOT} **Actions Taken:** ${majorActions.map(a => `\`${a.toUpperCase()}\``).join(', ')}`
        )
        .setTimestamp();
      tasks.push(message.author.send({ embeds: [dmEmbed] }).catch(() => {}));
    }

    if (actions.includes('mute')) tasks.push(message.member.timeout(60 * 60 * 1000, `AutoMod: ${violation}`).catch(() => {}));
    if (actions.includes('kick')) tasks.push(message.member.kick(`AutoMod: ${violation}`).catch(() => {}));
    if (actions.includes('ban')) tasks.push(message.guild.members.ban(message.author.id, { reason: `AutoMod: ${violation}` }).catch(() => {}));

    // Log (non-blocking)
    tasks.push(logToChannel(client, message, { violation, actions }));

    // Fire all actions in parallel
    await Promise.allSettled(tasks);
  } catch (err) {
    console.error('Error executing AutoMod actions:', err);
  }
}

/**
 * Log violation to the configured channel.
 * Uses cached channel object to avoid repeated fetches.
 */
async function logToChannel(client, message, data) {
  const config = getConfig(message.guild.id);
  const logChannelId = config.logChannel;
  if (!logChannelId) return;

  // Use cached channel object
  let channel;
  const cached = logChannelCache.get(logChannelId);
  if (cached && Date.now() - cached.ts < 300000) {
    channel = cached.channel;
  } else {
    channel = message.guild.channels.cache.get(logChannelId);
    if (!channel) channel = await message.guild.channels.fetch(logChannelId).catch(() => null);
    if (channel) logChannelCache.set(logChannelId, { channel, ts: Date.now() });
  }
  if (!channel) return;

  const logContainer = new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 AutoMod Log`))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${EMOJI_DOT} **User:** ${message.author} (\`${message.author.id}\`)\n` +
      `${EMOJI_DOT} **Channel:** ${message.channel}\n` +
      `${EMOJI_DOT} **Violation:** \`${data.violation}\`\n` +
      `${EMOJI_DOT} **Actions:** ${data.actions.map(a => `\`${a.toUpperCase()}\``).join(', ')}\n\n` +
      `**Content:**\n\`\`\`\n${message.content.slice(0, 500) || 'None'}\n\`\`\``
    ));

  channel.send({ components: [logContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
}

module.exports = { handleAutoMod };
