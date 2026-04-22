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
const files = walk(commandsDir);

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, index) => {
        // Check for .reply( or .edit( without .catch
        if ((line.includes('.reply(') || line.includes('.edit(') || line.includes('.send(') || line.includes('.react(')) && !line.includes('.catch(') && !line.includes('//') && !line.includes('try {')) {
            // Check if it's awaited inside a try-catch block
            // This is a simple check, but helps find risky ones
            console.log(`[RISK] ${path.relative(__dirname, file)}:L${index + 1} -> ${line.trim()}`);
        }
    });
});
