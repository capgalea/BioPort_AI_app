const fs = require('fs');
const path = require('path');

function walkDir(dir) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath);
        } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
            let content = fs.readFileSync(dirPath, 'utf8');
            let newContent = content.replace(/(import\s+.*?from\s+['"].*?)\.tsx?(['"])/g, '$1$2');
            newContent = newContent.replace(/(import\(['"].*?)\.tsx?(['"]\))/g, '$1$2');
            if (content !== newContent) {
                fs.writeFileSync(dirPath, newContent);
                console.log(`Updated ${dirPath}`);
            }
        }
    });
}
walkDir('./components');
walkDir('./App.tsx');
