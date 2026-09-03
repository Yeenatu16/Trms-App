const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  if (content.match(/^import \{ getApiUrl \} from '@\/lib\/config';\r?\n"use client";\r?\n/)) {
    content = content.replace(
      /^import \{ getApiUrl \} from '@\/lib\/config';\r?\n"use client";\r?\n/,
      "\"use client\";\nimport { getApiUrl } from '@/lib/config';\n"
    );
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Fixed use client: " + filePath);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      replaceInFile(fullPath);
    }
  }
}

walkDir(path.join(__dirname, 'src'));
