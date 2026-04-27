const fs = require('fs');
const path = require('path');

const commandsPath = path.join(process.cwd(), 'src', 'commands');
const categories = fs.readdirSync(commandsPath);

for (const category of categories) {
    const categoryPath = path.join(commandsPath, category);
    if (!fs.statSync(categoryPath).isDirectory()) continue;
    
    const commandFiles = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));
    for (const file of commandFiles) {
        const fullPath = path.join(categoryPath, file);
        const content = fs.readFileSync(fullPath, 'utf-8');
        
        if (content.includes('SlashCommandBuilder')) {
            const hasRequire = content.includes('require(\'discord.js\')') || content.includes('require("discord.js")');
            const hasDestructure = content.match(/const\s+\{([^}]*SlashCommandBuilder[^}]*)\}\s*=\s*require\(['"]discord\.js['"]\)/s);
            
            if (!hasRequire) {
                console.log(`[FAIL] ${file} uses SlashCommandBuilder but doesn't require discord.js`);
            } else if (!hasDestructure) {
                console.log(`[FAIL] ${file} uses SlashCommandBuilder but it's not in the destructuring assignment`);
            } else {
                // console.log(`[OK] ${file}`);
            }
        }
    }
}
