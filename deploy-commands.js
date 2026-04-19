require('dotenv').config();
const { deployCommands } = require('./src/utils/deployer');

// Mock client for the deployer (only needs user.id)
const clientId = Buffer.from(process.env.TOKEN.split('.')[0], 'base64').toString();
const mockClient = { user: { id: clientId } };

(async () => {
  try {
    console.log(`[DEPLOY] Starting global slash command deployment...`);
    const count = await deployCommands(mockClient);
    console.log(`[DEPLOY] Successfully deployed ${count} slash commands.`);
  } catch (error) {
    console.error(`[DEPLOY] Fatal error:`, error);
  }
})();
