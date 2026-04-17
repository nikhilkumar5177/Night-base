const timestamp = () => new Date().toISOString().replace('T', ' ').split('.')[0];

module.exports = {
  info: (msg) => console.log(`[${timestamp()}] [INFO] ${msg}`),
  warn: (msg) => console.log(`[${timestamp()}] [WARN] ${msg}`),
  error: (msg) => console.log(`[${timestamp()}] [ERROR] ${msg}`),
  debug: (msg) => {
    if (process.env.DEBUG === 'true') console.log(`[${timestamp()}] [DEBUG] ${msg}`);
  },
  cmd: (user, command) => console.log(`[${timestamp()}] [CMD] ${user} used ${command}`)
};
