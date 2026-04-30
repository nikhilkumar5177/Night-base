const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const { getConfig } = require('../database');
const { checkSpam } = require('../modules/spam');
const { checkLinks } = require('../modules/links');
const { checkContent } = require('../modules/content');
const { checkSecurity } = require('../modules/security');
const { EMOJI_DOT, EMOJI_ERROR, EMOJI_WARN } = require('../../utils/constants');

const warningCooldowns = new Map();

/**
 * Handle AutoMod logic for every message.
 */
async function handleAutoMod(client, message) {
  if (!message.guild || message.author.bot) return;

  const config = await getConfig(message.guild.id);
  if (!config.enabled) return;

  if (message.member.permissions.has('Administrator')) return;
  if (config.bypassRoles.some(roleId => message.member.roles.cache.has(roleId))) return;
  if (config.bypassUsers.includes(message.author.id)) return;

  const modules = config.modules;
  let activeViolation = null;
  let activeModule = null;

  for (const [key, module] of Object.entries(modules)) {
    if (!module.enabled) continue;
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
      break;
    }
  }

  if (activeViolation && activeModule) {
    await executeActions(client, message, activeViolation, activeModule);
  }
}

async function executeActions(client, message, violation, moduleConfig) {
  const actions = moduleConfig.actions || [];
  
  try {
    if (actions.includes('delete')) {
      await message.delete().catch(() => {});
    }

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

        let msg;
        const payload = { components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: true } };
        try {
          msg = await message.reply(payload).catch(async () => {
            return await message.channel.send(payload);
          });
        } catch (e) { }

        if (msg) setTimeout(() => msg.delete().catch(() => { }), 10000);
      }
    }

    const majorActions = actions.filter(a => ['warn', 'mute', 'kick', 'ban'].includes(a));
    if (majorActions.length > 0) {
      // DM stays Embed (V2 not supported in DMs)
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
      await message.author.send({ embeds: [dmEmbed] }).catch(() => {});
    }

    if (actions.includes('mute')) await message.member.timeout(60 * 60 * 1000, `AutoMod: ${violation}`).catch(() => {});
    if (actions.includes('kick')) await message.member.kick(`AutoMod: ${violation}`).catch(() => {});
    if (actions.includes('ban')) await message.guild.members.ban(message.author.id, { reason: `AutoMod: ${violation}` }).catch(() => {});

    await logToChannel(client, message, { violation, actions });
  } catch (err) {
    console.error('Error executing AutoMod actions:', err);
  }
}

async function logToChannel(client, message, data) {
  const config = await getConfig(message.guild.id);
  const logChannelId = config.logChannel;
  if (!logChannelId) return;

  const channel = message.guild.channels.cache.get(logChannelId) || await message.guild.channels.fetch(logChannelId).catch(() => null);
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

  await channel.send({ components: [logContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
}

module.exports = { handleAutoMod };
