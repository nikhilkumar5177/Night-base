const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const storage = require('../../utils/storageManager');
const { EMOJI_SUCCESS, EMOJI_OWNER, FOOTER_TEXT, EMOJI_ARROW } = require('../../utils/constants');

module.exports = {
  name: 'afk',
  description: 'Set an AFK status',
  usage: 'afk [reason]',
  cooldown: 5,
  enabled: true,
  execute: async (client, message, args) => {
    const reason = args.join(' ') || 'AFK';
    const guildId = message.guild.id;
    const afkData = storage.read('afk.json');

    if (!afkData[guildId]) afkData[guildId] = {};

    afkData[guildId][message.author.id] = {
      reason,
      timestamp: Date.now()
    };

    storage.write('afk.json', afkData);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} AFK Status Set`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${EMOJI_SUCCESS} ${message.author}, I have set your AFK status.\n` +
        `**Reason:** ${reason}`
      ))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));

    message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
  }
};
