const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const storage = require('../../utils/storageManager');
const { joinRandomVC, leaveVC, joinSpecificVC } = require('../../utils/vcJoiner');
const { EMOJI_SUCCESS, EMOJI_ARROW } = require('../../utils/constants');
const { cv2Error, sendUsage } = require('../../utils/messageHelper');

module.exports = {
  name: 'vcjoiner',
  aliases: ['vcj', 'joiner'],
  description: 'Manage the automatic voice channel joiner',
  usage: 'vcjoiner <on|off|bl|unbl|join> [categoryId/channelId]',
  example: 'vcjoiner on\nvcjoiner bl 123456789\nvcjoiner join 987654321',
  cooldown: 5,
  enabled: true,
  devOnly: true,
  execute: async (client, message, args) => {
    const isOwner = message.author.id === message.guild.ownerId;
    const isDev = message.author.id === process.env.DEV_ID;

    if (!isOwner && !isDev) return;

    const sub = args[0]?.toLowerCase();
    if (!sub) return sendUsage(message, module.exports);

    let vcData = storage.read('vcjoiner.json');
    if (!vcData[message.guild.id]) {
      vcData[message.guild.id] = {
        enabled: false,
        blacklistedCategories: [],
        currentChannelId: null,
        lastJoined: 0
      };
    }

    const guildConfig = vcData[message.guild.id];
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} VC Joiner Manager`))
      .addSeparatorComponents(new SeparatorBuilder());

    try {
      switch (sub) {
        case 'on':
          guildConfig.enabled = true;
          storage.write('vcjoiner.json', vcData);
          await joinRandomVC(message.guild);
          container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} **Joiner Enabled.** Wold Wolf will now rotate through voice channels.`));
          break;

        case 'off':
          guildConfig.enabled = false;
          storage.write('vcjoiner.json', vcData);
          leaveVC(message.guild);
          container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} **Joiner Disabled.** Wold Wolf has left the voice channel.`));
          break;

        case 'bl': {
          const blId = args[1];
          if (!blId) return message.reply({ components: [cv2Error('Provide a Category or Channel ID to blacklist.')], flags: 32768 });
          if (!guildConfig.blacklistedCategories.includes(blId)) {
            guildConfig.blacklistedCategories.push(blId);
            storage.write('vcjoiner.json', vcData);
          }
          container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} ID \`${blId}\` has been **blacklisted** from Joiner rotation.`));
          break;
        }

        case 'unbl': {
          const unblId = args[1];
          if (!unblId) return message.reply({ components: [cv2Error('Provide a Category or Channel ID to un-blacklist.')], flags: 32768 });
          guildConfig.blacklistedCategories = guildConfig.blacklistedCategories.filter(id => id !== unblId);
          storage.write('vcjoiner.json', vcData);
          container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} ID \`${unblId}\` has been **removed** from Joiner blacklist.`));
          break;
        }

        case 'join': {
          const chId = args[1]?.replace(/[<#>]/g, '');
          if (!chId) return message.reply({ components: [cv2Error('Provide a Voice Channel ID to join.')], flags: 32768 });
          const channel = message.guild.channels.cache.get(chId);
          if (!channel || !channel.isVoiceBased()) return message.reply({ components: [cv2Error('Invalid Voice Channel ID.')], flags: 32768 });

          guildConfig.enabled = true;
          await joinSpecificVC(channel);
          container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} Joined specific channel: **${channel.name}**`));
          break;
        }

        default:
          return sendUsage(message, module.exports);
      }

      await message.reply({ components: [container], flags: 32768 }).catch(() => {});
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 });
    }
  }
};
