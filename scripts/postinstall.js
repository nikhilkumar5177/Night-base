/**
 * postinstall.js
 * Copies the local TypeScript package to the global node_modules location
 * so that the globally-installed ts-node (Pterodactyl egg) can find it.
 * Fails silently on non-Linux environments (e.g. Windows dev machines).
 */
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'node_modules', 'typescript');
const dest = '/usr/local/lib/node_modules/typescript';

try {
  if (!fs.existsSync(src)) {
    console.log('[postinstall] typescript not in node_modules, skipping.');
    process.exit(0);
  }

  if (fs.existsSync(dest)) {
    console.log('[postinstall] typescript already present at global path, skipping.');
    process.exit(0);
  }

  fs.cpSync(src, dest, { recursive: true });
  console.log('[postinstall] Copied typescript to global node_modules for ts-node compatibility.');
} catch (e) {
  // Silently skip — this only matters on the Pterodactyl Linux host
}
