const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { EMOJI_SUCCESS, EMOJI_WARN, EMOJI_ARROW } = require('../../utils/constants');
const storage = require('../../utils/storageManager');
const { cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'snipeclear',
  aliases: ['clearsnipe', 'sc'],
  description: 'Clear snipe cache for this channel or all channels',
  usage: 'snipeclear [all]',
  cooldown: 5,
  enabled: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('ManageMessages')) {
        return message.reply({ components: [cv2Error('You need **ManageMessages** permission.')], flags: 32768 });
      }

      const isAll = args[0]?.toLowerCase() === 'all';

      if (isAll) {
        const confirmContainer = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Clear All Snipes`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_WARN} **Clear snipe cache for ALL channels?**\nThis will remove \`${client.snipeCache.size}\` channel caches.`));

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('sc_yes').setLabel('Clear All').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('sc_no').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
        );
        confirmContainer.addActionRowComponents(row);

        const sent = await message.reply({ components: [confirmContainer], flags: 32768 }).catch(() => {});
        const coll = sent.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 15000, max: 1 });
        coll.on('collect', async i => {
          if (i.customId === 'sc_yes') {
            client.snipeCache.clear();
            storage.write('snipe.json', {});
            const doneContainer = new ContainerBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Snipe Cache`))
              .addSeparatorComponents(new SeparatorBuilder())
              .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} **All snipe caches cleared.**`));
            await i.update({ components: [doneContainer] });
          } else {
            const cancelContainer = new ContainerBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_WARN} **Cancelled.**`));
            await i.update({ components: [cancelContainer] });
          }
        });
        coll.on('end', c => {
          if (c.size === 0) {
            const timeoutContainer = new ContainerBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_WARN} **Timed out.**`));
            sent.edit({ components: [timeoutContainer] }).catch(() => {});
          }
        });
        return;
      }

      const count = client.snipeCache.get(message.channel.id)?.length || 0;
      client.snipeCache.delete(message.channel.id);
      const snipeData = storage.read('snipe.json');
      delete snipeData[message.channel.id];
      storage.write('snipe.json', snipeData);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Snipe Cache Cleared`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} **Cleared \`${count}\` sniped messages from this channel.**`));
      message.reply({ components: [container], flags: 32768 }).catch(() => {});
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
