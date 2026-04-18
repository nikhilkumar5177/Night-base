const storage = require('../utils/storageManager');
const logger = require('../utils/logger');
const { EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'messageCreate',
  once: false,
  execute: async (client, message) => {
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
            await message.delete().catch(() => {});
            const webhooks = await message.channel.fetchWebhooks().catch(() => null);
            if (webhooks) { for (const [, wh] of webhooks) { await wh.delete('Security: Webhook spam').catch(() => {}); } }
            const owner = await message.guild.fetchOwner().catch(() => null);
            const staffData = storage.read('staff.json');
            const staffMentions = staffData.roles ? staffData.roles.map(r => `<@&${r}>`).join(' ') : '';
            const alertEmbed = new EmbedBuilder().setColor('#ff1744').setTitle('{EMOJI_ERROR} Webhook Spam Detected').setDescription('Suspicious webhook activity neutralized.').addFields({ name: 'Channel', value: `${message.channel}`, inline: true }).setTimestamp();
            const logCh = message.guild.channels.cache.find(c => c.name.includes('security') || c.name.includes('log')) || message.channel;
            await logCh.send({ content: `${owner || ''} ${staffMentions}`, embeds: [alertEmbed] }).catch(() => {});
            const logs = securityConfig.logs || [];
            logs.push({ type: 'webhook_spam', guildId, channelId: message.channel.id, timestamp: now });
            securityConfig.logs = logs.slice(-100);
            storage.write('security.json', securityConfig);
          } catch {}
          client._webhookTracker.delete(guildId);
          return;
        }
      }
    }

    if (message.author.bot) return;

    const vouchData = storage.read('vouch.json');
    if (vouchData.channels && vouchData.channels.includes(message.channel.id)) {
      try {
        const embed = new EmbedBuilder()
          .setColor(client.config.embedColor || '#0099ff')
          .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
          .setDescription(message.content || 'No content')
          .setTimestamp();
        if (message.attachments.size > 0) {
          embed.setImage(message.attachments.first().url);
        }
        const sent = await message.channel.send({ embeds: [embed] });
        await message.delete().catch(() => {});
        await sent.react('{EMOJI_CHECK}').catch(() => {});
        await sent.react('{EMOJI_CROSS}').catch(() => {});
      } catch {}
      return;
    }

    const runtimeConfig = storage.read('config.json');

    if (runtimeConfig.aliasMode !== false) {
      const aliasData = storage.read('aliases.json');
      const content = message.content.toLowerCase().trim();

      for (const [aliasKey, aliasConfig] of Object.entries(aliasData)) {
        const triggers = [aliasKey, ...(aliasConfig.aliases || [])].map(a => a.toLowerCase());

        if (triggers.includes(content)) {
          if (aliasConfig.requiredRole && !message.member.roles.cache.has(aliasConfig.requiredRole)) {
            continue;
          }

          const role = message.guild.roles.cache.get(aliasConfig.roleId);
          if (!role) continue;

          try {
            const target = message.mentions.members.first() || message.member;
            if (target.roles.cache.has(role.id)) {
              await target.roles.remove(role);
            } else {
              await target.roles.add(role);
            }
            const embed = new EmbedBuilder()
              .setColor('#00e676')
              .setDescription(`{EMOJI_SUCCESS} Role ${role.name} updated for ${target.user.tag}`)
              .setTimestamp();
            const reply = await message.channel.send({ embeds: [embed] });
            setTimeout(() => reply.delete().catch(() => {}), 5000);
          } catch {}
          return;
        }
      }
    }

    const prefix = client.config.prefix;
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

    if (runtimeConfig.channelCommands) {
      const channelConfig = runtimeConfig.channelCommands[message.channel.id];
      if (channelConfig && channelConfig.disabled && channelConfig.disabled.includes(command.name)) return;
    }

    if (command.staffOnly) {
      const staffData = storage.read('staff.json');
      const memberRoles = message.member ? message.member.roles.cache.map(r => r.id) : [];
      const isStaff = staffData.roles && staffData.roles.some(r => memberRoles.includes(r));
      const isDev = message.author.id === process.env.DEV_ID;
      const isAdmin = message.member && message.member.permissions.has(PermissionsBitField.Flags.Administrator);
      if (!isStaff && !isDev && !isAdmin) return;
    }

    if (command.devOnly && message.author.id !== process.env.DEV_ID) return;

    if (command.cooldown) {
      const key = `${message.author.id}-${command.name}`;
      const now = Date.now();
      if (client.cooldowns.has(key)) {
        const expiresAt = client.cooldowns.get(key);
        if (now < expiresAt) {
          const remaining = ((expiresAt - now) / 1000).toFixed(1);
          const embed = new EmbedBuilder()
            .setColor('#ffab00')
            .setDescription(`{EMOJI_WARN} Cooldown active. Wait **${remaining}s**.`)
            .setTimestamp();
          const reply = await message.channel.send({ embeds: [embed] });
          setTimeout(() => reply.delete().catch(() => {}), 5000);
          return;
        }
      }
      client.cooldowns.set(key, now + (command.cooldown * 1000));
      setTimeout(() => client.cooldowns.delete(key), command.cooldown * 1000);
    }

    try {
      await command.execute(client, message, args);
      logger.cmd(message.author.tag, command.name);
    } catch (error) {
      logger.error(`Command ${command.name} failed: ${error.message}`);
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
