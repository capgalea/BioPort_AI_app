const fs = require('fs');

const file = 'services/geminiService.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/import\.meta\.env/g, '(import.meta as any).env');

fs.writeFileSync(file, content);
console.log('Fixed env');
