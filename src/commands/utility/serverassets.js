const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { SEP } = require('../../utils/constants');

const DOT = '\u25AA';

module.exports = {
  name: 'serverassets',
  aliases: ['sa', 'servericon', 'serverbanner'],
  description: 'View all server visual assets',
  usage: 'serverassets',
  cooldown: 5,
  enabled: true,
  staffOnly: false,
  devOnly: false,
  execute: async (client, message) => {
    try {
      const g = message.guild;
      const assets = {
        icon: g.iconURL({ dynamic: true, size: 1024 }),
        banner: g.bannerURL({ size: 1024 }),
        splash: g.splashURL({ size: 1024 }),
        discovery: g.discoverySplashURL({ size: 1024 })
      };

      const pages = [];

      if (assets.icon) {
        pages.push({ label: 'Server Icon', embed: new EmbedBuilder()
          .setColor('#5865F2').setAuthor({ name: 'Wild Wolf \u2502 Server Icon', iconURL: client.user.displayAvatarURL() })
          .setDescription(`${SEP}\n${DOT} **Server:** ${g.name}\n${SEP}`).setImage(assets.icon)
          .setFooter({ text: `Wild Wolf \u2022 Page 1/${Object.values(assets).filter(Boolean).length}` }).setTimestamp(),
          url: assets.icon
        });
      }
      if (assets.banner) {
        pages.push({ label: 'Server Banner', embed: new EmbedBuilder()
          .setColor('#5865F2').setAuthor({ name: 'Wild Wolf \u2502 Server Banner', iconURL: client.user.displayAvatarURL() })
          .setDescription(`${SEP}\n${DOT} **Server:** ${g.name}\n${SEP}`).setImage(assets.banner)
          .setFooter({ text: `Wild Wolf` }).setTimestamp(),
          url: assets.banner
        });
      }
      if (assets.splash) {
        pages.push({ label: 'Invite Splash', embed: new EmbedBuilder()
          .setColor('#5865F2').setAuthor({ name: 'Wild Wolf \u2502 Invite Splash', iconURL: client.user.displayAvatarURL() })
          .setDescription(`${SEP}\n${DOT} **Server:** ${g.name}\n${SEP}`).setImage(assets.splash)
          .setFooter({ text: `Wild Wolf` }).setTimestamp(),
          url: assets.splash
        });
      }
      if (assets.discovery) {
        pages.push({ label: 'Discovery Splash', embed: new EmbedBuilder()
          .setColor('#5865F2').setAuthor({ name: 'Wild Wolf \u2502 Discovery Splash', iconURL: client.user.displayAvatarURL() })
          .setDescription(`${SEP}\n${DOT} **Server:** ${g.name}\n${SEP}`).setImage(assets.discovery)
          .setFooter({ text: `Wild Wolf` }).setTimestamp(),
          url: assets.discovery
        });
      }

      if (pages.length === 0) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#FEE75C').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${SEP}\n{EMOJI_WARN} This server has no visual assets set.\n${SEP}`).setTimestamp()] });
      }

      let page = 0;
      pages.forEach((p, i) => p.embed.setFooter({ text: `Wild Wolf \u2022 Page ${i + 1}/${pages.length} \u2502 ${p.label}`, iconURL: g.iconURL({ dynamic: true }) }));

      const buildRow = () => {
        const btns = [];
        if (pages.length > 1) {
          btns.push(new ButtonBuilder().setCustomId('sa_prev').setEmoji('\u25C0').setStyle(ButtonStyle.Primary).setDisabled(page === 0));
          btns.push(new ButtonBuilder().setCustomId('sa_next').setEmoji('\u25B6').setStyle(ButtonStyle.Primary).setDisabled(page >= pages.length - 1));
        }
        btns.push(new ButtonBuilder().setLabel('Download').setStyle(ButtonStyle.Link).setURL(pages[page].url));
        btns.push(new ButtonBuilder().setCustomId('sa_del').setLabel('Dismiss').setStyle(ButtonStyle.Secondary).setEmoji('\u2716'));
        return new ActionRowBuilder().addComponents(...btns);
      };

      const sent = await message.reply({ embeds: [pages[page].embed], components: [buildRow()] });
      if (pages.length <= 1) return;

      const coll = sent.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 120000 });
      coll.on('collect', async i => {
        if (i.customId === 'sa_del') { await sent.delete().catch(() => {}); coll.stop(); return; }
        if (i.customId === 'sa_prev' && page > 0) page--;
        if (i.customId === 'sa_next' && page < pages.length - 1) page++;
        await i.update({ embeds: [pages[page].embed], components: [buildRow()] });
      });
      coll.on('end', () => sent.edit({ components: [] }).catch(() => {}));
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`{EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
