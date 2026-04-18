const { EmbedBuilder } = require('discord.js');
const { LIMITS } = require('../../utils/constants');
const { sendAutoDelete } = require('../../utils/messageHelper');

const SEP = '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501';

module.exports = {
  name: 'purge',
  aliases: ['clear', 'prune'],
  description: 'Purge messages with filters',
  usage: 'purge <count | bots | embeds | @user> [count]',
  cooldown: 5,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('ManageMessages')) {
        return sendAutoDelete(message.channel, { embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription('{EMOJI_ERROR} You need **ManageMessages** permission.').setTimestamp()] }, 5000);
      }
      if (!message.guild.members.me.permissions.has('ManageMessages')) {
        return sendAutoDelete(message.channel, { embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription('{EMOJI_ERROR} I need **ManageMessages** permission.').setTimestamp()] }, 5000);
      }
      if (!args[0]) {
        return sendAutoDelete(message.channel, { embeds: [new EmbedBuilder().setColor('#8B0000').setAuthor({ name: 'WRONG SYNTAX', iconURL: client.user.displayAvatarURL() }).setDescription('**You used this command the wrong way.**\nRead the correct format below before trying again.').addFields({ name: '\u2501\u2501 Correct Format', value: `\`\`\`fix\n${client.config.prefix}purge <count | bots | embeds | @user> [count]\n\`\`\`` }, { name: '\u2501\u2501 Examples', value: `\`\`\`\n${client.config.prefix}purge 50\n${client.config.prefix}purge bots\n${client.config.prefix}purge @User 20\n\`\`\`` }, { name: 'Aliases', value: '`clear`, `prune`', inline: true }, { name: 'Cooldown', value: '`5s`', inline: true }, { name: 'Max', value: '`100 msgs`', inline: true }).setFooter({ text: 'Wild Wolf \u2022 Use it right or don\'t use it at all.' }).setTimestamp()] }, 15000);
      }

      let count = Math.min(parseInt(args[0]) || parseInt(args[1]) || 50, LIMITS.MAX_PURGE);
      const type = args[0].toLowerCase();
      await message.delete().catch(() => {});

      const loadEmbed = new EmbedBuilder()
        .setColor('#EB459E')
        .setAuthor({ name: 'Wild Wolf \u2502 Purging', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n{EMOJI_LOADING} **Scanning and deleting messages...**\n\n\`\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\` Processing\n${SEP}`)
        .setTimestamp();
      const progressMsg = await message.channel.send({ embeds: [loadEmbed] });

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
          return message.channel.send({ embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription('{EMOJI_ERROR} Invalid count.').setTimestamp()] });
        }
        filtered = fetched;
      }

      const twoWeeks = Date.now() - 14 * 24 * 60 * 60 * 1000;
      const deletable = filtered.filter(m => m.createdTimestamp > twoWeeks && m.id !== progressMsg.id);

      if (deletable.size === 0) {
        return progressMsg.edit({ embeds: [new EmbedBuilder().setColor('#FEE75C').setAuthor({ name: 'Wild Wolf \u2502 Purge', iconURL: client.user.displayAvatarURL() }).setDescription(`${SEP}\n{EMOJI_WARN} **No deletable messages found.**\nMessages older than 14 days cannot be bulk deleted.\n${SEP}`).setTimestamp()] });
      }

      const deleted = await message.channel.bulkDelete(deletable, true);

      const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setAuthor({ name: 'Wild Wolf \u2502 Purge Complete', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n{EMOJI_SUCCESS} **Messages purged successfully.**\n${SEP}`)
        .addFields(
          { name: '\u25B8 Deleted', value: `\`${deleted.size}\` messages`, inline: true },
          { name: '\u25B8 Filter', value: `\`${filterLabel}\``, inline: true },
          { name: '\u25B8 By', value: message.author.tag, inline: true }
        )
        .setFooter({ text: 'Wild Wolf \u2022 This message will auto-delete in 5s' })
        .setTimestamp();
      await progressMsg.edit({ embeds: [embed] });
      setTimeout(() => progressMsg.delete().catch(() => {}), 5000);
    } catch (error) {
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`{EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
