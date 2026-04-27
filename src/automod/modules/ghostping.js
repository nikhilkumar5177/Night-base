const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { EMOJI_WARN } = require('../../utils/constants');

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

  const container = new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Security Alert`))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${EMOJI_WARN} **Ghost Ping Detected**\n\n` +
      `**User:** ${message.author.tag} (<@${message.author.id}>)\n` +
      `**Mentions:** ${mentions.map(u => `<@${u.id}>`).join(', ')}\n` +
      `**Content:** ${message.content || '*[Embed/Attachment only]*'}`
    ));

  const logChannelId = config.logChannel;
  const targetChannel = message.guild.channels.cache.get(logChannelId) || message.channel;

  if (targetChannel) {
    await targetChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
  }
}

module.exports = { handleGhostPing };
