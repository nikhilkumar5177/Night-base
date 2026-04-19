const { EmbedBuilder } = require('discord.js');
const { SEP } = require('../../utils/constants');


module.exports = {
  name: 'leaveserver',
  aliases: ['lv', 'leaveguild'],
  description: 'Make the bot leave a server by ID',
  usage: 'leaveserver <guildId>',
  cooldown: 0,
  enabled: true,
  staffOnly: false,
  devOnly: true,
  execute: async (client, message, args) => {
    try {
      const guildId = args[0];
      if (!guildId) {
        return message.reply({ 
          embeds: [new EmbedBuilder().setColor('#ED4245').setDescription('{EMOJI_ERROR} Please provide a Guild ID.')] 
        });
      }

      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        return message.reply({ 
          embeds: [new EmbedBuilder().setColor('#ED4245').setDescription('{EMOJI_ERROR} I am not in a server with that ID.')] 
        });
      }

      const guildName = guild.name;
      await guild.leave();

      const successEmbed = new EmbedBuilder()
        .setColor('#57F287')
        .setAuthor({ name: 'Wild Wolf \u2502 Server Leaved', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n{EMOJI_SUCCESS} **Successfully left the server.**\n${SEP}`)
        .addFields(
          { name: '\u25B8 Server Name', value: `\`${guildName}\``, inline: true },
          { name: '\u25B8 Server ID', value: `\`${guildId}\``, inline: true }
        )
        .setTimestamp();

      await message.reply({ embeds: [successEmbed] });

    } catch (error) {
      message.reply({ 
        embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`{EMOJI_ERROR} ${error.message}`)] 
      });
    }
  }
};
