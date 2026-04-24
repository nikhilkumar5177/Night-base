const storage = require('../../utils/storageManager');
const { leaveVC } = require('../../utils/vcJoiner');

module.exports = {
  name: 'vcdisconnect',
  aliases: ['dc', 'disconnect', 'vcleave'],
  description: 'Disconnect the bot from voice and disable VC joiner',
  usage: 'vcdisconnect',
  cooldown: 5,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {

    try {
      // Disable joiner in storage
      let vcData = storage.read('vcjoiner.json');
      if (vcData[message.guild.id]) {
        vcData[message.guild.id].enabled = false;
        storage.write('vcjoiner.json', vcData);
        await storage.flushFile('vcjoiner.json').catch(() => {});
      }

      // Perform disconnect
      const disconnected = leaveVC(message.guild);
      
      if (disconnected) {
        await message.react('\u2705').catch(() => { }); // ✅
      } else {
        // Even if not in a VC, we still disabled the joiner, so we can react success
        await message.react('\u2705').catch(() => { }); // ✅
      }
    } catch (error) {
      await message.react('\u274C').catch(() => { }); // ❌
    }
  }
};
