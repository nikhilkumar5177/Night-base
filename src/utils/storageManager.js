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
  'config.json': { channelCommands: {}, disabledCommands: [], noPrefixUsers: [], aliasMode: true },
  'autorole.json': {},
  'privateChannels.json': {}
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
  if (cache.has(file)) return cache.get(file);
  const filePath = path.join(STORAGE_DIR, file);
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    cache.set(file, data);
    return data;
  } catch {
    const defaultData = DEFAULT_FILES[file] || {};
    cache.set(file, JSON.parse(JSON.stringify(defaultData)));
    return cache.get(file);
  }
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

function flushFile(file) {
  if (!cache.has(file)) return;
  const filePath = path.join(STORAGE_DIR, file);
  const tmpPath = filePath + '.tmp';
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(cache.get(file), null, 2));
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    try { fs.unlinkSync(tmpPath); } catch {}
  }
  dirty.delete(file);
}

function flush() {
  for (const file of dirty) {
    flushFile(file);
  }
}

function startPeriodicFlush(intervalMs) {
  if (flushInterval) return;
  flushInterval = setInterval(flush, intervalMs || 30000);
}

function stopPeriodicFlush() {
  if (flushInterval) {
    clearInterval(flushInterval);
    flushInterval = null;
  }
  for (const timer of debounceTimers.values()) {
    clearTimeout(timer);
  }
  debounceTimers.clear();
  flush();
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
