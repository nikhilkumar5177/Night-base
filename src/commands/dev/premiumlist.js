const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const storage = require('../../utils/storageManager');
const { EMOJI_OWNER, EMOJI_DOT, EMOJI_ARROW_LEFT, EMOJI_ARROW_RIGHT } = require('../../utils/constants');

module.exports = {
  name: 'premiumlist',
  aliases: ['premlist', 'plist'],
  description: 'List all premium servers',
  usage: 'premiumlist',
  cooldown: 0,
  enabled: true,
  staffOnly: false,
  devOnly: true,
  premiumOnly: false,
  execute: async (client, message, args) => {
    if (!process.env.DEV_ID.split(',').includes(message.author.id)) return;

    const premiumData = storage.read('premium.json');
    if (!premiumData.guilds) premiumData.guilds = {};

    const activeGuilds = Object.entries(premiumData.guilds)
      .filter(([id, data]) => data.active)
      .sort((a, b) => b[1].grantedAt - a[1].grantedAt);

    if (activeGuilds.length === 0) {
      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_OWNER} **Premium Servers**`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`No active premium servers found.`));
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    const itemsPerPage = 5;
    const totalPages = Math.ceil(activeGuilds.length / itemsPerPage);
    let currentPage = 0;

    const renderPage = async (page) => {
      const start = page * itemsPerPage;
      const end = start + itemsPerPage;
      const slice = activeGuilds.slice(start, end);

      let content = '';
      for (const [guildId, data] of slice) {
        const guild = client.guilds.cache.get(guildId);
        const guildName = guild ? guild.name : 'Unknown Guild';
        const grantedDate = new Date(data.grantedAt).toLocaleDateString();
        const expiresStr = data.expiresAt ? new Date(data.expiresAt).toLocaleDateString() : 'Lifetime';
        
        content += `**${guildName}** (\`${guildId}\`)\n`;
        content += `${EMOJI_DOT} **Key/Method:** \`${data.keyUsed}\`\n`;
        content += `${EMOJI_DOT} **Granted:** ${grantedDate} \u2502 **Expires:** ${expiresStr}\n\n`;
      }

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_OWNER} **Premium Servers** (Page ${page + 1}/${totalPages})`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(content.trim() || 'No data.'));

      const components = [container];

      if (totalPages > 1) {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('plist_prev').setEmoji(EMOJI_ARROW_LEFT).setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
          new ButtonBuilder().setCustomId('plist_next').setEmoji(EMOJI_ARROW_RIGHT).setStyle(ButtonStyle.Secondary).setDisabled(page === totalPages - 1)
        );
        container.addActionRowComponents(row);
      }

      return { components, flags: MessageFlags.IsComponentsV2 };
    };

    const sent = await message.reply(await renderPage(currentPage));
    if (totalPages <= 1) return;

    const collector = sent.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 120000 });

    collector.on('collect', async i => {
      if (i.customId === 'plist_prev') currentPage--;
      if (i.customId === 'plist_next') currentPage++;
      await i.update(await renderPage(currentPage)).catch(() => {});
    });

    collector.on('end', () => {
      sent.edit({ components: sent.components }).catch(() => {}); // Retain current but strip listeners theoretically
    });
  }
};
