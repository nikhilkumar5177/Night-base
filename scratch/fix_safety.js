const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.js')) {
            results.push(file);
        }
    });
    return results;
}

const commandsDir = path.join(process.cwd(), 'src', 'commands');
const eventsDir = path.join(process.cwd(), 'src', 'events');
const files = [...walk(commandsDir), ...walk(eventsDir)];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // Pattern 1: message.reply({ ... }) -> message.reply({ ... }).catch(() => {})
    // Only if not followed by .catch, .then, or inside a try/catch (simplified)
    
    const patterns = [
        /\.reply\(([^)]*)\)(?!\s*\.catch)/g,
        /\.send\(([^)]*)\)(?!\s*\.catch)/g,
        /\.edit\(([^)]*)\)(?!\s*\.catch)/g,
        /\.react\(([^)]*)\)(?!\s*\.catch)/g,
        /\.delete\(\)(?!\s*\.catch)/g
    ];

    patterns.forEach(regex => {
        content = content.replace(regex, (match) => {
            // Check if it's already awaited or part of a chain we shouldn't touch
            if (match.includes('.then') || match.includes('.catch')) return match;
            
            changed = true;
            if (match.startsWith('.reply') || match.startsWith('.send') || match.startsWith('.edit') || match.startsWith('.react')) {
                 return `${match}.catch(() => {})`;
            } else if (match === '.delete()') {
                 return `${match}.catch(() => {})`;
            }
            return match;
        });
    });

    if (changed) {
        fs.writeFileSync(file, content);
        console.log(`[FIXED] ${path.relative(process.cwd(), file)}`);
    }
});
