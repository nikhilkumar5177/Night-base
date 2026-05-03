const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'src');
const DIST_DIR = path.join(__dirname, 'dist');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function obfuscateFile(inputPath, outputPath) {
  const code = fs.readFileSync(inputPath, 'utf-8');
  const result = JavaScriptObfuscator.obfuscate(code, {
    compact: true,
    controlFlowFlattening: false,
    controlFlowFlatteningThreshold: 0.5,
    deadCodeInjection: false,
    deadCodeInjectionThreshold: 0.2,
    debugProtection: false,
    disableConsoleOutput: false,
    identifierNamesGenerator: 'hexadecimal',
    renameGlobals: false,
    selfDefending: false,
    stringArray: true,
    stringArrayThreshold: 0.75,
    unicodeEscapeSequence: false
  });
  ensureDir(path.dirname(outputPath));
  fs.writeFileSync(outputPath, result.getObfuscatedCode());
}

function processDir(dir, outDir) {
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const outPath = path.join(outDir, entry);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath, outPath);
    } else if (entry.endsWith('.js')) {
      obfuscateFile(fullPath, outPath);
      console.log(`Obfuscated: ${fullPath}`);
    }
  }
}

ensureDir(DIST_DIR);

const indexPath = path.join(__dirname, 'index.js');
obfuscateFile(indexPath, path.join(DIST_DIR, 'index.js'));
console.log('Obfuscated: index.js');

processDir(SRC_DIR, path.join(DIST_DIR, 'src'));

const filesToCopy = ['config.json', 'package.json', '.env.example'];
for (const file of filesToCopy) {
  const src = path.join(__dirname, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(DIST_DIR, file));
  }
}

const storageDir = path.join(DIST_DIR, 'storage');
ensureDir(storageDir);
const storageSrc = path.join(__dirname, 'storage');
if (fs.existsSync(storageSrc)) {
  const files = fs.readdirSync(storageSrc);
  for (const file of files) {
    fs.copyFileSync(path.join(storageSrc, file), path.join(storageDir, file));
  }
}

console.log('Obfuscation complete. Output in dist/');
