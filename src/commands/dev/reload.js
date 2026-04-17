const { EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

module.exports = {
  name: 'reload',
  aliases: ['rl'],
  description: 'Reload a command or all commands',
  usage: 'reload [command | all]',
  cooldown: 0,
  enabled: true,
  staffOnly: false,
  devOnly: true,
  execute: async (client, message, args) => {
    if (message.author.id !== process.env.DEV_ID) return;
    try {
      if (!args[0] || args[0].toLowerCase() === 'all') {
        const commandsPath = path.join(__dirname, '..');
        const categories = fs.readdirSync(commandsPath);
        let count = 0;
        for (const category of categories) {
          const categoryPath = path.join(commandsPath, category);
          if (!fs.statSync(categoryPath).isDirectory()) continue;
          const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));
          for (const file of files) {
            const filePath = path.join(categoryPath, file);
            delete require.cache[require.resolve(filePath)];
            const cmd = require(filePath);
            cmd.category = category;
            client.commands.set(cmd.name, cmd);
            if (cmd.aliases) {
              for (const alias of cmd.aliases) {
                client.aliases.set(alias, cmd.name);
              }
            }
            count++;
          }
        }
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#00e676').setTitle('{EMOJI_SUCCESS} All Commands Reloaded').setDescription(`Reloaded **${count}** commands.`).setTimestamp()] });
      }
      const cmdName = args[0].toLowerCase();
      const command = client.commands.get(cmdName) || client.commands.get(client.aliases.get(cmdName));
      if (!command) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#ff1744').setTitle('{EMOJI_ERROR} Command Not Found').setTimestamp()] });
      }
      const commandPath = path.join(__dirname, '..', command.category, `${command.name}.js`);
      delete require.cache[require.resolve(commandPath)];
      const reloaded = require(commandPath);
      reloaded.category = command.category;
      client.commands.set(reloaded.name, reloaded);
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#00e676').setTitle('{EMOJI_SUCCESS} Command Reloaded').setDescription(`\`${reloaded.name}\` has been reloaded.`).setTimestamp()] });
    } catch (error) {
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#ff1744').setTitle('{EMOJI_ERROR} Reload Error').setDescription(error.message).setTimestamp()] });
    }
  }
};
