const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const SEP = '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501';
const DOT = '\u25AA';

module.exports = {
  name: 'botinfo',
  aliases: ['bi', 'about'],
  description: 'Display bot information',
  usage: 'botinfo',
  cooldown: 5,
  enabled: true,
  staffOnly: false,
  devOnly: false,
  execute: async (client, message) => {
    try {
      const mem = process.memoryUsage();
      const up = process.uptime();
      const totalMembers = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);

      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({ name: 'Wild Wolf \u2502 Bot Dashboard', iconURL: client.user.displayAvatarURL() })
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 512 }))
        .setDescription(
          `${SEP}\n` +
          `${DOT} **Bot:** ${client.user.tag}\n` +
          `${DOT} **ID:** \`${client.user.id}\`\n` +
          `${DOT} **Created:** <t:${Math.floor(client.user.createdTimestamp / 1000)}:R>\n` +
          `${SEP}`
        )
        .addFields(
          { name: '\u25B8 Performance', value: `\`\`\`\nHeap:    ${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB\nRSS:     ${(mem.rss / 1024 / 1024).toFixed(1)} MB\nUptime:  ${Math.floor(up/3600)}h ${Math.floor((up%3600)/60)}m ${Math.floor(up%60)}s\nWS Ping: ${client.ws.ping}ms\n\`\`\``, inline: true },
          { name: '\u25B8 Statistics', value: `\`\`\`\nGuilds:   ${client.guilds.cache.size}\nUsers:    ${totalMembers}\nChannels: ${client.channels.cache.size}\nCommands: ${client.commands.size}\n\`\`\``, inline: true },
          { name: '\u25B8 System', value: `\`\`\`\nNode:    ${process.version}\ndjs:     v${require('discord.js').version}\nOS:      ${process.platform}\nPrefix:  ${client.config.prefix}\n\`\`\``, inline: false }
        )
        .setFooter({ text: 'Wild Wolf \u2022 System Information', iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('Support Server').setStyle(ButtonStyle.Link).setURL(client.config.supportServer),
        new ButtonBuilder().setCustomId('bi_del').setLabel('Dismiss').setStyle(ButtonStyle.Secondary).setEmoji('\u2716')
      );

      const sent = await message.channel.send({ embeds: [embed], components: [row] });
      const coll = sent.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 120000 });
      coll.on('collect', async i => { if (i.customId === 'bi_del') { await sent.delete().catch(() => {}); coll.stop(); } });
      coll.on('end', () => sent.edit({ components: [] }).catch(() => {}));
    } catch (error) {
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`{EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
