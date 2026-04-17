import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(/\\\$\{whereClause\}/g, '${whereClause}');
content = content.replace(/\\\$\{uniqueParamName\}/g, '${uniqueParamName}');
content = content.replace(/\\\$\{querySql\}/g, '${querySql}');
fs.writeFileSync('server.ts', content);
