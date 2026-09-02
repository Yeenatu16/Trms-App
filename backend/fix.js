const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) results = results.concat(walk(file));
    else if (file.endsWith('.module.ts') && !file.includes('auth.module') && !file.includes('app.module')) results.push(file);
  });
  return results;
}

const modules = walk('./src');
modules.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  if (!content.includes('AuthModule')) {
    const importStmt = "import { AuthModule } from '../auth/auth.module';\n";
    const moduleRegex = /@Module\(\{\s*(imports:\s*\[[^\]]*\])?/m;
    const match = content.match(moduleRegex);
    if (match) {
      if (match[1]) {
        content = content.replace(/imports:\s*\[/, 'imports: [\n    AuthModule,');
      } else {
        content = content.replace(/@Module\(\{/, '@Module({\n  imports: [AuthModule],');
      }
      content = importStmt + content;
      fs.writeFileSync(f, content);
      console.log('Added AuthModule to ' + f);
    }
  }
});
