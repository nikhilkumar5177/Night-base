const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { EMOJI_WARN, EMOJI_ARROW } = require('../../utils/constants');

/**
 * Handle ghost ping detection (messageDelete).
 * @param {object} client 
 * @param {object} message 
 * @param {object} config - automod config or content module config
 * @param {object} [rootConfig] - optional root automod config
 */
async function handleGhostPing(client, message, config, rootConfig) {
  const contentConfig = config.modules ? config.modules.content : config;
  const root = rootConfig || (config.modules ? config : null);
  
  if (!contentConfig?.enabled || !contentConfig?.ghostPing) return;
  if (!message.guild || !message.author || message.author.bot) return;

  const mentions = message.mentions.users.filter(u => u.id !== message.author.id);
  if (mentions.size === 0) return;

  const container = new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Security Alert`))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${EMOJI_WARN} **Ghost Ping Detected**\n\n` +
      `**User:** ${message.author.tag} (<@${message.author.id}>)\n` +
      `**Mentions:** ${mentions.map(u => `<@${u.id}>`).join(', ')}\n` +
      `**Content:** ${message.content || '*[Embed/Attachment only]*'}`
    ));

  const logChannelId = root?.logChannel || contentConfig.logChannel;
  const targetChannel = (logChannelId ? message.guild.channels.cache.get(logChannelId) : null) || message.channel;

  if (targetChannel) {
    await targetChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
  }
}

module.exports = { handleGhostPing };
