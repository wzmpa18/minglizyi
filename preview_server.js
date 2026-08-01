const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3003;
const ROOT = path.join(__dirname, '06-app', 'out');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  let filePath = path.join(ROOT, urlPath);
  
  // Try direct file
  try {
    const stat = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
    if (stat && stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    if (stat && stat.isFile()) {
      sendFile(res, filePath);
      return;
    }
  } catch (e) {}
  
  // Try adding .html (for trailingSlash:false routes)
  const htmlPath = filePath + '.html';
  if (fs.existsSync(htmlPath) && fs.statSync(htmlPath).isFile()) {
    sendFile(res, htmlPath);
    return;
  }
  
  // SPA fallback to root index.html for non-asset paths
  if (!urlPath.startsWith('/_next/') && !path.extname(urlPath)) {
    // Try path/index.html first
    const idxPath = path.join(ROOT, urlPath, 'index.html');
    if (fs.existsSync(idxPath)) {
      sendFile(res, idxPath);
      return;
    }
    sendFile(res, path.join(ROOT, 'index.html'));
    return;
  }
  
  res.writeHead(404);
  res.end('Not Found');
});

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime });
  fs.createReadStream(filePath).pipe(res);
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`言道APP本地预览: http://localhost:${PORT}`);
  console.log(`静态目录: ${ROOT}`);
});
