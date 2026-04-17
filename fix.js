import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(/    \}        \$\{whereClause\}\n        ORDER BY p\.priority_date DESC LIMIT @limit\n      `;\n    \}/g, '    }');
fs.writeFileSync('server.ts', content);
