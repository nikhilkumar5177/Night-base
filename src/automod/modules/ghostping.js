const { EmbedBuilder } = require('discord.js');
const { COLORS, EMOJI_WARN } = require('../../utils/constants');

/**
 * Handle ghost ping detection (messageDelete).
 * @param {object} client 
 * @param {object} message 
 * @param {object} config 
 */
async function handleGhostPing(client, message, config) {
  if (!config.enabled || !config.ghostPing) return;
  if (!message.guild || !message.author || message.author.bot) return;

  const mentions = message.mentions.users.filter(u => u.id !== message.author.id);
  if (mentions.size === 0) return;

  const embed = new EmbedBuilder()
    .setColor(COLORS.WARN)
    .setTitle(`${EMOJI_WARN} Ghost Ping Detected`)
    .setDescription(
      `**User:** ${message.author.tag} (<@${message.author.id}>)\n` +
      `**Mentions:** ${mentions.map(u => `<@${u.id}>`).join(', ')}\n` +
      `**Content:** ${message.content || '*[Embed/Attachment only]*'}`
    )
    .setTimestamp();

  const logChannelId = config.logChannel;
  const targetChannel = message.guild.channels.cache.get(logChannelId) || message.channel;

  if (targetChannel) {
    await targetChannel.send({ embeds: [embed] }).catch(() => {});
  }
}

module.exports = { handleGhostPing };
