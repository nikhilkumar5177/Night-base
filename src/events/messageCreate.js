const storage = require('../utils/storageManager');
const logger = require('../utils/logger');
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, PermissionsBitField } = require('discord.js');
const { LIMITS, EMOJI_ERROR, EMOJI_SUCCESS, EMOJI_WARN, EMOJI_OWNER, EMOJI_CHECK, EMOJI_LEGIT, EMOJI_DOT, SEP } = require('../utils/constants');

const { sendAutoDelete, cv2Error, safeReply, safeSend, safeDelete } = require('../utils/messageHelper');
const { handleAutoMod } = require('../automod/handlers/messageHandler');
const resolver = require('../utils/resolver');

let lastAliasData = null;
let aliasTriggerMap = new Map(); // guildId -> Map of triggers

const LINK_REGEX = /https?:\/\/[^\s]+/gi;
const INVITE_REGEX = /(discord\.(gg|io|me|li|com\/invite|app\.com\/invite)|\.gg\/|discord\.com\/vanity)\/[a-zA-Z0-9_-]+/gi;
const PHISHING_REGEX = /(steamcommunity\.com\.login|free-nitro|gift-nitro|discord-nitro|dlscord)/i;

function getGuildTriggerMap(aliasData, guild) {
  const guildId = guild.id;
  const guildAliases = aliasData[guildId] || {};

  // Also check root-level legacy entries whose roleId exists in this guild
  const merged = { ...guildAliases };
  for (const [key, cfg] of Object.entries(aliasData)) {
    if (key === guildId || typeof cfg !== 'object' || cfg === null || Array.isArray(cfg)) continue;
    if (!cfg.roleId) continue;
    if (guild.roles.cache.has(cfg.roleId) && !merged[key]) {
      merged[key] = cfg;
    }
  }

  const triggerMap = new Map();
  for (const [aliasKey, config] of Object.entries(merged)) {
    const triggers = [aliasKey, ...(config.aliases || [])];
    for (const t of triggers) {
      triggerMap.set(t.toLowerCase(), { ...config, key: aliasKey });
    }
  }
  return triggerMap;
}

module.exports = {
  name: 'messageCreate',
  once: false,
  execute: async (client, message) => {
    if (message.webhookId && message.guild) {
      const { getConfig } = require('../automod/database');
      const automodConfig = await getConfig(message.guild.id);

      if (automodConfig.enabled && automodConfig.modules.security.enabled && automodConfig.modules.security.antiWebhook) {
        const webhookWhitelist = automodConfig.modules.security.webhookWhitelist || [];
        if (webhookWhitelist.includes(message.channel.id) || (message.channel.parentId && webhookWhitelist.includes(message.channel.parentId))) {
          return;
        }

        if (!client._webhookTracker) client._webhookTracker = new Map();
        const guildId = message.guild.id;
        const now = Date.now();
        if (!client._webhookTracker.has(guildId)) client._webhookTracker.set(guildId, { messages: [], alertSent: false });
        
        const tracker = client._webhookTracker.get(guildId);
        tracker.messages.push({ id: message.webhookId, timestamp: now });
        tracker.messages = tracker.messages.filter(t => now - t.timestamp < 10000);

        const mentionsEveryone = message.content.includes('@everyone') || message.content.includes('@here');
        const hasPhish = PHISHING_REGEX.test(message.content);
        const hasInvite = INVITE_REGEX.test(message.content);
        const linkCount = (message.content.match(LINK_REGEX) || []).length;
        const hasExcessiveLinks = linkCount >= 3;

        let largeMention = false;
        message.mentions.roles.forEach(role => {
          if (role.members.size / message.guild.memberCount >= 0.8) largeMention = true;
        });

        const isMalicious = mentionsEveryone || largeMention || hasPhish || hasInvite || hasExcessiveLinks;
        const isSpamming = tracker.messages.length >= 3;

        if (isMalicious || isSpamming) {
          let violationType = 'Webhook Spam';
          if (hasPhish) violationType = 'Phishing/Scam Link';
          else if (hasInvite) violationType = 'Unauthorized Invite';
          else if (hasExcessiveLinks) violationType = 'Mass Link Spam';
          else if (isSpamming) violationType = 'Webhook Message Flood';
          else if (mentionsEveryone || largeMention) violationType = 'Mass Mention Spam';

          try {
            await message.delete().catch(() => { });
            
            // Targeted Neutralization
            const suspectIds = [...new Set(tracker.messages.map(r => r.id))];
            if (!suspectIds.includes(message.webhookId)) suspectIds.push(message.webhookId);

            const purgeSuspects = async () => {
              const chanWebhooks = await message.channel.fetchWebhooks().catch(() => null);
              if (chanWebhooks) {
                const toDelete = chanWebhooks.filter(wh => suspectIds.includes(wh.id));
                await Promise.all(toDelete.map(wh => wh.delete(`Security: ${violationType}`).catch(() => { })));
              }
            };

            await purgeSuspects();
            setTimeout(purgeSuspects, 2000);

            const owner = await message.guild.fetchOwner().catch(() => null);
            const staffData = storage.read('staff.json');
            const guildRoles = staffData[message.guild.id]?.roles || [];
            const staffMentions = guildRoles.map(r => `<@&${r}>`).join(' ');

            if (!tracker.alertSent) {
              tracker.alertSent = true;
              
              const alertContainer = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Security Alert`))
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                  `${EMOJI_ERROR} **${violationType} Neutralized**\nTargeted security threat neutralized in ${message.channel}. Malicious webhooks have been destroyed.`
                ));

              const logCh = message.guild.channels.cache.get(automodConfig.logChannel) ||
                message.guild.channels.cache.find(c => c.name.includes('security') || c.name.includes('log')) ||
                message.channel;

              safeSend(logCh, {
                content: `${owner || ''} ${staffMentions}`,
                components: [alertContainer],
                allowedMentions: { parse: ['users', 'roles'] }
              }).catch(() => { });

              // Public Notice in Current Channel
              const publicAlert = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Security Neutralized`))
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                  `${EMOJI_WARN} **Raiders? Fuckyou bitches. by NightBase**\nSecurity Status: \`● SECURED\``
                ));

              await message.channel.send({ components: [publicAlert], flags: MessageFlags.IsComponentsV2 }).catch(() => { });
            }
          } catch (e) { }
          
          if (tracker.messages.length > 0) {
            if (client._webhookTrackerCleanup) clearTimeout(client._webhookTrackerCleanup);
            client._webhookTrackerCleanup = setTimeout(() => client._webhookTracker.delete(guildId), 15000);
          }
          return;
        }
      }
      return;
    }

    const _t0 = Date.now();
    // 1. Critical Early Exits (0ms processing for irrelevant messages)
    if (message.author.bot && !message.webhookId) return;
    if (!message.guild) {
      const { handleIncomingDM } = require('../utils/dmFormManager');
      await handleIncomingDM(client, message);
      return;
    }

    // 2. Consolidate Storage Access (Read once per message)
    const allData = {
      config: storage.read('config.json'),
      afk: storage.read('afk.json'),
      vouch: storage.read('vouch.json'),
      staff: storage.read('staff.json'),
      security: storage.read('security.json'),
      blacklist: storage.read('blacklist.json'),
      cmdBlacklist: storage.read('cmdBlacklist.json'),
      aliases: storage.read('aliases.json'),
      analytics: storage.read('analytics.json'),
      premium: storage.read('premium.json')
    };


    const runtimeConfig = allData.config;
    const prefix = runtimeConfig.prefix || client.config.prefix;
    const isDev = (process.env.DEV_ID || '').split(',').includes(message.author.id);
    const isOwner = message.author.id === message.guild.ownerId;

    // 3. Handle Staff Replies in Forms Channel
    if (message.channel.isThread() && message.channel.parentId === runtimeConfig.dmLogChannelId) {
      const { handleStaffReply } = require('../utils/dmFormManager');
      await handleStaffReply(client, message);
      return;
    }

    // 4. Premium Enforcement
    const isPremium = storage.isPremium(message.guild.id);

    const isCommandHeuristic = message.content.startsWith(prefix) || (runtimeConfig.noPrefixUsers && runtimeConfig.noPrefixUsers.some(u => typeof u === 'string' ? u === message.author.id : u.id === message.author.id));

    if (!isPremium && !isCommandHeuristic && !isDev) {
      return; // Ignore all messages in non-premium servers, except commands
    }

    // Vouch Logic
    const vouchData = allData.vouch;
    const guildVouchChannels = vouchData[message.guild.id]?.channels || [];
    if (guildVouchChannels.includes(message.channel.id)) {
      if (message.content.startsWith(prefix)) {
        const alertMsg = await message.channel.send({
          content: `${message.author}`,
          components: [cv2Error('Commands are not allowed in this channel. Please use slowmode to manage spam.')]
        }).catch(() => { });
        await safeDelete(message);
        if (alertMsg) setTimeout(() => safeDelete(alertMsg), 5000);
        return;
      }
      try {
        const now = Date.now();
        if (message.content.match(/https?:\/\/[^\s]+/gi)) {
          const linkMsg = await message.channel.send({ content: `${message.author}`, components: [cv2Error('Links are not allowed in vouches.')] }).catch(() => { });
          await safeDelete(message);
          if (linkMsg) setTimeout(() => safeDelete(linkMsg), 5000);
          return;
        }

        const target = message.mentions.users.first();
        const cleanContent = target ? message.content.replace(new RegExp(`<@!?${target.id}>`, 'g'), '').trim() : message.content;

        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 New Vouch`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${EMOJI_DOT} **Vouched:** ${target || '`N/A`'}\n` +
            `${EMOJI_DOT} **By:** ${message.author}\n` +
            `${EMOJI_DOT} **Message:** ${cleanContent || 'No content'}`
          ));

        const sent = await safeSend(message.channel, { components: [container] }).catch(() => { });
        await safeDelete(message);
        if (sent) await sent.react(EMOJI_LEGIT).catch(() => { });
        console.log(`[Vouch] Logged vouch by ${message.author.tag} in ${message.channel.name}`);
      } catch (e) { console.error('[Vouch Error]', e); }
      return;
    }

    // Run AutoMod
    const _t1 = Date.now();
    await handleAutoMod(client, message);


    // AFK Check (Auto-Remove)
    const afkData = allData.afk;
    const guildAfk = afkData[message.guild.id] || {};
    if (guildAfk[message.author.id]) {
      const { reason, timestamp } = guildAfk[message.author.id];
      delete afkData[message.guild.id][message.author.id];
      storage.write('afk.json', afkData);

      const welcomeContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Welcome back ${message.author}, I have removed your AFK status. You were gone for <t:${Math.floor(timestamp / 1000)}:R>.`));
      sendAutoDelete(message, { components: [welcomeContainer], flags: MessageFlags.IsComponentsV2 }, 5000);
    }

    // AFK Mention Check
    if (message.mentions.users.size > 0) {
      const mentionedAfk = [];
      const guildAfk = afkData[message.guild.id] || {};
      message.mentions.users.forEach(user => {
        if (guildAfk[user.id] && user.id !== message.author.id) {
          mentionedAfk.push({ user, data: guildAfk[user.id] });
        }
      });

      if (mentionedAfk.length > 0) {
        const afkMentionContainer = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 AFK Notification`))
          .addSeparatorComponents(new SeparatorBuilder());

        const afkList = mentionedAfk.map(({ user, data }) =>
          `${EMOJI_DOT} **${user.tag}** is AFK: ${data.reason} (<t:${Math.floor(data.timestamp / 1000)}:R>)`
        ).join('\n');

        afkMentionContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(afkList));
        safeReply(message, { components: [afkMentionContainer] }).catch(() => { });
      }
    }

    const mentionRegex = new RegExp(`^<@!?${client.user.id}>$`);
    if (mentionRegex.test(message.content)) {
      if (!client._mentionCooldowns) client._mentionCooldowns = new Map();
      const now = Date.now();
      const cooldown = 60000;
      const lastUsed = client._mentionCooldowns.get(message.author.id) || 0;

      if (now - lastUsed < cooldown) return;
      client._mentionCooldowns.set(message.author.id, now);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 System Info`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `\u25B8 My prefix for this server is \`${prefix}\`\n` +
          `\u25B8 Use \`${prefix}help\` to see all commands.`
        ));

      return safeReply(message, { components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => { });
    }


    if (message.content.toLowerCase() === 'stop') {
      if (!isDev) return;
      if (global.activeVCTours instanceof Set && global.activeVCTours.has(message.guild.id)) {
        global.activeVCTours.delete(message.guild.id);
        const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} **VC Tour loop stopped.**`));
        return safeReply(message, { components: [container] });
      }
    }

    if (runtimeConfig.maintenance && !isDev) return;

    if (runtimeConfig.aliasMode !== false) {
      const aliasData = allData.aliases;
      const triggerMap = getGuildTriggerMap(aliasData, message.guild);

      const content = message.content.toLowerCase().trim();
      const parts = content.split(/\s+/);
      const firstWord = parts[0];

      const aliasConfig = triggerMap.get(firstWord);

      if (aliasConfig && !message.content.startsWith(client.config.prefix)) {
        const hasManageRoles = message.member.permissions.has(PermissionsBitField.Flags.ManageRoles);

        if (!isDev && !hasManageRoles) return;

        if (!aliasConfig.requiredRole || message.member.roles.cache.has(aliasConfig.requiredRole)) {
          const role = message.guild.roles.cache.get(aliasConfig.roleId);
          if (role) {
            try {
              const targetInput = parts[1];
              const target = message.mentions.members.first() ||
                (targetInput ? await resolver.resolveMember(message.guild, targetInput) : message.member);

              if (!target) return;

              if (role.position >= message.guild.members.me.roles.highest.position) {
                return message.reply({ components: [cv2Error(`My role is not high enough to manage **${role.name}**.`)] });
              }

              const container = new ContainerBuilder().addSeparatorComponents(new SeparatorBuilder());
              if (target.roles.cache.has(role.id)) {
                await target.roles.remove(role, `Alias Role: ${aliasConfig.key}`);
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} Removed **${role.name}** from **${target.user.tag}**`));
                await safeReply(message, { components: [container] }).catch(() => { });
              } else {
                await target.roles.add(role, `Alias Role: ${aliasConfig.key}`);
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} Added **${role.name}** to **${target.user.tag}**`));
                await safeReply(message, { components: [container] }).catch(() => { });
              }
              return;
            } catch (err) {
              logger.error(`Alias Role Toggle Error: ${err.message}`);
            }
          }
        }
      }
    }

    let isNoPrefixUser = false;
    if (runtimeConfig.noPrefixUsers && Array.isArray(runtimeConfig.noPrefixUsers)) {
      const entry = runtimeConfig.noPrefixUsers.find(u => {
        if (typeof u === 'string') return u === message.author.id;
        return u.id === message.author.id;
      });
      if (entry) {
        if (typeof entry === 'string') { isNoPrefixUser = true; }
        else if (entry.permanent) { isNoPrefixUser = true; }
        else if (entry.expiresAt) {
          if (Date.now() < entry.expiresAt) { isNoPrefixUser = true; }
          else {
            runtimeConfig.noPrefixUsers = runtimeConfig.noPrefixUsers.filter(u => {
              if (typeof u === 'string') return u !== message.author.id;
              return u.id !== message.author.id;
            });
            storage.write('config.json', runtimeConfig);
          }
        }
      }
    }
    let usedPrefix = false;
    let content = message.content;

    if (message.content.startsWith(prefix)) {
      usedPrefix = true;
      content = message.content.slice(prefix.length);
    } else if (!isNoPrefixUser) { return; }

    const args = content.trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    if (!commandName) return;

    if (commandName === 'automod') {
      console.log(`[DEBUG] Intercepted ?automod command from ${message.author.tag} (${message.author.id}) in guild ${message.guild?.name || 'DM'}`);
      return safeReply(message, { content: 'use `/automod` to setup automod on server', flags: 0 }).catch(err => {
        console.error('[DEBUG] Failed to reply to ?automod:', err);
      });
    }

    const command = client.commands.get(commandName) || client.commands.get(client.aliases.get(commandName));
    if (!command) return;

    if (runtimeConfig.disabledCommands?.includes(command.name)) return;
    if (command.enabled === false) return;

    const blacklistData = allData.blacklist;
    if (blacklistData.users?.includes(message.author.id)) return;

    const cmdBlacklist = allData.cmdBlacklist;
    if (cmdBlacklist[message.channel.id]?.includes(command.name)) return;

    const staffData = allData.staff;
    const guildRoles = staffData[message.guild.id]?.roles || [];
    let isStaff = false;
    
    // The Staff Role system is a Premium feature. 
    // If the guild is not premium, we ignore the configured staff roles.
    if (isPremium && guildRoles.length > 0) {
      for (const roleId of guildRoles) {
        if (message.member.roles.cache.has(roleId)) {
          isStaff = true;
          break;
        }
      }
    }

    if (command.staffOnly && !isStaff && !isOwner && !isDev) {
      return sendAutoDelete(message, { components: [cv2Error('You are not a **Staff member** of this server.')], flags: MessageFlags.IsComponentsV2 }, 5000);
    }

    if (command.premiumOnly && !isDev) {
      if (!isPremium) {
        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        const devId = process.env.DEV_ID ? process.env.DEV_ID.split(',')[0] : null;
        
        const components = [cv2Error('This command is only available for **Premium** servers.\\nUse `?redeem <key>` if you have a premium key, or contact the bot owner to upgrade.')];
        
        if (devId) {
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setLabel('Contact Bot Owner')
              .setStyle(ButtonStyle.Link)
              .setURL(`https://discord.com/users/${devId}`)
          );
          components.push(row);
        }

        return sendAutoDelete(message, { components, flags: MessageFlags.IsComponentsV2 }, 15000);
      }
    }

    if (runtimeConfig.channelCommands?.[message.channel.id]?.disabled?.includes(command.name)) return;

    if (command.userPermissions && !isDev) {
      const missing = command.userPermissions.filter(p => !message.member.permissions.has(p));
      if (missing.length > 0) {
        return sendAutoDelete(message, { components: [cv2Error(`You need the following permission(s): \`${missing.join(', ')}\``)], flags: MessageFlags.IsComponentsV2 }, 5000);
      }
    }

    if (command.devOnly && !isDev) return; // Silent ignore for dev commands as requested

    const cooldownAmount = (command.cooldown !== undefined ? command.cooldown : (LIMITS.COOLDOWN_DEFAULT || 3)) * 1000;


    if (cooldownAmount > 0 && !isDev && !isOwner) {
      const key = `${message.author.id}-${command.name}`;
      const now = Date.now();
      if (client.cooldowns.has(key)) {
        const expiresAt = client.cooldowns.get(key);
        if (now < expiresAt) {
          const remaining = ((expiresAt - now) / 1000).toFixed(1);
          return sendAutoDelete(message, { components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_WARN} Cooldown active. Wait **${remaining}s**.`))], flags: MessageFlags.IsComponentsV2 }, 5000);
        }
      }
      client.cooldowns.set(key, now + cooldownAmount);
      setTimeout(() => client.cooldowns.delete(key), cooldownAmount);
    }

    try {
      const _t2 = Date.now();
      await command.execute(client, message, args);

      logger.cmd(message.author.tag, command.name);
    } catch (error) {
      logger.error(`Command ${command.name} failed: ${error.message}`);
      const errLogId = client.config.errorLogChannelId;
      if (errLogId) {
        const errLogCh = client.channels.cache.get(errLogId);
        if (errLogCh) {
          const logContainer = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Error Log`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Command Failed:** \`${command.name}\`\n\u25B8 **User:** ${message.author.tag} (${message.author.id})\n\u25B8 **Error:** \`\`\`\n${error.message}\n\`\`\``));
          safeSend(errLogCh, { components: [logContainer] }).catch(() => { });
        }
      }
      await sendAutoDelete(message, { components: [cv2Error(`An error occurred: \`${error.message}\``)], flags: MessageFlags.IsComponentsV2 }, 5000).catch(() => { });
    }

    const analytics = allData.analytics;
    if (!analytics[command.name]) analytics[command.name] = { uses: 0, lastUsed: 0, users: {} };
    analytics[command.name].uses++;
    analytics[command.name].lastUsed = Date.now();
    if (!analytics[command.name].users[message.author.id]) analytics[command.name].users[message.author.id] = 0;
    analytics[command.name].users[message.author.id]++;
    storage.write('analytics.json', analytics);
  }
};
