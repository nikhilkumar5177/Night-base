const { EmbedBuilder } = require('discord.js');
const storage = require('../../utils/storageManager');
const { LIMITS } = require('../../utils/constants');

module.exports = {
  name: 'securitystatus',
  aliases: ['seclog', 'seclogs'],
  description: 'View security logs',
  usage: 'securitystatus',
  cooldown: 5,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message) => {
    try {
      const securityConfig = storage.read('security.json');
      const logs = securityConfig.logs || [];
      if (logs.length === 0) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#0099ff').setTitle('{EMOJI_INFO} Security Logs').setDescription('No security events recorded.').setTimestamp()] });
      }
      const perPage = 5;
      const pages = [];
      for (let i = 0; i < logs.length; i += perPage) {
        const chunk = logs.slice(i, i + perPage);
        pages.push(chunk.map((log, idx) => `**${i + idx + 1}.** Type: \`${log.type}\`\nTime: <t:${Math.floor(log.timestamp / 1000)}:R>${log.count ? `\nCount: ${log.count}` : ''}`).join('\n\n'));
      }
      let page = 0;
      const embed = new EmbedBuilder().setColor('#ff6d00').setTitle('{EMOJI_WARN} Security Logs').setDescription(pages[page]).setFooter({ text: `Page ${page + 1}/${pages.length} | ${logs.length} total events` }).setTimestamp();
      const sent = await message.channel.send({ embeds: [embed] });
      if (pages.length <= 1) return;
      await sent.react('\u25C0\uFE0F');
      await sent.react('\u25B6\uFE0F');
      const filter = (r, u) => ['\u25C0\uFE0F', '\u25B6\uFE0F'].includes(r.emoji.name) && u.id === message.author.id;
      const collector = sent.createReactionCollector({ filter, time: LIMITS.PAGINATION_TIMEOUT });
      collector.on('collect', (r) => {
        r.users.remove(message.author.id).catch(() => {});
        if (r.emoji.name === '\u25B6\uFE0F' && page < pages.length - 1) page++;
        else if (r.emoji.name === '\u25C0\uFE0F' && page > 0) page--;
        sent.edit({ embeds: [new EmbedBuilder().setColor('#ff6d00').setTitle('{EMOJI_WARN} Security Logs').setDescription(pages[page]).setFooter({ text: `Page ${page + 1}/${pages.length} | ${logs.length} total events` }).setTimestamp()] }).catch(() => {});
      });
      collector.on('end', () => sent.reactions.removeAll().catch(() => {}));
    } catch (error) {
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#ff1744').setTitle('{EMOJI_ERROR} Error').setDescription(error.message).setTimestamp()] });
    }
  }
};
