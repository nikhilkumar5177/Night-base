const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const SEP = '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501';
const DOT = '\u25AA';

module.exports = {
  name: 'vanity',
  aliases: ['vanityurl', 'invite'],
  description: 'View server vanity URL and invite info',
  usage: 'vanity',
  cooldown: 5,
  enabled: true,
  staffOnly: false,
  devOnly: false,
  execute: async (client, message) => {
    try {
      const g = message.guild;
      if (!g.vanityURLCode) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#FEE75C').setAuthor({ name: 'Wild Wolf \u2502 Vanity URL', iconURL: client.user.displayAvatarURL() }).setDescription(`${SEP}\n{EMOJI_WARN} **This server does not have a vanity URL.**\nVanity URLs require boost level 3.\n${SEP}`).setTimestamp()] });
      }
      const vanityData = await g.fetchVanityData().catch(() => null);

      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({ name: 'Wild Wolf \u2502 Vanity URL', iconURL: client.user.displayAvatarURL() })
        .setThumbnail(g.iconURL({ dynamic: true, size: 256 }))
        .setDescription(
          `${SEP}\n` +
          `${DOT} **URL:** \`discord.gg/${g.vanityURLCode}\`\n` +
          `${DOT} **Uses:** \`${vanityData ? vanityData.uses.toLocaleString() : 'Unknown'}\`\n` +
          `${DOT} **Boost Level:** \`${g.premiumTier}\`\n` +
          `${DOT} **Boosts:** \`${g.premiumSubscriptionCount || 0}\`\n` +
          `${SEP}`
        )
        .setFooter({ text: 'Wild Wolf \u2022 Server Vanity', iconURL: g.iconURL({ dynamic: true }) })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('Open Invite').setStyle(ButtonStyle.Link).setURL(`https://discord.gg/${g.vanityURLCode}`),
        new ButtonBuilder().setCustomId('v_del').setLabel('Dismiss').setStyle(ButtonStyle.Secondary).setEmoji('\u2716')
      );

      const sent = await message.channel.send({ embeds: [embed], components: [row] });
      const coll = sent.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 120000 });
      coll.on('collect', async i => { if (i.customId === 'v_del') { await sent.delete().catch(() => {}); coll.stop(); } });
      coll.on('end', () => sent.edit({ components: [] }).catch(() => {}));
    } catch (error) {
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`{EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
