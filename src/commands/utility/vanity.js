const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { EMOJI_DOT, EMOJI_WARN } = require('../../utils/constants');
const { cv2Error } = require('../../utils/messageHelper');

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
        const warnContainer = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Vanity URL`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${EMOJI_WARN} **This server does not have a vanity URL.**\nVanity URLs require boost level 3.`
          ));
        return message.reply({ components: [warnContainer], flags: 32768 });
      }

      const vanityData = await g.fetchVanityData().catch(() => null);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Vanity URL`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${EMOJI_DOT} **URL:** \`discord.gg/${g.vanityURLCode}\`\n` +
          `${EMOJI_DOT} **Uses:** \`${vanityData ? vanityData.uses.toLocaleString() : 'Unknown'}\`\n` +
          `${EMOJI_DOT} **Boosts:** \`${g.premiumSubscriptionCount || 0}\` (Level ${g.premiumTier})`
        ));

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('Open Invite').setStyle(ButtonStyle.Link).setURL(`https://discord.gg/${g.vanityURLCode}`)
      );

      message.reply({ components: [container, row], flags: 32768 }).catch(() => {});
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
