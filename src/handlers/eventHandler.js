const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

module.exports = (client) => {
  const eventsPath = path.join(__dirname, '..', 'events');

  if (!fs.existsSync(eventsPath)) {
    fs.mkdirSync(eventsPath, { recursive: true });
    return;
  }

  const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

  for (const file of eventFiles) {
    try {
      const event = require(path.join(eventsPath, file));
      if (event.once) {
        client.once(event.name, (...args) => {
          Promise.resolve(event.execute(client, ...args)).catch(err => {
            logger.error(`Error in once event ${event.name}: ${err.stack || err}`);
          });
        });
      } else {
        client.on(event.name, (...args) => {
          Promise.resolve(event.execute(client, ...args)).catch(err => {
            logger.error(`Error in event ${event.name}: ${err.stack || err}`);
          });
        });
      }
    } catch (err) {
      logger.error(`Failed to load event ${file}: ${err.message}`);
    }
  }

  logger.info(`Loaded ${eventFiles.length} events`);
};
