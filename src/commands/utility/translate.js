const axios = require('axios');
const { cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'translate',
  aliases: ['tr'],
  description: 'Translate a replied message to English',
  usage: 'translate (reply to a message)',
  cooldown: 10,
  enabled: true,
  staffOnly: false,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      const ref = message.reference;
      if (!ref || !ref.messageId) {
        return message.reply({ content: '**Reply to a message** to translate it to English.' });
      }

      const target = await message.channel.messages.fetch(ref.messageId).catch(() => null);
      if (!target || !target.content) {
        return message.reply({ content: 'Could not fetch the replied message or it has no text.' });
      }

      const text = target.content;

      // Google Translate free API
      const url = `https://translate.googleapis.com/translate_a/single`;
      const res = await axios.get(url, {
        params: {
          client: 'gtx',
          sl: 'auto',
          tl: 'en',
          dt: 't',
          q: text
        }
      });

      const translated = res.data[0].map(s => s[0]).join('');
      const detectedLang = res.data[2] || 'unknown';

      if (translated.toLowerCase().trim() === text.toLowerCase().trim()) {
        return message.reply({ content: `Already in English.` });
      }

      return message.reply({ content: `**Translated** (${detectedLang} → en):\n${translated}` });
    } catch (error) {
      return message.reply({ components: [cv2Error('Translation failed. Try again later.')], flags: 32768 }).catch(() => {});
    }
  }
};
