const { EmbedBuilder } = require('discord.js');
const { sendBackup } = require('../../utils/backupManager');
const { EMOJI_OWNER, EMOJI_LOADING, EMOJI_SUCCESS, EMOJI_ERROR } = require('../../utils/constants');

module.exports = {
  name: 'backup',
  description: 'Manually trigger a database backup',
  usage: 'backup',
  cooldown: 5,
  enabled: true,
  staffOnly: false,
  devOnly: true,
  execute: async (client, message) => {
    const reply = await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#EB459E')
          .setAuthor({ name: 'Wild Wolf \u2502 Backup', iconURL: client.user.displayAvatarURL() })
          .setDescription(`${EMOJI_OWNER} ${EMOJI_LOADING} **Generating backup...**`)
          .setTimestamp()
      ]
    });

    const success = await sendBackup(client);

    if (success) {
      await reply.edit({
        embeds: [
          new EmbedBuilder()
            .setColor('#00e676')
            .setDescription(`${EMOJI_SUCCESS} **Backup generated and sent to the backup channel.**`)
            .setTimestamp()
        ]
      });
    } else {
      await reply.edit({
        embeds: [
          new EmbedBuilder()
            .setColor('#ED4245')
            .setDescription(`${EMOJI_ERROR} **Failed to send backup. Check the logs and ensure backupChannelId is set.**`)
            .setTimestamp()
        ]
      });
    }
  }
};
