const fs = require('fs');
const path = require('path');

let DatabaseSync;
try {
  DatabaseSync = require('node:sqlite').DatabaseSync;
} catch (e) {
  try {
    DatabaseSync = require('better-sqlite3');
  } catch (e2) {
    throw new Error('SQLite engine is missing. Ensure Node.js >= 22.5.0 or install better-sqlite3.');
  }
}

const STORAGE_DIR = path.join(__dirname, '..', '..', 'storage');
const DB_PATH = path.join(STORAGE_DIR, 'database.sqlite');

let db = null;
const cache = new Map();
const automodCache = new Map();
const corruptedAlerts = [];

const DEFAULT_FILES = {
  'warns.json': {},
  'blacklist.json': { users: [] },
  'aliases.json': {},
  'cmdBlacklist.json': {},
  'vouch.json': {},
  'reminders.json': [],
  'analytics.json': {},
  'security.json': { enabled: false, nukeThreshold: 3, nukeWindow: 10000 },
  'config.json': { channelCommands: {}, disabledCommands: [], noPrefixUsers: [], aliasMode: true, maintenance: false, dmLogChannelId: "", defaultyServers: [], guildPrefixes: {} },
  'dmThreads.json': {},
  'autorole.json': {},
  'privateChannels.json': {},
  'vcjoiner.json': {},
  'voiceroles.json': {},
  'afk.json': {},
  'staff.json': {},
  'shipConfig.json': {}
};

// Prepared statement references
let stmts = {};

function init() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }

  // Open SQLite database
  db = new DatabaseSync(DB_PATH);

  // High performance & concurrency pragmas
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = NORMAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  // Initialize SQLite tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS automod_configs (
      guild_id TEXT PRIMARY KEY,
      config TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // Prepare statements for sub-millisecond execution
  stmts.getKv = db.prepare('SELECT value FROM kv_store WHERE key = ?');
  stmts.setKv = db.prepare('INSERT OR REPLACE INTO kv_store (key, value, updated_at) VALUES (?, ?, ?)');
  stmts.delKv = db.prepare('DELETE FROM kv_store WHERE key = ?');
  stmts.allKv = db.prepare('SELECT key, value FROM kv_store');

  stmts.getAutomod = db.prepare('SELECT config FROM automod_configs WHERE guild_id = ?');
  stmts.setAutomod = db.prepare('INSERT OR REPLACE INTO automod_configs (guild_id, config, updated_at) VALUES (?, ?, ?)');
  stmts.delAutomod = db.prepare('DELETE FROM automod_configs WHERE guild_id = ?');

  // Perform one-time migration from legacy JSON files
  migrateLegacyData();

  // Populate cache with defaults or existing SQLite records
  for (const [key, defaultData] of Object.entries(DEFAULT_FILES)) {
    const row = stmts.getKv.get(key);
    if (!row) {
      const cleanData = cleanUnnecessaryData(key, defaultData);
      stmts.setKv.run(key, JSON.stringify(cleanData), Date.now());
      cache.set(key, cleanData);
    } else {
      try {
        const parsed = JSON.parse(row.value);
        // Deep merge missing default fields
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) &&
            defaultData && typeof defaultData === 'object' && !Array.isArray(defaultData)) {
          let modified = false;
          for (const [k, v] of Object.entries(defaultData)) {
            if (parsed[k] === undefined) {
              parsed[k] = JSON.parse(JSON.stringify(v));
              modified = true;
            }
          }
          const clean = cleanUnnecessaryData(key, parsed);
          if (modified) {
            stmts.setKv.run(key, JSON.stringify(clean), Date.now());
          }
          cache.set(key, clean);
        } else {
          cache.set(key, cleanUnnecessaryData(key, parsed));
        }
      } catch (err) {
        console.error(`[SQLite Storage] Failed to parse cached record for ${key}: ${err.message}`);
        const clean = cleanUnnecessaryData(key, defaultData);
        stmts.setKv.run(key, JSON.stringify(clean), Date.now());
        cache.set(key, clean);
      }
    }
  }

  console.log(`[SQLite Storage] Connected to SQLite database (${DB_PATH}) [WAL Mode Active]`);
}

/**
 * Filter out unnecessary, bloated, or ephemeral data.
 */
function cleanUnnecessaryData(key, data) {
  if (!data) return data;

  // Don't save per-user bloated tracking in analytics
  if (key === 'analytics.json' && typeof data === 'object') {
    const cleaned = {};
    for (const [cmd, stats] of Object.entries(data)) {
      if (stats && typeof stats === 'object') {
        cleaned[cmd] = {
          uses: stats.uses || 0,
          lastUsed: stats.lastUsed || 0
        };
      }
    }
    return cleaned;
  }

  // Remove unnecessary logs array from security config
  if (key === 'security.json' && typeof data === 'object') {
    delete data.logs;
    return data;
  }

  // Don't save expired reminders
  if (key === 'reminders.json' && Array.isArray(data)) {
    const now = Date.now();
    return data.filter(r => !r.triggerAt || r.triggerAt > now);
  }

  // Don't save expired no-prefix entries
  if (key === 'config.json' && data.noPrefixUsers && Array.isArray(data.noPrefixUsers)) {
    const now = Date.now();
    data.noPrefixUsers = data.noPrefixUsers.filter(u => {
      if (typeof u === 'string') return true;
      if (u.permanent) return true;
      if (u.expiresAt && now < u.expiresAt) return true;
      return false;
    });
  }

  return data;
}

/**
 * Migrates existing flat JSON files from storage/ into SQLite.
 */
function migrateLegacyData() {
  if (!fs.existsSync(STORAGE_DIR)) return;

  const entries = fs.readdirSync(STORAGE_DIR);
  for (const entry of entries) {
    const fullPath = path.join(STORAGE_DIR, entry);

    // Skip sqlite database files
    if (entry.startsWith('database.sqlite')) continue;

    // Remove legacy snipe.json (do NOT persist deleted messages to disk)
    if (entry === 'snipe.json') {
      try { fs.unlinkSync(fullPath); } catch {}
      continue;
    }

    if (entry.endsWith('.json') && fs.statSync(fullPath).isFile()) {
      try {
        const raw = fs.readFileSync(fullPath, 'utf-8').trim();
        if (raw) {
          const parsed = JSON.parse(raw);
          const clean = cleanUnnecessaryData(entry, parsed);
          // Safety: Only insert into SQLite if the key doesn't already exist.
          // Never overwrite active database state with legacy/default JSON files.
          const existing = stmts.getKv.get(entry);
          if (!existing) {
            stmts.setKv.run(entry, JSON.stringify(clean), Date.now());
            console.log(`[SQLite Migration] Migrated ${entry} into SQLite.`);
          } else {
            console.log(`[SQLite Migration] Skipped ${entry} (already exists in SQLite).`);
          }
        }
        // Remove old JSON file after migration check
        fs.unlinkSync(fullPath);
      } catch (err) {
        console.error(`[SQLite Migration] Error migrating ${entry}: ${err.message}`);
      }
    }
  }

  // Migrate automod configs directory
  const automodDir = path.join(STORAGE_DIR, 'automod');
  if (fs.existsSync(automodDir) && fs.statSync(automodDir).isDirectory()) {
    try {
      const files = fs.readdirSync(automodDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const guildId = file.replace('.json', '');
          const filePath = path.join(automodDir, file);
          try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const existing = stmts.getAutomod.get(guildId);
            if (!existing) {
              stmts.setAutomod.run(guildId, content, Date.now());
              console.log(`[SQLite Migration] Migrated automod config for guild ${guildId} into SQLite.`);
            } else {
              console.log(`[SQLite Migration] Skipped automod config for guild ${guildId} (already in SQLite).`);
            }
            fs.unlinkSync(filePath);
          } catch (e) {
            console.error(`[SQLite Migration] Failed to migrate automod file ${file}:`, e.message);
          }
        }
      }
      fs.rmdirSync(automodDir);
      console.log(`[SQLite Migration] Cleared legacy automod JSON directory.`);
    } catch (e) {
      console.error(`[SQLite Migration] Error processing automod directory:`, e.message);
    }
  }
}

/**
 * Read a dataset by key. Instant 0ms read from in-memory cache,
 * falling back to SQLite query.
 */
function read(key) {
  // Snipe is purely in-memory ephemeral data
  if (key === 'snipe.json') return {};

  if (cache.has(key)) return cache.get(key);

  const defaultData = DEFAULT_FILES[key] || {};
  if (!db || !stmts.getKv) return JSON.parse(JSON.stringify(defaultData));

  try {
    const row = stmts.getKv.get(key);
    if (row && row.value) {
      const data = cleanUnnecessaryData(key, JSON.parse(row.value));
      cache.set(key, data);
      return data;
    }
  } catch (err) {
    console.error(`[SQLite Storage] Error reading ${key}: ${err.message}`);
  }

  const clean = cleanUnnecessaryData(key, defaultData);
  cache.set(key, clean);
  return clean;
}

/**
 * Write a dataset by key into SQLite with ACID guarantees.
 */
function write(key, data) {
  // Do NOT write snipes to persistent storage (unnecessary deleted message retention)
  if (key === 'snipe.json') return;

  const cleaned = cleanUnnecessaryData(key, data);
  cache.set(key, cleaned);

  if (db && stmts.setKv) {
    try {
      stmts.setKv.run(key, JSON.stringify(cleaned), Date.now());
    } catch (err) {
      console.error(`[SQLite Storage] Error writing ${key}: ${err.message}`);
    }
  }
}

/**
 * AutoMod config SQLite integration
 */
function getAutomodConfig(guildId) {
  if (automodCache.has(guildId)) return automodCache.get(guildId);
  if (!db || !stmts.getAutomod) return null;

  try {
    const row = stmts.getAutomod.get(guildId);
    if (row && row.config) {
      const parsed = JSON.parse(row.config);
      automodCache.set(guildId, parsed);
      return parsed;
    }
  } catch (err) {
    console.error(`[SQLite AutoMod] Error reading config for guild ${guildId}: ${err.message}`);
  }
  return null;
}

function saveAutomodConfig(guildId, config) {
  automodCache.set(guildId, config);
  if (db && stmts.setAutomod) {
    try {
      stmts.setAutomod.run(guildId, JSON.stringify(config), Date.now());
    } catch (err) {
      console.error(`[SQLite AutoMod] Error saving config for guild ${guildId}: ${err.message}`);
    }
  }
}

function resetAutomodConfig(guildId) {
  automodCache.delete(guildId);
  if (db && stmts.delAutomod) {
    try {
      stmts.delAutomod.run(guildId);
    } catch (err) {
      console.error(`[SQLite AutoMod] Error resetting config for guild ${guildId}: ${err.message}`);
    }
  }
}

/**
 * Flush WAL changes to SQLite disk database
 */
async function flush() {
  if (db) {
    try {
      db.exec('PRAGMA wal_checkpoint(FULL);');
    } catch {}
  }
}

async function flushFile(key) {
  await flush();
}

function startPeriodicFlush(intervalMs) {
  // SQLite WAL handles write persistence automatically
  // Periodic checkpoint cleans WAL log
  setInterval(() => {
    flush().catch(() => {});
  }, intervalMs || 120000);
}

async function stopPeriodicFlush() {
  if (db) {
    try {
      db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
      db.close();
      db = null;
    } catch {}
  }
}

function sweep(key, arrayKey, maxAgeMs) {
  const data = read(key);
  if (!data[arrayKey] || !Array.isArray(data[arrayKey])) return;
  const now = Date.now();
  data[arrayKey] = data[arrayKey].filter(entry => {
    if (!entry.timestamp) return true;
    return (now - entry.timestamp) < maxAgeMs;
  });
  write(key, data);
}

function trimArray(key, arrayKey, maxLength) {
  const data = read(key);
  if (!data[arrayKey] || !Array.isArray(data[arrayKey])) return;
  if (data[arrayKey].length > maxLength) {
    data[arrayKey] = data[arrayKey].slice(-maxLength);
    write(key, data);
  }
}

function getCorruptedAlerts() {
  return corruptedAlerts;
}

function clearCorruptedAlerts() {
  corruptedAlerts.length = 0;
}

function getDatabase() {
  return db;
}

module.exports = {
  init,
  read,
  write,
  flush,
  flushFile,
  startPeriodicFlush,
  stopPeriodicFlush,
  sweep,
  trimArray,
  getCorruptedAlerts,
  clearCorruptedAlerts,
  getDatabase,
  getAutomodConfig,
  saveAutomodConfig,
  resetAutomodConfig
};
