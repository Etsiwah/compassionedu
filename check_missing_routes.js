const fs = require('fs');
const path = require('path');

const backendRoutesDir = path.join(__dirname, 'backend', 'src', 'routes');
const backendRoutes = [];

function parseBackendRoutes() {
  const files = fs.readdirSync(backendRoutesDir);
  for (const file of files) {
    if (file.endsWith('.js')) {
      const content = fs.readFileSync(path.join(backendRoutesDir, file), 'utf8');
      const regex = /router\.(get|post|patch|put|delete)\(['"`]([^'"`]+)['"`]/g;
      let match;
      const baseName = file.replace('.js', '');
      while ((match = regex.exec(content)) !== null) {
        let method = match[1].toUpperCase();
        let endpoint = match[2];
        backendRoutes.push({ file: baseName, method, endpoint });
      }
    }
  }
}
parseBackendRoutes();
console.log(backendRoutes);
