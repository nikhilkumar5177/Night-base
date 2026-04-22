const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const storage = require('../../utils/storageManager');
const { joinRandomVC, leaveVC, joinSpecificVC } = require('../../utils/vcJoiner');
const { EMOJI_SUCCESS, EMOJI_ERROR } = require('../../utils/constants');

module.exports = {
  name: 'vcjoiner',
  aliases: ['vcj', 'joiner'],
  description: 'Manage the automatic voice channel joiner',
  usage: 'vcjoiner <on|off|bl|unbl|join> [categoryId/channelId]',
  example: 'vcjoiner on\nvcjoiner bl 123456789\nvcjoiner join 987654321',
  cooldown: 5,
  enabled: true,
  staffOnly: false, // Custom check inside execute
  devOnly: true,
  execute: async (client, message, args) => {
    // Only Server Owner and Bot Owner
    const isOwner = message.author.id === message.guild.ownerId;
    const isDev = message.author.id === process.env.DEV_ID;

    if (!isOwner && !isDev) {
      return message.react('\u274C').catch(() => { }); // ❌
    }

    const sub = args[0]?.toLowerCase();
    if (!sub) {
      // React with error if no sub command
      return message.react('\u274C').catch(() => { });
    }

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

    try {
      switch (sub) {
        case 'on':
          guildConfig.enabled = true;
          storage.write('vcjoiner.json', vcData);
          await storage.flushFile('vcjoiner.json').catch(() => {});
          await joinRandomVC(message.guild);
          await message.react('\u2705').catch(() => { }); // ✅
          break;

        case 'off':
          guildConfig.enabled = false;
          storage.write('vcjoiner.json', vcData);
          await storage.flushFile('vcjoiner.json').catch(() => {});
          leaveVC(message.guild);
          await message.react('\u2705').catch(() => { }); // ✅
          break;

        case 'bl':
          const blId = args[1];
          if (!blId) throw new Error('Missing ID');
          if (!guildConfig.blacklistedCategories.includes(blId)) {
            guildConfig.blacklistedCategories.push(blId);
            storage.write('vcjoiner.json', vcData);
            await storage.flushFile('vcjoiner.json').catch(() => {});
          }
          await message.react('\u2705').catch(() => { }); // ✅
          break;

        case 'unbl':
          const unblId = args[1];
          if (!unblId) throw new Error('Missing ID');
          guildConfig.blacklistedCategories = guildConfig.blacklistedCategories.filter(id => id !== unblId);
          storage.write('vcjoiner.json', vcData);
          await storage.flushFile('vcjoiner.json').catch(() => {});
          await message.react('\u2705').catch(() => { }); // ✅
          break;

        case 'join':
          const chId = args[1]?.replace(/[<#>]/g, '');
          if (!chId) throw new Error('Missing ID');
          const channel = message.guild.channels.cache.get(chId);
          if (!channel || !channel.isVoiceBased()) throw new Error('Invalid Channel');

          guildConfig.enabled = true; // Auto-enable if forced join
          await joinSpecificVC(channel);
          await message.react('\u2705').catch(() => { }); // ✅
          break;

        default:
          await message.react('\u274C').catch(() => { }); // ❌
          break;
      }
    } catch (error) {
      await message.react('\u274C').catch(() => { }); // ❌
    }
  }
};
