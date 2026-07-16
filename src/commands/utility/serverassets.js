const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, MediaGalleryBuilder, MediaGalleryItemBuilder } = require('discord.js');
const { EMOJI_DOT, EMOJI_WARN, FOOTER_TEXT } = require('../../utils/constants');
const { cv2Error, cv2Expire } = require('../../utils/messageHelper');

module.exports = {
  name: 'serverassets',
  aliases: ['sa', 'servericon', 'serverbanner'],
  description: 'View all server visual assets',
  usage: 'serverassets',
  cooldown: 5,
  enabled: true,
  devOnly: false,
  execute: async (client, message) => {
    try {
      const g = message.guild;
      const assetData = [
        { label: 'Server Icon', url: g.iconURL({ dynamic: true, size: 1024 }) },
        { label: 'Server Banner', url: g.bannerURL({ size: 1024 }) },
        { label: 'Invite Splash', url: g.splashURL({ size: 1024 }) },
        { label: 'Discovery Splash', url: g.discoverySplashURL({ size: 1024 }) }
      ].filter(a => a.url);

      if (assetData.length === 0) {
        const warnContainer = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Server Assets`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_WARN} This server has no visual assets set.`));
        return message.reply({ components: [warnContainer], flags: 32768 });
      }

      let page = 0;

      const buildContainer = () => {
        const asset = assetData[page];
        return new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 ${asset.label}`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${EMOJI_DOT} **Asset:** ${asset.label} (${page + 1}/${assetData.length})`
          ))
          .addSeparatorComponents(new SeparatorBuilder())
          .addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(asset.url)))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));
      };

      const buildRow = () => {
        const row = new ActionRowBuilder();
        if (assetData.length > 1) {
          row.addComponents(
            new ButtonBuilder().setCustomId('sa_prev').setEmoji('\u25C0').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
            new ButtonBuilder().setCustomId('sa_next').setEmoji('\u25B6').setStyle(ButtonStyle.Primary).setDisabled(page >= assetData.length - 1)
          );
        }
        row.addComponents(new ButtonBuilder().setLabel('Download').setStyle(ButtonStyle.Link).setURL(assetData[page].url));
        return row;
      };

      const sent = await message.reply({ components: [buildContainer(), buildRow()], flags: 32768 }).catch(() => {});
      if (!sent || assetData.length <= 1) return;

      const coll = sent.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 120000 });
      coll.on('collect', async i => {
        if (i.customId === 'sa_prev' && page > 0) page--;
        else if (i.customId === 'sa_next' && page < assetData.length - 1) page++;
        await i.update({ components: [buildContainer(), buildRow()] });
      });

      coll.on('end', () => sent.edit({ components: [cv2Expire()] }).catch(() => {}));
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
