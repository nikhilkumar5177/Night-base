const { EmbedBuilder } = require('discord.js');

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
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ff1744').setTitle('{EMOJI_ERROR} Missing Permissions').setDescription('You need **ModerateMembers** permission.').setTimestamp()] });
      }
      const target = message.mentions.users.first() || client.users.cache.get(args[0]);
      if (!target) {
        const usageEmbed = new EmbedBuilder().setColor('#8B0000').setAuthor({ name: 'WRONG SYNTAX', iconURL: client.user.displayAvatarURL() }).setDescription('**You used this command the wrong way.**\nRead the correct format below before trying again.').addFields({ name: '\u2501\u2501 Correct Format', value: `\`\`\`fix\n${client.config.prefix}dm <@user> <message>\n\`\`\`` }, { name: '\u2501\u2501 Example', value: `\`\`\`\n${client.config.prefix}dm @User Please check your warnings\n\`\`\`` }, { name: 'Aliases', value: '`message`', inline: true }, { name: 'Cooldown', value: '`10s`', inline: true }, { name: 'Permission', value: '`ModerateMembers`', inline: true }).setFooter({ text: 'Wild Wolf \u2022 Use it right or don\'t use it at all.' }).setTimestamp();
        return message.reply({ embeds: [usageEmbed] });
      }
      const content = args.slice(1).join(' ');
      if (!content) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ff1744').setTitle('{EMOJI_ERROR} No Message').setDescription('Please provide a message.').setTimestamp()] });
      }
      const dmEmbed = new EmbedBuilder()
        .setColor(client.config.embedColor || '#0099ff')
        .setTitle('{EMOJI_INFO} Message from Staff')
        .setDescription(content)
        .addFields({ name: 'Server', value: message.guild.name })
        .setTimestamp();
      await target.send({ embeds: [dmEmbed] });
      const embed = new EmbedBuilder()
        .setColor('#00e676')
        .setTitle('{EMOJI_SUCCESS} DM Sent')
        .setDescription(`Message sent to **${target.tag}**.`)
        .setTimestamp();
      message.reply({ embeds: [embed] });
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().setColor('#ff1744').setTitle('{EMOJI_ERROR} Error').setDescription(`Could not DM user. They may have DMs disabled.`).setTimestamp()] });
    }
  }
};
