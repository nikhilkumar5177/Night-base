const fs = require('fs');
const path = require('path');
const { ZipArchive } = require('archiver');

const rootDir = path.join(__dirname, '..');
const outputFile = path.join(rootDir, 'bot-deploy.zip');

if (fs.existsSync(outputFile)) {
  try { fs.unlinkSync(outputFile); } catch {}
}

const output = fs.createWriteStream(outputFile);
const archive = new ZipArchive({ zlib: { level: 9 } });

output.on('close', () => {
  const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
  console.log(`\n========================================`);
  console.log(`✅ Deployment package created successfully!`);
  console.log(`📁 File: bot-deploy.zip (${sizeMB} MB)`);
  console.log(`🚀 Clean bundle with no node_modules or .git.`);
  console.log(`📦 Ready for instant 1-click upload via SFTP or Panel.`);
  console.log(`========================================\n`);
});

archive.on('error', (err) => {
  console.error('❌ Error archiving files:', err.message);
  process.exit(1);
});

archive.pipe(output);

// Files to include
const rootFiles = [
  'index.js',
  'config.json',
  'package.json',
  'package-lock.json',
  '.nvmrc',
  '.sftpignore'
];

// Include .env if it exists, otherwise include .env.example
if (fs.existsSync(path.join(rootDir, '.env'))) {
  rootFiles.push('.env');
} else if (fs.existsSync(path.join(rootDir, '.env.example'))) {
  rootFiles.push('.env.example');
}

for (const file of rootFiles) {
  const fullPath = path.join(rootDir, file);
  if (fs.existsSync(fullPath)) {
    archive.file(fullPath, { name: file });
  }
}

// Include entire src directory
archive.directory(path.join(rootDir, 'src'), 'src');

// Ensure empty storage folder exists in zip
archive.append('', { name: 'storage/.gitkeep' });

archive.finalize();
