const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const { SEP } = require('../../utils/constants');

const DOT = '\u25AA';

module.exports = {
  name: 'banner',
  aliases: ['bn'],
  description: 'View user banner',
  usage: 'banner [@user]',
  cooldown: 3,
  enabled: true,
  data: new SlashCommandBuilder()
    .setName('banner')
    .setDescription('View user banner')
    .addUserOption(opt => opt.setName('user').setDescription('The user to view banner of').setRequired(false)),
  staffOnly: false,
  devOnly: false,
  execute: async (client, message, args) => {
    const isInteraction = !message.author;
    try {
      let user = isInteraction
        ? (message.options.getUser('user') || message.user)
        : (message.mentions.users.first() || client.users.cache.get(args[0]) || message.author);
      
      user = await user.fetch(true);
      const bannerUrl = user.bannerURL({ dynamic: true, size: 1024 });
      if (!bannerUrl) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#FEE75C').setAuthor({ name: 'Wild Wolf \u2502 Banner', iconURL: client.user.displayAvatarURL() }).setDescription(`${SEP}\n{EMOJI_WARN} **${user.tag}** does not have a banner.\n${SEP}`).setTimestamp()] });
      }

      const member = message.guild.members.cache.get(user.id);
      const embed = new EmbedBuilder()
        .setColor(member?.displayHexColor !== '#000000' ? member?.displayHexColor || '#5865F2' : '#5865F2')
        .setAuthor({ name: `Wild Wolf \u2502 Banner Viewer`, iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n${DOT} **User:** ${user.tag}\n${SEP}`)
        .setImage(bannerUrl)
        .setFooter({ text: 'Wild Wolf \u2022 Banner Viewer', iconURL: (isInteraction ? message.guild : message.guild).iconURL({ dynamic: true }) })
        .setTimestamp();

      const buttons = [new ButtonBuilder().setLabel('Download').setStyle(ButtonStyle.Link).setURL(bannerUrl)];
      if (user.banner?.startsWith('a_')) {
        buttons.push(new ButtonBuilder().setLabel('GIF').setStyle(ButtonStyle.Link).setURL(user.bannerURL({ extension: 'gif', size: 1024 })));
      }
      buttons.push(new ButtonBuilder().setCustomId('bn_del').setLabel('Dismiss').setStyle(ButtonStyle.Secondary).setEmoji('\u2716'));

      const sent = await message.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(...buttons)] });
      const coll = sent.createMessageComponentCollector({ filter: i => i.user.id === (isInteraction ? message.user.id : message.author.id), time: 120000 });
      coll.on('collect', async i => { if (i.customId === 'bn_del') { await sent.delete().catch(() => {}); coll.stop(); } });
      coll.on('end', () => sent.edit({ components: [] }).catch(() => {}));
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`{EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
