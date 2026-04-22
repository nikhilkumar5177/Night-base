const { EmbedBuilder } = require('discord.js');
const { LIMITS, SEP, EMOJI_SUCCESS, EMOJI_ERROR, EMOJI_WARN, EMOJI_LOADING } = require('../../utils/constants');
const { sendUsage, sendAutoDelete } = require('../../utils/messageHelper');


module.exports = {
  name: 'purge',
  aliases: ['clear', 'prune'],
  description: 'Purge messages with filters',
  usage: 'purge <count | bots | embeds | @user> [count]',
  example: 'purge 50\npurge bots 20\npurge @User 10',
  cooldown: 5,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  userPermissions: ['ManageMessages'],
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('ManageMessages')) {
        return sendAutoDelete(message, { embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_ERROR} You need **ManageMessages** permission.`).setTimestamp()] }, 5000);
      }
      if (!message.guild.members.me.permissions.has('ManageMessages')) {
        return sendAutoDelete(message, { embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_ERROR} I need **ManageMessages** permission.`).setTimestamp()] }, 5000);
      }
      if (!args[0]) {
        return sendUsage(message, module.exports);
      }

      let count = Math.min(parseInt(args[0]) || parseInt(args[1]) || 50, LIMITS.MAX_PURGE);
      const type = args[0].toLowerCase();

      const loadEmbed = new EmbedBuilder()
        .setColor('#EB459E')
        .setAuthor({ name: 'Wild Wolf \u2502 Purging', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n${EMOJI_LOADING} **Scanning and deleting messages...**\n\n\`\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\` Processing\n${SEP}`)
        .setTimestamp();
      
      const progressMsg = await sendAutoDelete(message, { embeds: [loadEmbed] }, 0);
      await message.delete().catch(() => {});

      let fetched = await message.channel.messages.fetch({ limit: count });
      let filtered;
      let filterLabel = 'All Messages';

      if (type === 'bots') { filtered = fetched.filter(m => m.author.bot); filterLabel = 'Bot Messages'; }
      else if (type === 'embeds') { filtered = fetched.filter(m => m.embeds.length > 0); filterLabel = 'Embeds'; }
      else if (message.mentions.users.size > 0) {
        const tu = message.mentions.users.first();
        count = parseInt(args[1]) || 50;
        fetched = await message.channel.messages.fetch({ limit: Math.min(count, LIMITS.MAX_PURGE) });
        filtered = fetched.filter(m => m.author.id === tu.id);
        filterLabel = `Messages by ${tu.tag}`;
      } else {
        count = parseInt(type);
        if (isNaN(count) || count < 1) {
          await progressMsg.delete().catch(() => {});
          return sendAutoDelete(message, { embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_ERROR} Invalid count.`).setTimestamp()] }, 5000);
        }
        filtered = fetched;
      }

      const twoWeeks = Date.now() - 14 * 24 * 60 * 60 * 1000;
      const deletable = filtered.filter(m => m.createdTimestamp > twoWeeks && m.id !== progressMsg.id);

      if (deletable.size === 0) {
        return progressMsg.edit({ embeds: [new EmbedBuilder().setColor('#FEE75C').setAuthor({ name: 'Wild Wolf \u2502 Purge', iconURL: client.user.displayAvatarURL() }).setDescription(`${SEP}\n${EMOJI_WARN} **No deletable messages found.**\nMessages older than 14 days cannot be bulk deleted.\n${SEP}`).setTimestamp()] });
      }

      const deleted = await message.channel.bulkDelete(deletable, true);

      const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setAuthor({ name: 'Wild Wolf \u2502 Purge Complete', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n${EMOJI_SUCCESS} **Messages purged successfully.**\n${SEP}`)
        .addFields(
          { name: '\u25B8 Deleted', value: `\`${deleted.size}\` messages`, inline: true },
          { name: '\u25B8 Filter', value: `\`${filterLabel}\``, inline: true },
          { name: '\u25B8 By', value: message.author.tag, inline: true }
        )
        .setFooter({ text: 'Wild Wolf \u2022 This message will auto-delete in 5s' })
        .setTimestamp();
      await progressMsg.edit({ embeds: [embed] }).catch(() => {});
      setTimeout(() => progressMsg.delete().catch(() => {}), 5000);
    } catch (error) {
      sendAutoDelete(message, { embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_ERROR} ${error.message}`).setTimestamp()] }, 5000);
    }
  }
};
