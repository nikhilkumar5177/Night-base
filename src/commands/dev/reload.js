const { EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');
const { deployCommands } = require('../../utils/deployer');
const { SEP, EMOJI_OWNER, EMOJI_SUCCESS, EMOJI_ERROR } = require('../../utils/constants');

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
        const srcPath = path.resolve(__dirname, '..', '..');

        const sweep = (dir) => {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
              sweep(fullPath);
            } else if (file.endsWith('.js')) {
              try {
                delete require.cache[require.resolve(fullPath)];
              } catch (e) { }
            }
          }
        };
        sweep(srcPath);

        client.commands.clear();
        client.aliases.clear();

        const eventsPath = path.join(srcPath, 'events');
        if (fs.existsSync(eventsPath)) {
          const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));
          for (const file of eventFiles) {
            try {
              const event = require(path.join(eventsPath, file));
              if (event.name) {
                client.removeAllListeners(event.name);
              }
            } catch (e) { }
          }
        }

        const commandHandler = require('../../handlers/commandHandler');
        const eventHandler = require('../../handlers/eventHandler');

        commandHandler(client);
        eventHandler(client);

        const count = client.commands.size;
        let slashMsg = '';
        try {
          const slashCount = await deployCommands(client);
          slashMsg = `\n${EMOJI_SUCCESS} Also re-deployed **${slashCount}** slash commands.`;
        } catch (e) {
          slashMsg = `\n${EMOJI_ERROR} Failed to re-deploy slash commands: ${e.message}`;
        }

        return message.reply({ embeds: [new EmbedBuilder().setColor('#00e676').setTitle(`${EMOJI_OWNER} Wild Wolf \u2502 System Reload`).setDescription(`${SEP}\n${EMOJI_SUCCESS} **System reloaded successfully.**\n${SEP}`).addFields({ name: 'Details', value: `\u25B8 Commands: \`${count}\`\n\u25B8 Events: \`${client.eventNames().length}\`${slashMsg}` }).setTimestamp()] }).catch(() => {});
      }
      const cmdName = args[0].toLowerCase();
      const command = client.commands.get(cmdName) || client.commands.get(client.aliases.get(cmdName));
      if (!command) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ff1744').setTitle(`${EMOJI_ERROR} Command Not Found`).setTimestamp()] });
      }
      const commandPath = path.join(__dirname, '..', command.category, `${command.name}.js`);
      delete require.cache[require.resolve(commandPath)];
      const reloaded = require(commandPath);
      reloaded.category = command.category;
      client.commands.set(reloaded.name, reloaded);
      message.reply({ embeds: [new EmbedBuilder().setColor('#00e676').setTitle(`${EMOJI_SUCCESS} Command Reloaded`).setDescription(`\`${reloaded.name}\` has been reloaded.`).setTimestamp()] }).catch(() => {});
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().setColor('#ff1744').setTitle(`${EMOJI_ERROR} Reload Error`).setDescription(error.message).setTimestamp()] }).catch(() => {});
    }
  }
};
