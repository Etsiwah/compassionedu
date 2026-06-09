const fs = require('fs');
const path = require('path');

const frontendSrc = path.join(__dirname, 'frontend', 'src');
const apiCalls = new Set();

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      searchDir(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const regex = /api\.(get|post|patch|put|delete)\(['"`]([^'"`?]+)/g;
      let match;
      while ((match = regex.exec(content)) !== null) {
        const method = match[1].toUpperCase();
        let endpoint = match[2];
        if (!endpoint.startsWith('/')) endpoint = '/' + endpoint;
        endpoint = endpoint.replace(/\$\{[^}]+\}/g, ':param');
        apiCalls.add(`${method} ${endpoint}`);
      }
    }
  }
}

searchDir(frontendSrc);
const endpoints = Array.from(apiCalls).sort();
console.log('--- Frontend API Calls Found ---');
console.log(endpoints.join('\n'));
