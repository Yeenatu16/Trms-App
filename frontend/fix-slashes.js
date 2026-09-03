const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  // Patterns to find the messy URL logic
  const pattern1 = /\$\{process\.env\.NEXT_PUBLIC_API_URL\s*\|\|\s*\(\s*process\.env\.NEXT_PUBLIC_API_URL\s*\|\|\s*'http:\/\/localhost:3001'\s*\)\}/g;
  const pattern2 = /process\.env\.NEXT_PUBLIC_API_URL\s*\|\|\s*\(\s*process\.env\.NEXT_PUBLIC_API_URL\s*\|\|\s*'http:\/\/localhost:3001'\s*\)/g;
  const pattern3 = /\$\{process\.env\.NEXT_PUBLIC_API_URL\s*\|\|\s*'http:\/\/localhost:3001'\}/g;
  const pattern4 = /process\.env\.NEXT_PUBLIC_API_URL\s*\|\|\s*'http:\/\/localhost:3001'/g;

  if (pattern1.test(content) || pattern2.test(content) || pattern3.test(content) || pattern4.test(content)) {
    content = content.replace(pattern1, "${getApiUrl()}");
    content = content.replace(pattern2, "getApiUrl()");
    content = content.replace(pattern3, "${getApiUrl()}");
    content = content.replace(pattern4, "getApiUrl()");
    changed = true;
  }
  
  if (changed) {
    // Add import statement at the top
    let importPath = '@/lib/config';
    if (!content.includes("import { getApiUrl }")) {
      content = `import { getApiUrl } from '${importPath}';\n` + content;
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Updated: " + filePath);
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
