const { EmbedBuilder } = require('discord.js');
const storage = require('../../utils/storageManager');

module.exports = {
  name: 'noprefix',
  aliases: ['np', 'nopre'],
  description: 'Grant or revoke no-prefix access for users',
  usage: 'noprefix <add|remove|list> <@user> [duration]',
  cooldown: 3,
  enabled: true,
  staffOnly: false,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (message.author.id !== message.guild.ownerId && message.author.id !== process.env.DEV_ID) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ff1744').setTitle('{EMOJI_ERROR} Owner Only').setDescription('Only the server owner can manage no-prefix access.').setTimestamp()] });
      }

      const action = args[0]?.toLowerCase();
      const configData = storage.read('config.json');
      if (!configData.noPrefixUsers) configData.noPrefixUsers = [];

      if (action === 'list') {
        if (configData.noPrefixUsers.length === 0) {
          return message.reply({ embeds: [new EmbedBuilder().setColor(client.config.embedColor || '#0099ff').setTitle('{EMOJI_INFO} No-Prefix Users').setDescription('No users have no-prefix access.').setTimestamp()] });
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
          if (remaining <= 0) {
            return `**${i + 1}.** ${name} \u2014 \`EXPIRED\``;
          }

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

        const embed = new EmbedBuilder()
          .setColor(client.config.embedColor || '#0099ff')
          .setTitle('{EMOJI_INFO} No-Prefix Users')
          .setDescription(list)
          .setFooter({ text: `${configData.noPrefixUsers.length} total entries` })
          .setTimestamp();
        return message.reply({ embeds: [embed] });
      }

      const target = message.mentions.users.first() || client.users.cache.get(args[1]);
      if (!target) {
        const usageEmbed = new EmbedBuilder()
          .setColor('#8B0000')
          .setAuthor({ name: 'WRONG SYNTAX', iconURL: client.user.displayAvatarURL() })
          .setDescription('**You used this command the wrong way.**\nRead the correct format below before trying again.')
          .addFields(
            { name: '\u2501\u2501 Correct Format', value: `\`\`\`fix\n${client.config.prefix}noprefix <add|remove|list> <@user> [duration]\n\`\`\`` },
            { name: '\u2501\u2501 Examples', value: `\`\`\`\n${client.config.prefix}noprefix add @User\n${client.config.prefix}noprefix add @User 7d\n${client.config.prefix}noprefix add @User 24h\n${client.config.prefix}noprefix add @User 2mo\n${client.config.prefix}noprefix remove @User\n${client.config.prefix}noprefix list\n\`\`\`` },
            { name: 'No Duration', value: '`= Permanent`', inline: true },
            { name: 'Aliases', value: '`np`, `nopre`', inline: true },
            { name: 'Time Formats', value: '`m` `h` `d` `mo`', inline: true }
          )
          .setFooter({ text: 'Wild Wolf \u2022 Use it right or don\'t use it at all.' })
          .setTimestamp();
        return message.reply({ embeds: [usageEmbed] });
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
          entry = {
            id: target.id,
            permanent: true,
            addedBy: message.author.id,
            addedAt: Date.now()
          };
        } else {
          const match = durationStr.match(/^(\d+)(mo|m|h|d)$/);
          if (!match) {
            return message.reply({ embeds: [new EmbedBuilder().setColor('#ff1744').setTitle('{EMOJI_ERROR} Invalid Duration').setDescription('Use format: `30m`, `12h`, `7d`, `2mo`').setTimestamp()] });
          }

          const amount = parseInt(match[1]);
          const unit = match[2];
          const multipliers = { m: 60000, h: 3600000, d: 86400000, mo: 2592000000 };
          const duration = amount * multipliers[unit];

          if (duration > 365 * 86400000) {
            return message.reply({ embeds: [new EmbedBuilder().setColor('#ff1744').setTitle('{EMOJI_ERROR} Too Long').setDescription('Maximum duration is 365 days.').setTimestamp()] });
          }

          entry = {
            id: target.id,
            permanent: false,
            expiresAt: Date.now() + duration,
            addedBy: message.author.id,
            addedAt: Date.now()
          };
        }

        configData.noPrefixUsers.push(entry);
        storage.write('config.json', configData);

        const embed = new EmbedBuilder()
          .setColor('#00e676')
          .setTitle('{EMOJI_SUCCESS} No-Prefix Access Granted')
          .addFields(
            { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
            { name: 'Type', value: entry.permanent ? '`Permanent`' : '`Timed`', inline: true },
            { name: 'Duration', value: entry.permanent ? '`Forever`' : `\`${durationStr}\``, inline: true },
            { name: 'Granted By', value: message.author.tag }
          );

        if (!entry.permanent) {
          embed.addFields({ name: 'Expires', value: `<t:${Math.floor(entry.expiresAt / 1000)}:F> (<t:${Math.floor(entry.expiresAt / 1000)}:R>)` });
        }

        embed.setFooter({ text: 'Wild Wolf \u2022 User can now use commands without prefix' }).setTimestamp();
        return message.reply({ embeds: [embed] });
      }

      if (action === 'remove') {
        const exists = configData.noPrefixUsers.find(u => {
          if (typeof u === 'string') return u === target.id;
          return u.id === target.id;
        });

        if (!exists) {
          return message.reply({ embeds: [new EmbedBuilder().setColor('#ffab00').setTitle('{EMOJI_WARN} Not Found').setDescription(`**${target.tag}** does not have no-prefix access.`).setTimestamp()] });
        }

        configData.noPrefixUsers = configData.noPrefixUsers.filter(u => {
          if (typeof u === 'string') return u !== target.id;
          return u.id !== target.id;
        });
        storage.write('config.json', configData);

        const embed = new EmbedBuilder()
          .setColor('#ff6d00')
          .setTitle('{EMOJI_SUCCESS} No-Prefix Access Revoked')
          .addFields(
            { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
            { name: 'Removed By', value: message.author.tag, inline: true }
          )
          .setFooter({ text: 'Wild Wolf \u2022 User must now use prefix for commands' })
          .setTimestamp();
        return message.reply({ embeds: [embed] });
      }

      const usageEmbed = new EmbedBuilder()
        .setColor('#8B0000')
        .setAuthor({ name: 'WRONG SYNTAX', iconURL: client.user.displayAvatarURL() })
        .setDescription('**Invalid action.**\nUse `add`, `remove`, or `list`.')
        .addFields(
          { name: '\u2501\u2501 Correct Format', value: `\`\`\`fix\n${client.config.prefix}noprefix <add|remove|list> <@user> [duration]\n\`\`\`` },
          { name: '\u2501\u2501 Examples', value: `\`\`\`\n${client.config.prefix}noprefix add @User\n${client.config.prefix}noprefix add @User 7d\n${client.config.prefix}noprefix remove @User\n\`\`\`` }
        )
        .setFooter({ text: 'Wild Wolf \u2022 Use it right or don\'t use it at all.' })
        .setTimestamp();
      message.reply({ embeds: [usageEmbed] });
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().setColor('#ff1744').setTitle('{EMOJI_ERROR} Error').setDescription(error.message).setTimestamp()] });
    }
  }
};
