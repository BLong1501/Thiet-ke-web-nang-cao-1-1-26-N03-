// Documentation server only: no database connection, no API business handlers.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const backendRequire = createRequire(path.resolve(__dirname, '../../backend/package.json'));
const swaggerDirectory = backendRequire('swagger-ui-dist').getAbsoluteFSPath();
const files = {
  '/': [path.resolve(__dirname, '../index.html'), 'text/html; charset=utf-8'],
  '/openapi.json': [path.resolve(__dirname, '../openapi.json'), 'application/json; charset=utf-8'],
  '/swagger-ui.css': [path.join(swaggerDirectory, 'swagger-ui.css'), 'text/css'],
  '/swagger-ui-bundle.js': [path.join(swaggerDirectory, 'swagger-ui-bundle.js'), 'application/javascript'],
  '/swagger-init.js': [path.resolve(__dirname, '../swagger-init.js'), 'application/javascript'],
};
http.createServer((req, res) => {
  const item = files[new URL(req.url, 'http://localhost').pathname];
  if (!item || !['GET', 'HEAD'].includes(req.method)) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', item[1]);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'HEAD') { res.end(); return; }
  fs.createReadStream(item[0]).on('error', () => { res.destroy(); }).pipe(res);
}).listen(Number(process.env.DOCS_PORT || 8081), '127.0.0.1', () => {
  console.log(`Swagger UI: http://127.0.0.1:${process.env.DOCS_PORT || 8081}`);
});
