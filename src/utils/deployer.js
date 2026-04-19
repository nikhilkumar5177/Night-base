const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

async function deployCommands(client) {
  const commands = [];
  const commandsPath = path.join(__dirname, '..', 'commands');
  const categories = fs.readdirSync(commandsPath);

  for (const category of categories) {
    const categoryPath = path.join(commandsPath, category);
    if (!fs.statSync(categoryPath).isDirectory()) continue;
    
    const commandFiles = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));
    for (const file of commandFiles) {
      const fullPath = path.join(categoryPath, file);
      // Clear cache to ensure we get the latest data if this is called during reload
      delete require.cache[require.resolve(fullPath)];
      const command = require(fullPath);
      if (command.data) {
        commands.push(command.data.toJSON());
        console.log(`[DEPLOY] Found slash command: ${command.name}`);
      }
    }
  }

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

  try {
    const clientId = client.user.id;
    const data = await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands },
    );
    logger.info(`Successfully reloaded ${data.length} application (/) commands.`);
    return data.length;
  } catch (error) {
    logger.error(`Failed to deploy slash commands: ${error.message}`);
    throw error;
  }
}

module.exports = { deployCommands };
