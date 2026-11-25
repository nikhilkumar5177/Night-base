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
  const root = rootConfig || (config?.modules ? config : null);
  const contentConfig = config?.modules ? config.modules.content : config;
  
  // Ghost ping should be checked if enabled in content module OR if contentConfig.ghostPing is true
  if (!contentConfig?.ghostPing) return;
  if (!message.guild) return;

  // Author might be uncached or partial on delete event
  const author = message.author || (message.member?.user ? message.member.user : null);
  if (author && author.bot) return;

  // Extract user mentions safely
  let mentions = [];
  if (message.mentions?.users && message.mentions.users.size > 0) {
    mentions = Array.from(message.mentions.users.values()).filter(u => !author || u.id !== author.id);
  } else if (message.content) {
    // Regex fallback if mentions was empty/uncached in messageDelete
    const userMentionRegex = /<@!?(\d{17,20})>/g;
    const matches = [...message.content.matchAll(userMentionRegex)];
    for (const match of matches) {
      const id = match[1];
      if (!author || id !== author.id) {
        mentions.push({ id });
      }
    }
  }

  if (mentions.length === 0) return;

  const authorTag = author ? `${author.tag} (<@${author.id}>)` : '`Unknown User`';
  const mentionText = mentions.map(u => `<@${u.id}>`).join(', ');

  const container = new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Security Alert`))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${EMOJI_WARN} **Ghost Ping Detected**\n\n` +
      `**User:** ${authorTag}\n` +
      `**Mentions:** ${mentionText}\n` +
      `**Content:** ${message.content || '*[Embed/Attachment only]*'}`
    ));

  const logChannelId = root?.logChannel || contentConfig?.logChannel;
  const targetChannel = (logChannelId ? (message.guild.channels.cache.get(logChannelId) || await message.guild.channels.fetch(logChannelId).catch(() => null)) : null) || message.channel;

  if (targetChannel && targetChannel.send) {
    await targetChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
  }
}

module.exports = { handleGhostPing };
