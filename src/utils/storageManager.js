const fs = require('fs');
const path = require('path');

const cache = new Map();
const dirty = new Set();
const STORAGE_DIR = path.join(__dirname, '..', '..', 'storage');

const DEFAULT_FILES = {
  'warns.json': {},
  'blacklist.json': { users: [] },
  'aliases.json': {},
  'staff.json': { roles: [] },
  'cmdBlacklist.json': {},
  'snipe.json': {},
  'vouch.json': { channels: [] },
  'reminders.json': [],
  'analytics.json': {},
  'security.json': { enabled: false, logs: [], nukeThreshold: 3, nukeWindow: 10000 },
  'config.json': { channelCommands: {}, disabledCommands: [], noPrefixUsers: [], aliasMode: true, maintenance: false },
  'autorole.json': {},
  'privateChannels.json': {},
  'vcjoiner.json': {}
};

let flushInterval = null;
let debounceTimers = new Map();

function init() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
  for (const [file, defaultData] of Object.entries(DEFAULT_FILES)) {
    const filePath = path.join(STORAGE_DIR, file);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
    }
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      cache.set(file, data);
    } catch {
      cache.set(file, JSON.parse(JSON.stringify(defaultData)));
    }
  }
}

function read(file) {
  const defaultData = DEFAULT_FILES[file] || {};
  let data;
  
  if (cache.has(file)) {
    data = cache.get(file);
  } else {
    const filePath = path.join(STORAGE_DIR, file);
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      data = JSON.parse(JSON.stringify(defaultData));
    }
    cache.set(file, data);
  }

  // Deep merge/ensure defaults for top-level keys if it's an object
  if (data && typeof data === 'object' && !Array.isArray(data) && defaultData && typeof defaultData === 'object' && !Array.isArray(defaultData)) {
    let changed = false;
    for (const [key, value] of Object.entries(defaultData)) {
      if (data[key] === undefined) {
        data[key] = JSON.parse(JSON.stringify(value));
        changed = true;
      }
    }
    if (changed) write(file, data);
  }

  return data;
}

function write(file, data) {
  cache.set(file, data);
  dirty.add(file);
  if (debounceTimers.has(file)) {
    clearTimeout(debounceTimers.get(file));
  }
  debounceTimers.set(file, setTimeout(() => {
    flushFile(file);
    debounceTimers.delete(file);
  }, 5000));
}

async function flushFile(file) {
  if (!cache.has(file)) return;
  const filePath = path.join(STORAGE_DIR, file);
  const tmpPath = filePath + '.tmp';
  try {
    const content = JSON.stringify(cache.get(file));
    await fs.promises.writeFile(tmpPath, content);
    await fs.promises.rename(tmpPath, filePath);
  } catch (err) {
    try { await fs.promises.unlink(tmpPath); } catch {}
  }
  dirty.delete(file);
}

async function flush() {
  const promises = [];
  for (const file of dirty) {
    promises.push(flushFile(file));
  }
  await Promise.all(promises);
}

function startPeriodicFlush(intervalMs) {
  if (flushInterval) return;
  flushInterval = setInterval(flush, intervalMs || 30000);
}

async function stopPeriodicFlush() {
  if (flushInterval) {
    clearInterval(flushInterval);
    flushInterval = null;
  }
  for (const timer of debounceTimers.values()) {
    clearTimeout(timer);
  }
  debounceTimers.clear();
  await flush();
}

function sweep(file, key, maxAgeMs) {
  const data = read(file);
  if (!data[key] || !Array.isArray(data[key])) return;
  const now = Date.now();
  data[key] = data[key].filter(entry => {
    if (!entry.timestamp) return true;
    return (now - entry.timestamp) < maxAgeMs;
  });
  write(file, data);
}

function trimArray(file, key, maxLength) {
  const data = read(file);
  if (!data[key] || !Array.isArray(data[key])) return;
  if (data[key].length > maxLength) {
    data[key] = data[key].slice(-maxLength);
    write(file, data);
  }
}

module.exports = { init, read, write, flush, flushFile, startPeriodicFlush, stopPeriodicFlush, sweep, trimArray };
