const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { EMOJI_SUCCESS, EMOJI_INFO } = require('../../utils/constants');
const { sendUsage, cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'dm',
  aliases: ['message'],
  description: 'DM a user',
  usage: 'dm <user> <message>',
  cooldown: 10,
  enabled: true,
  staffOnly: false,
  devOnly: true,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('ModerateMembers')) {
        return message.reply({ components: [cv2Error('You need **ModerateMembers** permission.')], flags: 32768 });
      }
      const target = message.mentions.users.first() || client.users.cache.get(args[0]);
      if (!target) return sendUsage(message, module.exports);

      const content = args.slice(1).join(' ');
      if (!content) return message.reply({ components: [cv2Error('Please provide a message to send.')], flags: 32768 });

      // DM Notification (Standard Embed - V2 NOT supported in DMs)
      const dmEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({ name: `Message from ${message.guild.name} Staff`, iconURL: message.guild.iconURL({ dynamic: true }) })
        .setDescription(content)
        .setTimestamp();
      
      const success = await target.send({ embeds: [dmEmbed] }).then(() => true).catch(() => false);

      if (!success) {
        return message.reply({ components: [cv2Error(`Could not DM **${target.tag}**. They may have DMs disabled.`)], flags: 32768 });
      }

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 DM Sent`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} Message successfully sent to **${target.tag}**.`));

      message.reply({ components: [container], flags: 32768 }).catch(() => {});
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
