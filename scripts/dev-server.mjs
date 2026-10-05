import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const root = process.cwd();
const port = Number(process.env.PORT || 5500);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8'
};

function safePath(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]).replace(/^\/+/, '');
  const target = path.resolve(root, clean || 'index.html');
  return target.startsWith(root) ? target : path.join(root, 'index.html');
}

function sendFile(res, filePath) {
  fs.stat(filePath, (statError, stat) => {
    if (statError || !stat.isFile()) {
      return sendFile(res, path.join(root, 'index.html'));
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });

    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const requested = safePath(req.url || '/');

  fs.stat(requested, (error, stat) => {
    if (!error && stat.isFile()) {
      sendFile(res, requested);
      return;
    }

    if (!error && stat.isDirectory()) {
      sendFile(res, path.join(requested, 'index.html'));
      return;
    }

    sendFile(res, path.join(root, 'index.html'));
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log('');
  console.log(`FTC Programming Atlas dev server: http://localhost:${port}`);

  const interfaces = os.networkInterfaces();

  for (const entries of Object.values(interfaces)) {
    for (const info of entries || []) {
      if (info.family === 'IPv4' && !info.internal) {
        console.log(`Phone / LAN: http://${info.address}:${port}`);
      }
    }
  }

  console.log('');
});
