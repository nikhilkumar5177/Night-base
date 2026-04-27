const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const storage = require('../../utils/storageManager');
const { EMOJI_OWNER, EMOJI_INFO, EMOJI_WARN, EMOJI_SUCCESS, EMOJI_DOT } = require('../../utils/constants');
const { sendUsage, cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'noprefix',
  aliases: ['np', 'nopre'],
  description: 'Grant or revoke no-prefix access for users',
  usage: 'noprefix <add|remove|list> <@user> [duration]',
  cooldown: 3,
  enabled: true,
  staffOnly: false,
  devOnly: true,
  execute: async (client, message, args) => {
    try {
      if (message.author.id !== message.guild.ownerId && message.author.id !== process.env.DEV_ID) {
        return message.reply({ components: [cv2Error('Only the server owner can manage no-prefix access.')], flags: 32768 });
      }

      const action = args[0]?.toLowerCase();
      const configData = storage.read('config.json');
      if (!configData.noPrefixUsers) configData.noPrefixUsers = [];

      if (action === 'list') {
        if (configData.noPrefixUsers.length === 0) {
          const container = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_INFO} **No users have no-prefix access.**`));
          return message.reply({ components: [container], flags: 32768 });
        }

        const now = Date.now();
        const list = configData.noPrefixUsers.map((entry, i) => {
          if (typeof entry === 'string') {
            const user = client.users.cache.get(entry);
            return `**${i + 1}.** ${user ? user.tag : entry} \u2014 \`Permanent\` (legacy)`;
          }
          const user = client.users.cache.get(entry.id);
          const name = user ? user.tag : entry.id;
          const addedBy = client.users.cache.get(entry.addedBy);
          const addedByTag = addedBy ? addedBy.tag : entry.addedBy;

          if (entry.permanent) {
            return `**${i + 1}.** ${name} \u2014 \`Permanent\`\nAdded by: ${addedByTag} \u2014 <t:${Math.floor(entry.addedAt / 1000)}:R>`;
          }

          const remaining = entry.expiresAt - now;
          if (remaining <= 0) return `**${i + 1}.** ${name} \u2014 \`EXPIRED\``;

          const months = Math.floor(remaining / 2592000000);
          const days = Math.floor((remaining % 2592000000) / 86400000);
          const hours = Math.floor((remaining % 86400000) / 3600000);
          const mins = Math.floor((remaining % 3600000) / 60000);
          let timeStr = '';
          if (months > 0) timeStr += `${months}mo `;
          if (days > 0) timeStr += `${days}d `;
          if (hours > 0) timeStr += `${hours}h `;
          if (mins > 0) timeStr += `${mins}m`;
          if (!timeStr) timeStr = '<1m';

          return `**${i + 1}.** ${name} \u2014 \`${timeStr.trim()}\` remaining\nAdded by: ${addedByTag} \u2014 Expires: <t:${Math.floor(entry.expiresAt / 1000)}:R>`;
        }).join('\n\n');

        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 No-Prefix Users`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(list));
        return message.reply({ components: [container], flags: 32768 }).catch(() => {});
      }

      const target = message.mentions.users.first() || client.users.cache.get(args[1]);
      if (!target) {
        return sendUsage(message, module.exports);
      }

      if (action === 'add') {
        const existing = configData.noPrefixUsers.find(u => {
          if (typeof u === 'string') return u === target.id;
          return u.id === target.id;
        });
        if (existing) {
          configData.noPrefixUsers = configData.noPrefixUsers.filter(u => {
            if (typeof u === 'string') return u !== target.id;
            return u.id !== target.id;
          });
        }

        const durationStr = args[2]?.toLowerCase();
        let entry;

        if (!durationStr) {
          entry = { id: target.id, permanent: true, addedBy: message.author.id, addedAt: Date.now() };
        } else {
          const match = durationStr.match(/^(\d+)(mo|m|h|d)$/);
          if (!match) {
            return message.reply({ components: [cv2Error('Use format: `30m`, `12h`, `7d`, `2mo`')], flags: 32768 });
          }
          const amount = parseInt(match[1]);
          const unit = match[2];
          const multipliers = { m: 60000, h: 3600000, d: 86400000, mo: 2592000000 };
          const duration = amount * multipliers[unit];
          if (duration > 365 * 86400000) {
            return message.reply({ components: [cv2Error('Maximum duration is 365 days.')], flags: 32768 });
          }
          entry = { id: target.id, permanent: false, expiresAt: Date.now() + duration, addedBy: message.author.id, addedAt: Date.now() };
        }

        configData.noPrefixUsers.push(entry);
        storage.write('config.json', configData);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 No-Prefix Granted`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${EMOJI_SUCCESS} **No-prefix access granted.**\n` +
            `${EMOJI_DOT} **User:** ${target.tag} (\`${target.id}\`)\n` +
            `${EMOJI_DOT} **Type:** ${entry.permanent ? '\`Permanent\`' : '\`Timed\`'}\n` +
            `${EMOJI_DOT} **Duration:** ${entry.permanent ? '\`Forever\`' : `\`${durationStr}\``}\n` +
            `${EMOJI_DOT} **By:** ${message.author.tag}` +
            (entry.permanent ? '' : `\n${EMOJI_DOT} **Expires:** <t:${Math.floor(entry.expiresAt / 1000)}:R>`)
          ));
        return message.reply({ components: [container], flags: 32768 }).catch(() => {});
      }

      if (action === 'remove') {
        const exists = configData.noPrefixUsers.find(u => {
          if (typeof u === 'string') return u === target.id;
          return u.id === target.id;
        });
        if (!exists) {
          const warnContainer = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_WARN} **${target.tag}** does not have no-prefix access.`));
          return message.reply({ components: [warnContainer], flags: 32768 });
        }

        configData.noPrefixUsers = configData.noPrefixUsers.filter(u => {
          if (typeof u === 'string') return u !== target.id;
          return u.id !== target.id;
        });
        storage.write('config.json', configData);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 No-Prefix Revoked`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${EMOJI_SUCCESS} **No-prefix access revoked.**\n` +
            `${EMOJI_DOT} **User:** ${target.tag} (\`${target.id}\`)\n` +
            `${EMOJI_DOT} **By:** ${message.author.tag}`
          ));
        return message.reply({ components: [container], flags: 32768 }).catch(() => {});
      }

      return sendUsage(message, module.exports);
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
