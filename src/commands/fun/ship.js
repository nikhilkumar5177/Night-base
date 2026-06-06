const { AttachmentBuilder, EmbedBuilder } = require('discord.js');

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('[Ship] Missing "sharp" dependency! Please run "npm install sharp" on your server.');
}

// ══════════════════════════════════════════════
// COMPATIBILITY QUOTES
// ══════════════════════════════════════════════
const QUOTES = {
  terrible: [
    '🥶 Like oil and water... definitely not mixing!',
    '💨 The wind blew this ship far, far away...',
    '🪨 Cold as a stone in the depths of winter.',
    '🌵 Drier than a desert romance novel.',
    '🚫 The stars looked at this and said NOPE!'
  ],
  low: [
    '🌱 A seed that might bloom... in another lifetime.',
    '🌤️ Cloudy with a very slight chance of love.',
    '🧩 Some pieces fit, most definitely don\'t.',
    '🎭 An unexpected duo, to say the least.',
    '🍂 An autumn breeze... fleeting and cold.'
  ],
  medium: [
    '🌊 The tides of love are uncertain here...',
    '🎪 What an interesting pair you two make!',
    '🌙 Moonlit potential, but the clouds are thick.',
    '🎲 Love is a gamble, and this one\'s risky!',
    '🧲 There\'s some attraction... somewhere in there.'
  ],
  high: [
    '🔥 Things are heating up real fast!',
    '💫 The stars are definitely aligning for you two...',
    '🌹 Love is blooming beautifully in the air!',
    '✨ Sparks are flying in every direction!',
    '🎆 Fireworks are just the beginning!'
  ],
  perfect: [
    '⭐ STAR-CROSSED LOVERS! ⭐ Destiny has spoken! 🌟',
    '💘 Written in the stars! A flawless match! 🌟',
    '🔮 The universe ships this! Soulmates confirmed! ✨',
    '👑 A royal match! Love reigns supreme! 🌟',
    '💎 Rare and precious! An unbreakable bond! ✨'
  ]
};

// ══════════════════════════════════════════════
// STATIC BACKGROUNDS (Fast, reliable CDNs)
// ══════════════════════════════════════════════
const STATIC_BGS = [
  'https://images.unsplash.com/photo-1578637387939-43c525550085?q=80&w=700&auto=format&fit=crop', // Tokyo night
  'https://images.unsplash.com/photo-1542051812871-75f56cc9a3af?q=80&w=700&auto=format&fit=crop', // Kyoto neon
  'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=700&auto=format&fit=crop', // Cherry blossoms
  'https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?q=80&w=700&auto=format&fit=crop', // Sakura
  'https://images.unsplash.com/photo-1528164344705-47542853e501?q=80&w=700&auto=format&fit=crop', // Lanterns
  'https://images.unsplash.com/photo-1580637150153-6ce09b9148d9?q=80&w=700&auto=format&fit=crop', // Fuji night
  'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=700&auto=format&fit=crop', // Anime sky
  'https://images.unsplash.com/photo-1534269222346-5a896154c41d?q=80&w=700&auto=format&fit=crop', // Sunset landscape
  'https://images.unsplash.com/photo-1601042879364-f3947d3f9c16?q=80&w=700&auto=format&fit=crop', // Japanese street
  'https://images.unsplash.com/photo-1480796927426-f609979314bd?q=80&w=700&auto=format&fit=crop', // Shrine
  'https://images.unsplash.com/photo-1492571350019-22de08371fd3?q=80&w=700&auto=format&fit=crop', // Tokyo tower evening
  'https://images.unsplash.com/photo-1553531384-cc64ac80f931?q=80&w=700&auto=format&fit=crop', // Night rain mountains
  'https://images.unsplash.com/photo-1610312278520-bcc893a3ff1d?q=80&w=700&auto=format&fit=crop', // Torii gate
  'https://images.unsplash.com/photo-1524103131765-a832c3243a4f?q=80&w=700&auto=format&fit=crop', // Cherry blossom branch
  'https://images.unsplash.com/photo-1518599904199-0ca897819ddb?q=80&w=700&auto=format&fit=crop'  // Mountain stars
];

module.exports = {
  name: 'ship',
  description: 'Ship yourself with someone! Use `?ship @user` or `?ship random`',
  usage: 'ship <@user | random>',
  example: 'ship @Night\nship random',
  aliases: ['love', 'match'],
  cooldown: 5,
  enabled: true,
  execute: async (client, message, args) => {
    try {
      if (!sharp) {
        return message.reply({ content: '❌ The `sharp` library is missing on this host! Please run `npm install sharp` in the console to fix this.' });
      }

      const author = message.author;
      let target;

      // ── Target selection ──
      if (!args.length || args[0].toLowerCase() === 'random') {
        let members = message.guild.members.cache.filter(
          m => !m.user.bot && m.user.id !== author.id
        );

        // Fetch members only if we don't have enough in the cache
        if (members.size < 10 && message.guild.memberCount > members.size + 1) {
          try {
            await message.guild.members.fetch();
            members = message.guild.members.cache.filter(
              m => !m.user.bot && m.user.id !== author.id
            );
          } catch (e) {
            console.error('[Ship] Failed to fetch members:', e.message);
          }
        }

        if (members.size === 0) {
          return message.reply({ content: '❌ No other members found in this server to ship with!' });
        }
        target = members.random().user;
      } else {
        target = message.mentions.users.first();
        if (!target) {
          const input = args[0].replace(/[<@!>]/g, '');
          try {
            target = await client.users.fetch(input);
          } catch {
            return message.reply({ content: '❌ Could not find that user. Please mention someone or use `random`.' });
          }
        }
        if (target.id === author.id) {
          return message.reply({ content: '❌ You can\'t ship yourself with yourself! Use `?ship random` instead.' });
        }
      }

      // ── Deterministic percentage ──
      const seed = BigInt(author.id) + BigInt(target.id);
      const percentage = Number(seed % 101n);

      // ── Determine tier ──
      let statusText, statusEmoji, embedColor, heartColor, quotePool;
      if (percentage <= 15) {
        statusText = 'Not Meant To Be...'; statusEmoji = '💔';
        embedColor = '#6b7280'; heartColor = '#4b5563';
        quotePool = QUOTES.terrible;
      } else if (percentage <= 35) {
        statusText = 'Just Friends'; statusEmoji = '😅';
        embedColor = '#3b82f6'; heartColor = '#2563eb';
        quotePool = QUOTES.low;
      } else if (percentage <= 55) {
        statusText = 'Getting There!'; statusEmoji = '😊';
        embedColor = '#f59e0b'; heartColor = '#d97706';
        quotePool = QUOTES.medium;
      } else if (percentage <= 75) {
        statusText = 'Strong Connection!'; statusEmoji = '💕';
        embedColor = '#ec4899'; heartColor = '#db2777';
        quotePool = QUOTES.high;
      } else if (percentage <= 90) {
        statusText = 'Almost Perfect!'; statusEmoji = '💖';
        embedColor = '#e11d48'; heartColor = '#be123c';
        quotePool = QUOTES.high;
      } else {
        statusText = 'Perfect Match!'; statusEmoji = '💘';
        embedColor = '#ff0055'; heartColor = '#e11d48';
        quotePool = QUOTES.perfect;
      }

      const quote = quotePool[Math.floor(Math.random() * quotePool.length)];
      const filled = Math.round(percentage / 10);
      const progressBar = '▰'.repeat(filled) + '▱'.repeat(10 - filled);

      // ── Fetch bg + avatars in parallel ──
      const [animeBg, av1Buf, av2Buf] = await Promise.all([
        fetchStaticBg(),
        fetchImage(author.displayAvatarURL({ extension: 'png', size: 128 })),
        fetchImage(target.displayAvatarURL({ extension: 'png', size: 128 }))
      ]);

      const av1 = `data:image/png;base64,${av1Buf.toString('base64')}`;
      const av2 = `data:image/png;base64,${av2Buf.toString('base64')}`;

      // ── Build SVG & convert to PNG ──
      const svg = buildShipCard(av1, av2, percentage, heartColor, animeBg);
      const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
      const attachment = new AttachmentBuilder(pngBuffer, { name: 'ship.png' });

      // ── Build embed ──
      const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setAuthor({ name: '💘 Shipping Results' })
        .setDescription(
          `Shipping ${author} and ${target}\n` +
          `**Affection: ${percentage}%**\n` +
          `${progressBar} **${percentage}%**\n` +
          `**Result: ${statusText}** ${statusEmoji}\n\n` +
          `**Compatibility Quote**\n${quote}`
        )
        .setImage('attachment://ship.png')
        .setFooter({ text: 'Wild Wolf • Love Meter' });

      await message.reply({
        content: `${author} ❤️ ${target}`,
        embeds: [embed],
        files: [attachment],
        allowedMentions: { parse: ['users'] }
      });

    } catch (error) {
      console.error('[Ship Command Error]', error);
      message.reply({ content: '❌ Something went wrong while shipping!' }).catch(() => {});
    }
  }
};

// ══════════════════════════════════════════════
// STATIC BACKGROUND FETCHER
// ══════════════════════════════════════════════
async function fetchStaticBg() {
  try {
    const url = STATIC_BGS[Math.floor(Math.random() * STATIC_BGS.length)];
    const raw = await fetchImage(url, 2500); // 2.5 second max timeout
    
    // Resize to card dimensions for smaller SVG & consistent framing
    const resized = await sharp(raw)
      .resize(700, 280, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 70 })
      .toBuffer();
    return `data:image/jpeg;base64,${resized.toString('base64')}`;
  } catch {
    return null; // fallback to gradient if network fails
  }
}

// ══════════════════════════════════════════════
// SVG CARD BUILDER
// ══════════════════════════════════════════════
function buildShipCard(av1, av2, percentage, heartColor, animeBg) {
  const W = 700, H = 280;
  const avR = 72;
  const av1X = 165, av2X = 535, avY = 140;
  const heartX = 350, heartY = 140;

  // Glass panel dimensions (inset from card edges)
  const gX = 18, gY = 18, gW = W - 36, gH = H - 36, gR = 18;

  // ── Background section ──
  let bgSection;
  if (animeBg) {
    bgSection = `
    <!-- Anime background (clipped to rounded card) -->
    <image href="${animeBg}" x="0" y="0" width="${W}" height="${H}"
           clip-path="url(#cardClip)" preserveAspectRatio="xMidYMid slice"/>
    <!-- Dark vignette over background -->
    <rect width="${W}" height="${H}" rx="16" fill="#000000" fill-opacity="0.25"/>`;
  } else {
    bgSection = `
    <!-- Gradient fallback -->
    <rect width="${W}" height="${H}" rx="16" fill="url(#bg)"/>
    <rect width="${W}" height="${H}" rx="16" fill="url(#warmGlow)"/>`;
  }

  // ── Glassmorphism panel section ──
  let glassSection;
  if (animeBg) {
    glassSection = `
    <!-- Glassmorphism: blurred copy of bg clipped to panel -->
    <image href="${animeBg}" x="0" y="0" width="${W}" height="${H}"
           clip-path="url(#glassClip)" filter="url(#blur)" preserveAspectRatio="xMidYMid slice"/>
    <!-- Glass tint overlay -->
    <rect x="${gX}" y="${gY}" width="${gW}" height="${gH}" rx="${gR}"
          fill="#0d0b1a" fill-opacity="0.55"
          stroke="#ffffff" stroke-opacity="0.14" stroke-width="1.5"/>
    <!-- Subtle top-edge highlight (glass reflection) -->
    <line x1="${gX + 40}" y1="${gY + 1}" x2="${gX + gW - 40}" y2="${gY + 1}"
          stroke="#ffffff" stroke-opacity="0.08" stroke-width="1"/>`;
  } else {
    glassSection = `
    <!-- Simple dark panel (no bg image) -->
    <rect x="${gX}" y="${gY}" width="${gW}" height="${gH}" rx="${gR}"
          fill="#1a1040" fill-opacity="0.75"
          stroke="#ffffff" stroke-opacity="0.08" stroke-width="1"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <!-- Fallback gradient -->
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0d0b1a"/>
      <stop offset="40%" stop-color="#1a1030"/>
      <stop offset="70%" stop-color="#2d1540"/>
      <stop offset="100%" stop-color="#1a0a20"/>
    </linearGradient>
    <radialGradient id="warmGlow" cx="50%" cy="95%" r="65%">
      <stop offset="0%" stop-color="#5a2050" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#0d0b1a" stop-opacity="0"/>
    </radialGradient>

    <!-- Clip paths -->
    <clipPath id="cardClip"><rect width="${W}" height="${H}" rx="16"/></clipPath>
    <clipPath id="glassClip"><rect x="${gX}" y="${gY}" width="${gW}" height="${gH}" rx="${gR}"/></clipPath>
    <clipPath id="cL"><circle cx="${av1X}" cy="${avY}" r="${avR}"/></clipPath>
    <clipPath id="cR"><circle cx="${av2X}" cy="${avY}" r="${avR}"/></clipPath>

    <!-- Filters -->
    <filter id="blur" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="10"/>
    </filter>
    <filter id="ds">
      <feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#000000" flood-opacity="0.6"/>
    </filter>
    <filter id="hg">
      <feDropShadow dx="0" dy="3" stdDeviation="12" flood-color="${heartColor}" flood-opacity="0.55"/>
    </filter>

    <!-- Avatar ring gradients -->
    <linearGradient id="ringL" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff6b9d"/>
      <stop offset="100%" stop-color="#c850c0"/>
    </linearGradient>
    <linearGradient id="ringR" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#c850c0"/>
      <stop offset="100%" stop-color="#ff6b9d"/>
    </linearGradient>
  </defs>

  <!-- ═══ BACKGROUND ═══ -->
  ${bgSection}

  <!-- ═══ GLASSMORPHISM PANEL ═══ -->
  ${glassSection}

  <!-- Corner accents on card edge -->
  <line x1="20" y1="3" x2="3" y2="3" stroke="#ff6b9d" stroke-width="2" stroke-opacity="0.35"/>
  <line x1="3" y1="3" x2="3" y2="20" stroke="#ff6b9d" stroke-width="2" stroke-opacity="0.35"/>
  <line x1="${W - 20}" y1="3" x2="${W - 3}" y2="3" stroke="#c850c0" stroke-width="2" stroke-opacity="0.35"/>
  <line x1="${W - 3}" y1="3" x2="${W - 3}" y2="20" stroke="#c850c0" stroke-width="2" stroke-opacity="0.35"/>
  <line x1="20" y1="${H - 3}" x2="3" y2="${H - 3}" stroke="#c850c0" stroke-width="2" stroke-opacity="0.35"/>
  <line x1="3" y1="${H - 3}" x2="3" y2="${H - 18}" stroke="#c850c0" stroke-width="2" stroke-opacity="0.35"/>
  <line x1="${W - 20}" y1="${H - 3}" x2="${W - 3}" y2="${H - 3}" stroke="#ff6b9d" stroke-width="2" stroke-opacity="0.35"/>
  <line x1="${W - 3}" y1="${H - 3}" x2="${W - 3}" y2="${H - 18}" stroke="#ff6b9d" stroke-width="2" stroke-opacity="0.35"/>

  <!-- ═══ LEFT AVATAR ═══ -->
  <circle cx="${av1X}" cy="${avY}" r="${avR + 5}" fill="none" stroke="url(#ringL)" stroke-width="3" filter="url(#ds)"/>
  <circle cx="${av1X}" cy="${avY}" r="${avR + 1}" fill="#110d20"/>
  <image x="${av1X - avR}" y="${avY - avR}" width="${avR * 2}" height="${avR * 2}"
         href="${av1}" clip-path="url(#cL)" preserveAspectRatio="xMidYMid slice"/>

  <!-- ═══ RIGHT AVATAR ═══ -->
  <circle cx="${av2X}" cy="${avY}" r="${avR + 5}" fill="none" stroke="url(#ringR)" stroke-width="3" filter="url(#ds)"/>
  <circle cx="${av2X}" cy="${avY}" r="${avR + 1}" fill="#110d20"/>
  <image x="${av2X - avR}" y="${avY - avR}" width="${avR * 2}" height="${avR * 2}"
         href="${av2}" clip-path="url(#cR)" preserveAspectRatio="xMidYMid slice"/>

  <!-- ═══ HEART BADGE (large) ═══ -->
  <g transform="translate(${heartX}, ${heartY})" filter="url(#hg)">
    <path d="M0,-32 C-11,-52 -43,-52 -43,-32 C-43,-13 0,20 0,35 C0,20 43,-13 43,-32 C43,-52 11,-52 0,-32Z"
          fill="${heartColor}" stroke="#ffffff" stroke-opacity="0.18" stroke-width="1.5"/>
    <text x="0" y="0" text-anchor="middle" dy="0.35em"
          fill="#ffffff" font-family="Arial,Helvetica,sans-serif" font-size="26" font-weight="700">
      ${percentage}%
    </text>
  </g>
</svg>`;
}

// ══════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════
async function fetchImage(url, timeoutMs = 4000) {
  const https = require('https');
  const http = require('http');
  return new Promise((resolve, reject) => {
    const handler = url.startsWith('https') ? https : http;
    const req = handler.get(url, { headers: { 'User-Agent': 'DiscordBot' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchImage(res.headers.location, timeoutMs).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });

    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
  });
}
