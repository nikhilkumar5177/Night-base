const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { SEP } = require('../../utils/constants');

module.exports = {
  name: 'guildlist',
  aliases: ['gl', 'servers'],
  description: 'List all guilds the bot is in (Developer Only)',
  usage: 'guildlist',
  cooldown: 5,
  enabled: true,
  staffOnly: false,
  devOnly: true,
  execute: async (client, message, args) => {
    try {
      const guilds = client.guilds.cache.map(g => ({
        name: g.name,
        id: g.id,
        members: g.memberCount,
        owner: g.ownerId
      })).sort((a, b) => b.members - a.members);

      const perPage = 10;
      const totalPages = Math.ceil(guilds.length / perPage);
      let page = 0;

      const buildEmbed = (p) => {
        const start = p * perPage;
        const end = start + perPage;
        const slice = guilds.slice(start, end);

        const list = slice.map((g, i) => {
          return `\`${start + i + 1}.\` **${g.name}** \n\u25B8 ID: \`${g.id}\` \u2502 Members: \`${g.members}\` \u2502 Owner: <@${g.owner}>`;
        }).join('\n\n');

        return new EmbedBuilder()
          .setColor('#5865F2')
          .setAuthor({ name: 'Wild Wolf \u2502 Guild Directory', iconURL: client.user.displayAvatarURL() })
          .setDescription(`${SEP}\n${list || 'No guilds found.'}\n${SEP}`)
          .setFooter({ text: `Page ${p + 1} of ${totalPages} \u2502 Total Guilds: ${guilds.length}` })
          .setTimestamp();
      };

      const buttons = (p) => new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('gl_prev').setLabel('Back').setStyle(ButtonStyle.Secondary).setDisabled(p === 0),
        new ButtonBuilder().setCustomId('gl_next').setLabel('Next').setStyle(ButtonStyle.Secondary).setDisabled(p >= totalPages - 1),
        new ButtonBuilder().setCustomId('gl_del').setLabel('Dismiss').setStyle(ButtonStyle.Danger)
      );

      const sent = await message.reply({ embeds: [buildEmbed(page).catch(() => {})], components: [buttons(page)] });
      const collector = sent.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 60000 });

      collector.on('collect', async i => {
        if (i.customId === 'gl_del') {
          await sent.delete().catch(() => {});
          collector.stop();
          return;
        }

        if (i.customId === 'gl_prev') page--;
        if (i.customId === 'gl_next') page++;

        await i.update({ embeds: [buildEmbed(page)], components: [buttons(page)] });
      });

      collector.on('end', () => {
        sent.edit({ components: [] }).catch(() => {});
      });

    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`{EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
