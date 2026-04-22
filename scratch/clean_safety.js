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

    // Pattern: new EmbedBuilder().catch(...) -> new EmbedBuilder()
    const regex = /new EmbedBuilder\(\)\.catch\(\(\) => {}\)/g;
    
    if (regex.test(content)) {
        content = content.replace(regex, 'new EmbedBuilder()');
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(file, content);
        console.log(`[CLEANED] ${path.relative(process.cwd(), file)}`);
    }
});
