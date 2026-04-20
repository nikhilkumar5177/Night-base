const { EmbedBuilder } = require('discord.js');
const { getConfig } = require('../database');
const { checkSpam } = require('../modules/spam');
const { checkLinks } = require('../modules/links');
const { checkContent } = require('../modules/content');
const { checkSecurity } = require('../modules/security');
const { COLORS, resolveEmbedEmojis, SEP, EMOJI_DOT } = require('../../utils/constants');

/**
 * Handle AutoMod logic for every message.
 */
async function handleAutoMod(client, message) {
  if (!message.guild || message.author.bot) return;

  const config = getConfig(message.guild.id);
  if (!config.enabled) return;

  // Global Bypass
  if (message.member.permissions.has('Administrator')) return;
  if (config.bypassRoles.some(roleId => message.member.roles.cache.has(roleId))) return;
  if (config.bypassUsers.includes(message.author.id)) return;

  const modules = config.modules;
  let activeViolation = null;
  let activeModule = null;

  // Check modules in priority order
  for (const [key, module] of Object.entries(modules)) {
    if (!module.enabled) continue;

    // Module-specific bypasses
    if (module.exemptRoles?.some(roleId => message.member.roles.cache.has(roleId))) continue;
    if (module.exemptChannels?.includes(message.channel.id)) continue;
    if (module.exemptUsers?.includes(message.author.id)) continue;

    let violation = null;
    switch (key) {
      case 'spam': violation = await checkSpam(message, module); break;
      case 'links': violation = await checkLinks(message, module); break;
      case 'content': violation = await checkContent(message, module); break;
      case 'security': violation = await checkSecurity(message, module); break;
    }

    if (violation) {
      activeViolation = violation;
      activeModule = module;
      break; // Stop at first violation
    }
  }

  if (activeViolation && activeModule) {
    await executeActions(client, message, activeViolation, activeModule);
  }
}

async function executeActions(client, message, violation, moduleConfig) {
  const actions = moduleConfig.actions || [];
  
  try {
    // 1. Delete Message
    if (actions.includes('delete')) {
      await message.delete().catch(() => {});
    }

    // 2. Response / Warn
    if (actions.includes('warn')) {
      const response = moduleConfig.responseMessage || '{EMOJI_ERROR} **{user}**, your message was flagged for **{violation}**.';
      const formatted = response
        .replace(/{user}/g, `<@${message.author.id}>`)
        .replace(/{violation}/g, violation);

      const embed = new EmbedBuilder()
        .setColor(COLORS.ERROR)
        .setAuthor({ name: 'Wild Wolf \u2502 AutoMod Violation', iconURL: client.user.displayAvatarURL() })
        .setDescription(
          `${SEP}\n` +
          `{EMOJI_WARN} **Violation Detected**\n` +
          `${SEP}\n\n` +
          `${EMOJI_DOT} **User:** <@${message.author.id}>\n` +
          `${EMOJI_DOT} **Rule:** ${violation}\n` +
          `${EMOJI_DOT} **Message:** ${formatted}\n` +
          `${SEP}`
        )
        .setTimestamp();

      let msg;
      try {
        msg = await message.reply({ 
          embeds: [resolveEmbedEmojis(embed.toJSON())],
          allowedMentions: { repliedUser: true },
          failIfNotExists: false
        });
      } catch (e) {
        msg = await message.channel.send({ 
          embeds: [resolveEmbedEmojis(embed.toJSON())]
        });
      }
      
      if (msg) setTimeout(() => msg.delete().catch(() => {}), 10000);
    }

    // 3. Send DM to Violator (Before Kick/Ban)
    const majorActions = actions.filter(a => ['warn', 'mute', 'kick', 'ban'].includes(a));
    if (majorActions.length > 0) {
      const dmEmbed = new EmbedBuilder()
        .setColor('#ff1744')
        .setAuthor({ name: `AutoMod Alert \u2502 ${message.guild.name}`, iconURL: message.guild.iconURL() })
        .setTitle('{EMOJI_WARN} You have been flagged by AutoMod')
        .setDescription(
          `${SEP}\n` +
          `Your recent activity in **${message.guild.name}** triggered the AutoModeration system.\n` +
          `${SEP}\n\n` +
          `${EMOJI_DOT} **Rule Violated:** ${violation}\n` +
          `${EMOJI_DOT} **Actions Taken:** ${majorActions.map(a => `\`${a.toUpperCase()}\``).join(', ')}\n\n` +
          `${SEP}`
        )
        .setFooter({ text: 'This is an automated security alert' })
        .setTimestamp();

      await message.author.send({ embeds: [resolveEmbedEmojis(dmEmbed.toJSON())] }).catch(() => {
        // User has DMs closed
      });
    }

    // 4. Mod Actions
    if (actions.includes('mute')) {
      await message.member.timeout(60 * 60 * 1000, `AutoMod: ${violation}`).catch(() => {});
    }
    
    if (actions.includes('kick')) {
      await message.member.kick(`AutoMod: ${violation}`).catch(() => {});
    }

    if (actions.includes('ban')) {
      await message.guild.members.ban(message.author.id, { reason: `AutoMod: ${violation}` }).catch(() => {});
    }

    // 4. Logging (Placeholder for actual logging service)
    // logToChannel(message.guild.id, { user: message.author, violation, actions });

  } catch (err) {
    console.error('Error executing AutoMod actions:', err);
  }
}

module.exports = { handleAutoMod };
