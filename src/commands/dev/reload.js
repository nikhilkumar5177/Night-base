const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const path = require('path');
const fs = require('fs');
const { deployCommands } = require('../../utils/deployer');
const { EMOJI_OWNER, EMOJI_SUCCESS } = require('../../utils/constants');
const { cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'reload',
  aliases: ['rl'],
  description: 'Reload a command or all commands',
  usage: 'reload [command | all]',
  cooldown: 0,
  enabled: true,
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
            } else if (file.endsWith('.js') || file.endsWith('.json')) {
              try {
                delete require.cache[require.resolve(fullPath)];
              } catch (e) { }
            }
          }
        };
        sweep(srcPath);

        try {
          const storage = require('../../utils/storageManager');
          const rootConfigPath = path.resolve(srcPath, '..', 'config.json');
          if (fs.existsSync(rootConfigPath)) {
            delete require.cache[require.resolve(rootConfigPath)];
            client.config = require(rootConfigPath);
          }
          const runtimeConfig = storage.read('config.json');
          if (runtimeConfig) client.config = { ...client.config, ...runtimeConfig };
        } catch (e) { }

        client.commands.clear();
        client.aliases.clear();

        const eventsPath = path.join(srcPath, 'events');
        if (fs.existsSync(eventsPath)) {
          const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));
          for (const file of eventFiles) {
            try {
              const event = require(path.join(eventsPath, file));
              if (event.name) client.removeAllListeners(event.name);
            } catch (e) { }
          }
        }

        require('../../handlers/commandHandler')(client);
        require('../../handlers/eventHandler')(client);

        const count = client.commands.size;
        let slashMsg = '';
        try {
          const slashCount = await deployCommands(client);
          slashMsg = `\n${EMOJI_SUCCESS} Re-deployed **${slashCount}** slash commands.`;
        } catch (e) {
          slashMsg = `\nFailed to re-deploy slash: ${e.message}`;
        }

        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 System Reload`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${EMOJI_OWNER} **System reloaded successfully.**\n\n` +
            `\u25B8 Commands: \`${count}\` \u2502 Events: \`${client.eventNames().length}\`${slashMsg}`
          ));

        return message.reply({ components: [container], flags: 32768 }).catch(() => {});
      }

      const cmdName = args[0].toLowerCase();
      const command = client.commands.get(cmdName) || client.commands.get(client.aliases.get(cmdName));
      if (!command) return message.reply({ components: [cv2Error('Command not found.')], flags: 32768 });

      const commandPath = path.join(__dirname, '..', command.category, `${command.name}.js`);
      delete require.cache[require.resolve(commandPath)];
      const reloaded = require(commandPath);
      reloaded.category = command.category;
      client.commands.set(reloaded.name, reloaded);

      const reloadContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Command Reloaded`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`\`${reloaded.name}\` has been successfully reloaded.`));

      message.reply({ components: [reloadContainer], flags: 32768 }).catch(() => {});
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
