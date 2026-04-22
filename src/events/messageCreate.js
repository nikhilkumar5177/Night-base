const storage = require('../utils/storageManager');
const logger = require('../utils/logger');
const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { LIMITS, EMOJI_ERROR, EMOJI_LOADING, EMOJI_SUCCESS, EMOJI_WARN, EMOJI_OWNER, EMOJI_CHECK, SEP } = require('../utils/constants');

const { sendAutoDelete } = require('../utils/messageHelper');
const { handleAutoMod } = require('../automod/handlers/messageHandler');
const resolver = require('../utils/resolver');

let lastAliasData = null;
let aliasTriggerMap = new Map();

function updateAliasCache(aliasData) {
  if (aliasData === lastAliasData) return;
  lastAliasData = aliasData;
  aliasTriggerMap.clear();
  for (const [aliasKey, config] of Object.entries(aliasData)) {
    const triggers = [aliasKey, ...(config.aliases || [])];
    for (const t of triggers) {
      aliasTriggerMap.set(t.toLowerCase(), { ...config, key: aliasKey });
    }
  }
}

module.exports = {
  name: 'messageCreate',
  once: false,
  execute: async (client, message) => {
    if (message.author.bot) return;

    const runtimeConfig = storage.read('config.json');
    const prefix = runtimeConfig.prefix || client.config.prefix;

    // Run AutoMod
    await handleAutoMod(client, message);

    // Mention Response (Prefix Reminder)
    const mentionRegex = new RegExp(`^<@!?${client.user.id}>$`);
    if (mentionRegex.test(message.content)) {
      if (!client._mentionCooldowns) client._mentionCooldowns = new Map();
      const now = Date.now();
      const cooldown = 60000;
      const lastUsed = client._mentionCooldowns.get(message.author.id) || 0;

      if (now - lastUsed < cooldown) return;
      client._mentionCooldowns.set(message.author.id, now);

      const embed = new EmbedBuilder()
        .setColor(client.config.embedColor || '#5865F2')
        .setAuthor({ name: 'Wild Wolf \u2502 System Info', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n\u25B8 My prefix for this server is \`${prefix}\`\n\u25B8 Use \`${prefix}help\` to see all commands.\n${SEP}`)
        .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();

      return message.reply({ embeds: [embed] }).catch(() => {});
    }

    if (message.webhookId && message.guild) {
      const securityConfig = storage.read('security.json');
      if (securityConfig.enabled) {
        if (!client._webhookTracker) client._webhookTracker = new Map();
        const guildId = message.guild.id;
        const now = Date.now();
        if (!client._webhookTracker.has(guildId)) client._webhookTracker.set(guildId, []);
        const tracked = client._webhookTracker.get(guildId);
        tracked.push(now);
        const recent = tracked.filter(t => now - t < 10000);
        client._webhookTracker.set(guildId, recent);
        const mentionsEveryone = message.content.includes('@everyone') || message.content.includes('@here');
        let largeMention = false;
        message.mentions.roles.forEach(role => {
          if (role.members.size / message.guild.memberCount >= 0.8) largeMention = true;
        });
        if (recent.length >= 2 && (mentionsEveryone || largeMention)) {
          try {
            await message.delete().catch(() => { });
            const webhooks = await message.channel.fetchWebhooks().catch(() => null);
            if (webhooks) { for (const [, wh] of webhooks) { await wh.delete('Security: Webhook spam').catch(() => { }); } }
            const owner = await message.guild.fetchOwner().catch(() => null);
            const staffData = storage.read('staff.json');
            const staffMentions = staffData.roles ? staffData.roles.map(r => `<@&${r}>`).join(' ') : '';
            const alertEmbed = new EmbedBuilder().setColor('#ff1744').setTitle(`${EMOJI_ERROR} Webhook Spam Detected`).setDescription('Suspicious webhook activity neutralized.').addFields({ name: 'Channel', value: `${message.channel}`, inline: true }).setTimestamp();
            const logCh = message.guild.channels.cache.find(c => c.name.includes('security') || c.name.includes('log')) || message.channel;
            await logCh.send({ content: `${owner || ''} ${staffMentions}`, embeds: [alertEmbed] }).catch(() => { });
            const logs = securityConfig.logs || [];
            logs.push({ type: 'webhook_spam', guildId, channelId: message.channel.id, timestamp: now });
            securityConfig.logs = logs.slice(-100);
            storage.write('security.json', securityConfig);
          } catch { }
          client._webhookTracker.delete(guildId);
          return;
        }
      }
    }



    if (message.content === 'update') {
      if (message.author.id !== process.env.DEV_ID) return

      const { exec } = require('child_process')

      const loading = new EmbedBuilder()
        .setColor('#EB459E')
        .setAuthor({ name: 'Wild Wolf │ Updating', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${EMOJI_LOADING} Pulling latest changes...`)
        .setTimestamp()

      const msg = await message.reply({ embeds: [loading] })

      exec('git reset --hard && git pull', async (err, stdout, stderr) => {
        if (err) {
          return msg.edit({
            embeds: [
              new EmbedBuilder()
                .setColor('#ED4245')
                .setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() })
                .setDescription(`${EMOJI_ERROR} ${err.message}`)
                .setTimestamp()
            ]
          })
        }

        if (stderr) {
          return msg.edit({
            embeds: [
              new EmbedBuilder()
                .setColor('#ffab00')
                .setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() })
                .setDescription(`${EMOJI_WARN} ${stderr}`)
                .setTimestamp()
            ]
          })
        }

        const success = new EmbedBuilder()
          .setColor('#00e676')
          .setAuthor({ name: 'Wild Wolf │ Updated', iconURL: client.user.displayAvatarURL() })
          .setDescription(`${EMOJI_SUCCESS} Update completed\n\`\`\`\n${stdout.slice(0, 1500)}\n\`\`\``)
          .setTimestamp()

        await msg.edit({ embeds: [success] })
      })

      return
    }

    if (message.content.toLowerCase() === 'stop') {
      if (message.author.id !== process.env.DEV_ID) return;
      if (global.activeVCTours instanceof Set && global.activeVCTours.has(message.guild.id)) {
        global.activeVCTours.delete(message.guild.id);
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#57F287')
              .setDescription(`${EMOJI_SUCCESS} **VC Tour loop stopped.**`)
              .setTimestamp()
          ]
        });
      }
    }

    const vouchData = storage.read('vouch.json');
    if (vouchData.channels && vouchData.channels.includes(message.channel.id)) {
      try {
        const target = message.mentions.users.first();
        const cleanContent = target ? message.content.replace(new RegExp(`<@!?${target.id}>`, 'g'), '').trim() : message.content;

        const embed = new EmbedBuilder()
          .setColor(client.config.embedColor || '#0099ff')
          .setAuthor({ name: 'Wild Wolf \u2502 New Vouch', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
          .setDescription(`\u25B8 **Vouched:** ${target || '`N/A`'}\n\u25B8 **By:** ${message.author}\n\u25B8 **Message:** ${cleanContent || 'No content'}`)
          .setTimestamp();

        if (message.attachments.size > 0) {
          embed.setImage(message.attachments.first().url);
        }
        const sent = await message.reply({ embeds: [embed] });
        await message.delete().catch(() => { });
        await sent.react(EMOJI_CHECK).catch(() => { });
      } catch { }
      return;
    }

    if (runtimeConfig.maintenance && message.author.id !== process.env.DEV_ID) return;


    if (runtimeConfig.aliasMode !== false) {
      const aliasData = storage.read('aliases.json');
      updateAliasCache(aliasData);

      const content = message.content.toLowerCase().trim();
      const parts = content.split(/\s+/);
      const firstWord = parts[0];

      // Flexible check: Trigger if the first word is an alias
      const aliasConfig = aliasTriggerMap.get(firstWord);

      if (aliasConfig && !message.content.startsWith(client.config.prefix)) {
        const isDev = message.author.id === process.env.DEV_ID;
        const hasManageRoles = message.member.permissions.has(PermissionsBitField.Flags.ManageRoles);

        if (!isDev && !hasManageRoles) return;

        if (!aliasConfig.requiredRole || message.member.roles.cache.has(aliasConfig.requiredRole)) {
          const role = message.guild.roles.cache.get(aliasConfig.roleId);
          if (role) {
            try {
              // Priority: Mentioned user -> Second word (ID/Tag) -> Author
              const targetInput = parts[1];
              const target = message.mentions.members.first() || 
                             (targetInput ? await resolver.resolveMember(message.guild, targetInput) : message.member);

              if (!target) return; // Silent fail if input provided but user not found

              // Hierarchy Check
              if (role.position >= message.guild.members.me.roles.highest.position) {
                return message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`${EMOJI_ERROR} My role is not high enough to manage **${role.name}**.`)] });
              }

              if (target.roles.cache.has(role.id)) {
                await target.roles.remove(role, `Alias Role: ${aliasConfig.key}`);
                const embed = new EmbedBuilder().setColor('#ff5252').setDescription(`${EMOJI_SUCCESS} Removed **${role.name}** from **${target.user.tag}**`).setTimestamp();
                await message.reply({ embeds: [embed] });
              } else {
                await target.roles.add(role, `Alias Role: ${aliasConfig.key}`);
                const embed = new EmbedBuilder().setColor('#00e676').setDescription(`${EMOJI_SUCCESS} Added **${role.name}** to **${target.user.tag}**`).setTimestamp();
                await message.reply({ embeds: [embed] });
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
        if (typeof entry === 'string') {
          isNoPrefixUser = true;
        } else if (entry.permanent) {
          isNoPrefixUser = true;
        } else if (entry.expiresAt) {
          if (Date.now() < entry.expiresAt) {
            isNoPrefixUser = true;
          } else {
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
    } else if (!isNoPrefixUser) {
      return;
    }

    const args = content.trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    if (!commandName) return;

    const command = client.commands.get(commandName) || client.commands.get(client.aliases.get(commandName));
    if (!command) return;


    const disabledCommands = runtimeConfig.disabledCommands || [];
    if (disabledCommands.includes(command.name)) return;
    if (command.enabled === false) return;

    const blacklistData = storage.read('blacklist.json');
    if (blacklistData.users && blacklistData.users.includes(message.author.id)) return;

    const cmdBlacklist = storage.read('cmdBlacklist.json');
    if (cmdBlacklist[message.channel.id] && cmdBlacklist[message.channel.id].includes(command.name)) return;

    const isDev = message.author.id === process.env.DEV_ID;
    const staffData = storage.read('staff.json');
    const memberRoles = message.member ? message.member.roles.cache.map(r => r.id) : [];
    const isStaff = staffData.roles && staffData.roles.some(r => memberRoles.includes(r));

    // 1. Staff Check
    if (command.staffOnly && !isStaff && !isDev) {
      return sendAutoDelete(message, {
        embeds: [
          new EmbedBuilder()
            .setColor('#ED4245')
            .setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() })
            .setDescription(`${EMOJI_ERROR} You are not a **Staff member** of this server.`)
            .setTimestamp()
        ]
      }, 5000);
    }

    if (runtimeConfig.channelCommands) {
      const channelConfig = runtimeConfig.channelCommands[message.channel.id];
      if (channelConfig && channelConfig.disabled && channelConfig.disabled.includes(command.name)) return;
    }

    // 2. Permission Check
    if (command.userPermissions && !isDev) {
      const missing = command.userPermissions.filter(p => !message.member.permissions.has(p));
      if (missing.length > 0) {
        return sendAutoDelete(message, {
          embeds: [
            new EmbedBuilder()
              .setColor('#ED4245')
              .setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() })
              .setDescription(`${EMOJI_ERROR} You need the following permission(s) to use this command: \`${missing.join(', ')}\``)
              .setTimestamp()
          ]
        }, 5000);
      }
    }

    if (command.devOnly && message.author.id !== process.env.DEV_ID) {
      return sendAutoDelete(message, {
        embeds: [
          new EmbedBuilder()
            .setColor('#ED4245')
            .setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() })
            .setDescription(`${EMOJI_OWNER} This is an **Owner Command**.`)
            .setTimestamp()
        ]
      }, 5000);
    }

    const cooldownAmount = (command.cooldown !== undefined ? command.cooldown : (LIMITS.COOLDOWN_DEFAULT || 3)) * 1000;
    if (cooldownAmount > 0) {
      const key = `${message.author.id}-${command.name}`;
      const now = Date.now();
      if (client.cooldowns.has(key)) {
        const expiresAt = client.cooldowns.get(key);
        if (now < expiresAt) {
          const remaining = ((expiresAt - now) / 1000).toFixed(1);
          const embed = new EmbedBuilder()
            .setColor('#ffab00')
            .setDescription(`${EMOJI_WARN} Cooldown active. Wait **${remaining}s**.`)
            .setTimestamp();
          return sendAutoDelete(message, { embeds: [embed] }, 5000);
        }
      }
      client.cooldowns.set(key, now + cooldownAmount);
      setTimeout(() => client.cooldowns.delete(key), cooldownAmount);
    }

    try {
      if (command.staffOnly || command.userPermissions) {
        await new Promise(r => setTimeout(r, 2000));
        // Check if message still exists after delay
        if (!message.guild.messages.cache.has(message.id)) {
          const fetched = await message.channel.messages.fetch(message.id).catch(() => null);
          if (!fetched) return; // Message was deleted
        }
      }
      await command.execute(client, message, args);
      logger.cmd(message.author.tag, command.name);
    } catch (error) {
      logger.error(`Command ${command.name} failed: ${error.message}`);
      await sendAutoDelete(message, {
        embeds: [
          new EmbedBuilder()
            .setColor('#ED4245')
            .setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() })
            .setDescription(`${EMOJI_ERROR} An error occurred while executing this command.\n\`\`\`\n${error.message}\n\`\`\``)
            .setTimestamp()
        ]
      }, 5000);
    }

    const analytics = storage.read('analytics.json');
    if (!analytics[command.name]) analytics[command.name] = { uses: 0, lastUsed: 0, users: {} };
    analytics[command.name].uses++;
    analytics[command.name].lastUsed = Date.now();
    if (!analytics[command.name].users[message.author.id]) analytics[command.name].users[message.author.id] = 0;
    analytics[command.name].users[message.author.id]++;
    storage.write('analytics.json', analytics);
  }
};
