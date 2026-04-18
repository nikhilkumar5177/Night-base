const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'clearconsole',
  aliases: ['cc', 'clearcache', 'cls'],
  description: 'Clears the bot terminal console and resets internal memory caches',
  usage: 'clearconsole',
  cooldown: 0,
  enabled: true,
  staffOnly: false,
  devOnly: true,
  execute: async (client, message, args) => {
    try {
      // Clear the physical terminal/console
      console.clear();
      console.log(`[INFO] Console cleared by ${message.author.tag}`);

      // Clear internal memory caches to free up RAM/reset state
      if (client.cooldowns) client.cooldowns.clear();
      if (client._webhookTracker) client._webhookTracker.clear();
      
      // Optionally, sweep discord.js cache (messages older than 1 hour)
      message.channel.messages.cache.sweep(m => Date.now() - m.createdTimestamp > 3600000);

      const embed = new EmbedBuilder()
        .setColor('#00e676')
        .setAuthor({ name: 'Wild Wolf \u2502 System Manager', iconURL: client.user.displayAvatarURL() })
        .setDescription('{EMOJI_SUCCESS} **System Cache & Console Cleared!**\n\u25AA Terminal console has been wiped clean.\n\u25AA Command cooldowns have been reset.\n\u25AA Stale message caches have been swept.')
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });

    } catch (error) {
      message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('#ED4245')
            .setDescription(`{EMOJI_ERROR} ${error.message}`)
        ]
      });
    }
  }
};
