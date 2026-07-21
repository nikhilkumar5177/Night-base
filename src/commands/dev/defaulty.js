const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } = require('discord.js');
const storage = require('../../utils/storageManager');
const { EMOJI_SUCCESS, EMOJI_WARN, EMOJI_ERROR, EMOJI_ARROW } = require('../../utils/constants');
const { cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'defaulty',
  description: 'Toggle defaulty mode for a server (premium + staff bypass)',
  usage: 'defaulty [guild_id]',
  devOnly: true,
  execute: async (client, message, args) => {
    const guildId = args[0] || message.guild.id;
    const config = storage.read('config.json');

    if (!config.defaultyServers) {
      config.defaultyServers = [];
    }

    const isCurrentlyDefaulty = config.defaultyServers.includes(guildId);

    if (isCurrentlyDefaulty) {
      config.defaultyServers = config.defaultyServers.filter(id => id !== guildId);
      storage.write('config.json', config);
      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Defaulty Mode`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} Defaulty mode **disabled** for guild \`${guildId}\`.`));
      return message.reply({ components: [container] });
    } else {
      config.defaultyServers.push(guildId);
      storage.write('config.json', config);
      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Defaulty Mode`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} Defaulty mode **enabled** for guild \`${guildId}\`.\nThis server now has all premium features and bypasses the staff requirement.`));
      return message.reply({ components: [container] });
    }
  }
};
