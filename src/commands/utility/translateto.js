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

module.exports = {
  name: 'translateto',
  aliases: ['ts'],
  description: 'Translate text to a specific language',
  usage: 'ts <lang_code> <text>',
  example: 'ts ko Hello how are you\nts ja Good morning',
  cooldown: 3,
  enabled: true,
  staffOnly: false,
  devOnly: false,
  premiumOnly: true,
  execute: async (client, message, args) => {
    try {
      if (args.length < 2) {
        return sendUsage(message, module.exports);
      }

      const targetLang = args[0].toLowerCase();
      if (!LANG_CODES.has(targetLang)) {
        return message.reply({ content: `\`${targetLang}\` is not a valid language code. Examples: \`ko\`, \`ja\`, \`hi\`, \`fr\`, \`es\`, \`ar\`` });
      }

      const text = args.slice(1).join(' ');

      const res = await axios.get('https://translate.googleapis.com/translate_a/single', {
        params: { client: 'gtx', sl: 'auto', tl: targetLang, dt: 't', q: text }
      });

      const translated = res.data[0].map(s => s[0]).join('');
      const detectedLang = res.data[2] || 'auto';

      return message.reply({ content: `**Translated** (${detectedLang} → ${targetLang}):\n${translated}` });
    } catch (error) {
      return message.reply({ components: [cv2Error('Translation failed. Try again later.')], flags: 32768 }).catch(() => {});
    }
  }
};
