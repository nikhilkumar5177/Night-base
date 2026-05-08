const axios = require('axios');
const { cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'translate',
  aliases: ['tr'],
  description: 'Translate a replied message to English',
  usage: 'translate (reply to a message)',
  cooldown: 3,
  enabled: true,
  staffOnly: false,
  devOnly: false,
  premiumOnly: true,
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

      // 1. Completely Free Global Load Balancing
      // We use different Google domains to hit different edge servers worldwide.
      // This bypasses IP rate-limits by distributing the traffic.
      const baseHosts = [
        'translate.googleapis.com',
        'translate.google.com',
        'clients5.google.com',
        'translate.google.co.uk',
        'translate.google.ca',
        'translate.google.de',
        'translate.google.fr',
        'translate.google.co.jp',
        'translate.google.com.br',
        'translate.google.es',
        'translate.google.ru',
        'translate.google.it'
      ];
      // Shuffle the list so every translation uses a random global endpoint
      const hosts = baseHosts.sort(() => 0.5 - Math.random());

      let translated = null;
      let detectedLang = 'unknown';

      // Attempt to use Google's Edge Servers
      for (const host of hosts) {
        try {
          const res = await axios.get(`https://${host}/translate_a/single`, {
            params: { client: 'gtx', sl: 'auto', tl: 'en', dt: 't', q: target.content },
            timeout: 3000
          });
          
          if (res.data && res.data[0]) {
            translated = res.data[0].map(s => s[0]).join('');
            detectedLang = res.data[2] || 'unknown';
            break;
          }
        } catch (e) {
          continue; // Instantly skip to the next global server if rate limited
        }
      }

      // 2. Free Public Proxies (Lingva Instances)
      // If Google completely blocks the IP, cycle through open-source proxies
      if (!translated) {
        const proxyInstances = [
          'lingva.ml',
          'lingva.garudalinux.org',
          'translate.alefvanoon.xyz'
        ];
        
        for (const proxy of proxyInstances) {
           try {
             const res = await axios.get(`https://${proxy}/api/v1/auto/en/${encodeURIComponent(target.content)}`, { timeout: 4000 });
             if (res.data && res.data.translation) {
               translated = res.data.translation;
               detectedLang = res.data.info?.detected?.id || 'unknown';
               break;
             }
          } catch (e) {
             continue; // Try next proxy
          }
        }
      }

      if (!translated) {
        throw new Error('All translation endpoints failed. Rate limits active.');
      }

      if (translated.toLowerCase().trim() === target.content.toLowerCase().trim()) {
        return message.reply({ content: 'Already in English.' });
      }

      return message.reply({ content: `**Translated** (${detectedLang} → en):\n${translated}` });
    } catch (error) {
      return message.reply({ components: [cv2Error('Translation failed. Try again later.')], flags: 32768 }).catch(() => {});
    }
  }
};
