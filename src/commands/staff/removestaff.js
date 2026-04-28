const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const storage = require('../../utils/storageManager');
const { EMOJI_WARN, EMOJI_SUCCESS } = require('../../utils/constants');
const { sendUsage, cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'removestaff',
  aliases: ['staffremove', 'delstaff'],
  description: 'Remove a staff role',
  usage: 'removestaff <role>',
  cooldown: 3,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (message.author.id !== message.guild.ownerId && message.author.id !== process.env.DEV_ID) {
        return message.reply({ components: [cv2Error('Only the server owner can manage staff roles.')], flags: 32768 });
      }
      const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);
      if (!role) return sendUsage(message, module.exports);
      const staffData = storage.read('staff.json');
      if (!staffData[message.guild.id] || !staffData[message.guild.id].roles.includes(role.id)) {
        const warnContainer = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_WARN} **${role.name}** is not a staff role.`));
        return message.reply({ components: [warnContainer], flags: 32768 });
      }
      staffData[message.guild.id].roles = staffData[message.guild.id].roles.filter(r => r !== role.id);
      storage.write('staff.json', staffData);
      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Staff Role Removed`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} **${role.name}** has been removed from staff roles.`));
      message.reply({ components: [container], flags: 32768 });
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
