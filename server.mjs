import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { pipeline } from 'node:stream';

const PORT = parseInt(process.env.PORT, 10) || 4321;
const HOST = process.env.HOST || '0.0.0.0';
const DIST_DIR = path.resolve('dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.mjs': 'text/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
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
  '.eot': 'application/vnd.ms-fontobject',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=UTF-8'
};

const COMPRESSIBLE_EXTS = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.xml', '.txt']);

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
}

function serve404(req, res) {
  const notFoundPath = path.join(DIST_DIR, '404.html');
  res.statusCode = 404;
  setSecurityHeaders(res);
  res.setHeader('Content-Type', 'text/html; charset=UTF-8');
  res.setHeader('Cache-Control', 'no-cache');

  if (fs.existsSync(notFoundPath)) {
    fs.createReadStream(notFoundPath).pipe(res);
  } else {
    res.end('404 Not Found');
  }
}

function resolveFilePath(reqUrl) {
  let cleanUrl = reqUrl.split('?')[0];
  let decoded = decodeURIComponent(cleanUrl);

  // Normalize legacy relative path artifacts if any
  if (decoded.includes('/wp-content/')) {
    decoded = decoded.slice(decoded.indexOf('/wp-content/'));
  } else if (decoded.includes('/wp-includes/')) {
    decoded = decoded.slice(decoded.indexOf('/wp-includes/'));
  }

  let rel = decoded.startsWith('/') ? decoded.slice(1) : decoded;
  let filePath = path.join(DIST_DIR, rel);

  // Direct exact file
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return filePath;
  }

  // Directory with index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    const idx = path.join(filePath, 'index.html');
    if (fs.existsSync(idx)) return idx;
  }

  // Subpath without trailing slash -> path/index.html
  const directIdx = path.join(DIST_DIR, rel, 'index.html');
  if (fs.existsSync(directIdx)) {
    return directIdx;
  }

  // Fallback for image dimensions (e.g. -300x128.png -> .png)
  const baseImagePath = filePath.replace(/-\d+x\d+(\.[a-z0-9]+)$/i, '$1');
  if (fs.existsSync(baseImagePath) && fs.statSync(baseImagePath).isFile()) {
    return baseImagePath;
  }

  return null;
}

function handleRequest(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, HEAD');
    return res.end('Method Not Allowed');
  }

  const filePath = resolveFilePath(req.url);
  if (!filePath) {
    return serve404(req, res);
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const stat = fs.statSync(filePath);

  setSecurityHeaders(res);
  res.setHeader('Content-Type', contentType);

  // Caching Strategy:
  // HTML, JS, CSS: revalidate immediately
  // Other static assets (Fonts, Images): 1 year immutable
  if (ext === '.html' || ext === '.js' || ext === '.css' || ext === '.mjs') {
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  } else {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }

  // ETag / Conditional Requests
  const etag = `"${stat.size.toString(16)}-${stat.mtimeMs.toString(16)}"`;
  res.setHeader('ETag', etag);

  if (req.headers['if-none-match'] === etag) {
    res.statusCode = 304;
    return res.end();
  }

  if (req.method === 'HEAD') {
    res.statusCode = 200;
    return res.end();
  }

  const acceptEncoding = req.headers['accept-encoding'] || '';
  const isCompressible = COMPRESSIBLE_EXTS.has(ext);

  if (isCompressible && acceptEncoding.includes('br')) {
    res.setHeader('Content-Encoding', 'br');
    res.setHeader('Vary', 'Accept-Encoding');
    res.statusCode = 200;
    pipeline(fs.createReadStream(filePath), zlib.createBrotliCompress(), res, () => {});
  } else if (isCompressible && acceptEncoding.includes('gzip')) {
    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Vary', 'Accept-Encoding');
    res.statusCode = 200;
    pipeline(fs.createReadStream(filePath), zlib.createGzip(), res, () => {});
  } else {
    res.setHeader('Content-Length', stat.size);
    res.statusCode = 200;
    fs.createReadStream(filePath).pipe(res);
  }
}

const server = http.createServer(handleRequest);

server.listen(PORT, HOST, () => {
  console.log(`\n🚀 Deltachem Production Server running at http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/`);
  console.log(`⚡ Gzip & Brotli compression active | Immutable caching enabled\n`);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, closing server...');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, closing server...');
  server.close(() => process.exit(0));
});
