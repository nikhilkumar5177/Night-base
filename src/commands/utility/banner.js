const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const SEP = '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501';
const DOT = '\u25AA';

module.exports = {
  name: 'banner',
  aliases: ['bn'],
  description: 'View user banner',
  usage: 'banner [@user]',
  cooldown: 3,
  enabled: true,
  staffOnly: false,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      let user = message.mentions.users.first() || client.users.cache.get(args[0]) || message.author;
      user = await user.fetch(true);
      const bannerUrl = user.bannerURL({ dynamic: true, size: 1024 });
      if (!bannerUrl) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#FEE75C').setAuthor({ name: 'Wild Wolf \u2502 Banner', iconURL: client.user.displayAvatarURL() }).setDescription(`${SEP}\n{EMOJI_WARN} **${user.tag}** does not have a banner.\n${SEP}`).setTimestamp()] });
      }

      const member = message.guild.members.cache.get(user.id);
      const embed = new EmbedBuilder()
        .setColor(member?.displayHexColor !== '#000000' ? member?.displayHexColor || '#5865F2' : '#5865F2')
        .setAuthor({ name: `Wild Wolf \u2502 Banner Viewer`, iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n${DOT} **User:** ${user.tag}\n${SEP}`)
        .setImage(bannerUrl)
        .setFooter({ text: 'Wild Wolf \u2022 Banner Viewer', iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();

      const buttons = [new ButtonBuilder().setLabel('Download').setStyle(ButtonStyle.Link).setURL(bannerUrl)];
      if (user.banner?.startsWith('a_')) {
        buttons.push(new ButtonBuilder().setLabel('GIF').setStyle(ButtonStyle.Link).setURL(user.bannerURL({ extension: 'gif', size: 1024 })));
      }
      buttons.push(new ButtonBuilder().setCustomId('bn_del').setLabel('Dismiss').setStyle(ButtonStyle.Secondary).setEmoji('\u2716'));

      const sent = await message.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(...buttons)] });
      const coll = sent.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 120000 });
      coll.on('collect', async i => { if (i.customId === 'bn_del') { await sent.delete().catch(() => {}); coll.stop(); } });
      coll.on('end', () => sent.edit({ components: [] }).catch(() => {}));
    } catch (error) {
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`{EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
