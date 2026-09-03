const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  if (content.includes("'http://localhost:3001/auth/session'")) {
    content = content.replace(/'http:\/\/localhost:3001\/auth\/session'/g, "`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/session`");
    changed = true;
  }
  if (content.includes("'http://localhost:3001/auth/login'")) {
    content = content.replace(/'http:\/\/localhost:3001\/auth\/login'/g, "`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/login`");
    changed = true;
  }
  if (content.includes("'http://localhost:3001/auth/signup'")) {
    content = content.replace(/'http:\/\/localhost:3001\/auth\/signup'/g, "`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/signup`");
    changed = true;
  }
  if (content.includes("'http://localhost:3001/auth/logout'")) {
    content = content.replace(/'http:\/\/localhost:3001\/auth\/logout'/g, "`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/logout`");
    changed = true;
  }
  if (content.includes("'http://localhost:3001/api/users/profile'")) {
    content = content.replace(/'http:\/\/localhost:3001\/api\/users\/profile'/g, "`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/users/profile`");
    changed = true;
  }
  if (content.includes('"http://localhost:3001"')) {
    content = content.replace(/"http:\/\/localhost:3001"/g, "(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001')");
    changed = true;
  }
  if (content.includes("'http://localhost:3001'")) {
    content = content.replace(/'http:\/\/localhost:3001'/g, "(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001')");
    changed = true;
  }

  if (changed) {
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
