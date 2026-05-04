const axios = require('axios');
const { sendUsage, cv2Error } = require('../../utils/messageHelper');

const LANG_CODES = new Set([
  'af','sq','am','ar','hy','az','eu','be','bn','bs','bg','ca','ceb','zh','co',
  'hr','cs','da','nl','en','eo','et','fi','fr','fy','gl','ka','de','el','gu',
  'ht','ha','haw','he','hi','hmn','hu','is','ig','id','ga','it','ja','jv','kn',
  'kk','km','rw','ko','ku','ky','lo','la','lv','lt','lb','mk','mg','ms','ml',
  'mt','mi','mr','mn','my','ne','no','ny','or','ps','fa','pl','pt','pa','ro',
  'ru','sm','gd','sr','st','sn','sd','si','sk','sl','so','es','su','sw','sv',
  'tl','tg','ta','tt','te','th','tr','tk','uk','ur','ug','uz','vi','cy','xh',
  'yi','yo','zu'
]);

async function googleTranslate(text, from, to) {
  const res = await axios.get('https://translate.googleapis.com/translate_a/single', {
    params: { client: 'gtx', sl: from, tl: to, dt: 't', q: text }
  });
  const translated = res.data[0].map(s => s[0]).join('');
  const detectedLang = res.data[2] || from;
  return { translated, detectedLang };
}

module.exports = {
  name: 'translate',
  aliases: ['tr', 'ts'],
  description: 'Translate text — reply to translate to English, or use ?tr <lang> <text>',
  usage: 'translate <lang> <text>\ntranslate (reply to a message)',
  example: 'tr ko Hello how are you\ntr (reply to translate to English)',
  cooldown: 3,
  enabled: true,
  staffOnly: false,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      const ref = message.reference;

      // Mode 1: Reply — translate replied message to English
      if (ref && ref.messageId) {
        const target = await message.channel.messages.fetch(ref.messageId).catch(() => null);
        if (!target || !target.content) {
          return message.reply({ content: 'Could not fetch the replied message or it has no text.' });
        }

        const { translated, detectedLang } = await googleTranslate(target.content, 'auto', 'en');

        if (translated.toLowerCase().trim() === target.content.toLowerCase().trim()) {
          return message.reply({ content: 'Already in English.' });
        }

        return message.reply({ content: `**Translated** (${detectedLang} → en):\n${translated}` });
      }

      // Mode 2: Forward — translate given text to a target language
      if (args.length < 2) {
        return sendUsage(message, module.exports);
      }

      const targetLang = args[0].toLowerCase();
      if (!LANG_CODES.has(targetLang)) {
        return message.reply({ content: `\`${targetLang}\` is not a valid language code. Examples: \`ko\`, \`ja\`, \`hi\`, \`fr\`, \`es\`, \`ar\`` });
      }

      const text = args.slice(1).join(' ');
      const { translated, detectedLang } = await googleTranslate(text, 'auto', targetLang);

      return message.reply({ content: `**Translated** (${detectedLang} → ${targetLang}):\n${translated}` });
    } catch (error) {
      return message.reply({ components: [cv2Error('Translation failed. Try again later.')], flags: 32768 }).catch(() => {});
    }
  }
};
