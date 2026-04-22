const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { SEP, EMOJI_ERROR, EMOJI_WARN, EMOJI_SUCCESS } = require('../../utils/constants');
const storage = require('../../utils/storageManager');


module.exports = {
  name: 'snipeclear',
  aliases: ['clearsnipe', 'sc'],
  description: 'Clear snipe cache for this channel or all channels',
  usage: 'snipeclear [all]',
  cooldown: 5,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('ManageMessages')) {
        return message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_ERROR} You need **ManageMessages** permission.`).setTimestamp()] });
      }

      const isAll = args[0]?.toLowerCase() === 'all';

      if (isAll) {
        const confirmEmbed = new EmbedBuilder()
          .setColor('#FEE75C')
          .setAuthor({ name: 'Wild Wolf \u2502 Clear All Snipes', iconURL: client.user.displayAvatarURL() })
          .setDescription(`${SEP}\n${EMOJI_WARN} **Clear snipe cache for ALL channels?**\nThis will remove \`${client.snipeCache.size}\` channel caches.\n${SEP}`)
          .setTimestamp();
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('sc_yes').setLabel('Clear All').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('sc_no').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
        );
        const sent = await message.reply({ embeds: [confirmEmbed], components: [row] }).catch(() => {});
        const coll = sent.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 15000, max: 1 });
        coll.on('collect', async i => {
          if (i.customId === 'sc_yes') {
            client.snipeCache.clear();
            storage.write('snipe.json', {});
            await i.update({ embeds: [new EmbedBuilder().setColor('#57F287').setAuthor({ name: 'Wild Wolf \u2502 Snipe Cache', iconURL: client.user.displayAvatarURL() }).setDescription(`${SEP}\n${EMOJI_SUCCESS} **All snipe caches cleared.**\n${SEP}`).setTimestamp()], components: [] });
          } else {
            await i.update({ embeds: [new EmbedBuilder().setColor('#2B2D31').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${SEP}\n${EMOJI_WARN} **Cancelled.**\n${SEP}`).setTimestamp()], components: [] });
          }
        });
        coll.on('end', c => { if (c.size === 0) sent.edit({ components: [] }).catch(() => {}); });
        return;
      }

      const count = client.snipeCache.get(message.channel.id)?.length || 0;
      client.snipeCache.delete(message.channel.id);
      const snipeData = storage.read('snipe.json');
      delete snipeData[message.channel.id];
      storage.write('snipe.json', snipeData);

      const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setAuthor({ name: 'Wild Wolf \u2502 Snipe Cache Cleared', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n${EMOJI_SUCCESS} **Cleared \`${count}\` sniped messages from this channel.**\n${SEP}`)
        .setFooter({ text: `Wild Wolf \u2022 Use ${client.config.prefix}snipeclear all for global clear` })
        .setTimestamp();
      message.reply({ embeds: [embed] }).catch(() => {});
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
