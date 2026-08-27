import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import https from 'node:https';
import http from 'node:http';

const PUBLIC_DIR = path.resolve('public');
const DIST_DIR = path.resolve('dist');

console.log('=== [1/5] Building Astro Static Bundle ===');
execSync('node node_modules/astro/dist/cli/index.js build', { stdio: 'inherit' });

console.log('\n=== [2/5] Verifying & Ensuring Dynamic Webpack JavaScript Chunks ===');
const CHUNKS = [
  'wp-content/plugins/elementor/assets/js/shared-frontend-handlers.03caa53373b56d3bab67.bundle.min.js',
  'wp-content/plugins/elementor-pro/assets/js/mega-menu.857df1cf3198ae47b617.bundle.min.js',
  'wp-content/plugins/elementor-pro/assets/js/mega-menu-stretch-content.7ed04741ba7d5a80c556.bundle.min.js',
  'wp-content/plugins/elementor-pro/assets/js/menu-title-keyboard-handler.b3891112675eb0b0c4d5.bundle.min.js',
  'wp-content/plugins/elementor/assets/js/text-editor.45609661e409413f1cef.bundle.min.js',
  'wp-content/plugins/elementor-pro/assets/js/load-more.7c4417f8a727b79f546f.bundle.min.js',
  'wp-content/plugins/elementor-pro/assets/js/posts.844727d8428792223d2f.bundle.min.js',
  'wp-content/plugins/elementor/assets/js/image-carousel.6167d20b95b33386757b.bundle.min.js',
  'wp-includes/js/wp-emoji-release.min.js'
];

function downloadFile(urlStr, destPath) {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(urlStr);
      const httpModule = parsedUrl.protocol === 'https:' ? https : http;
      const dir = path.dirname(destPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const file = fs.createWriteStream(destPath);
      httpModule.get(parsedUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
          file.close();
          if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
          return downloadFile(res.headers.location, destPath).then(resolve);
        }
        if (res.statusCode !== 200) {
          file.close();
          if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
          return resolve(false);
        }
        res.pipe(file);
        file.on('finish', () => {
          file.close(() => resolve(true));
        });
      }).on('error', () => {
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

for (const rel of CHUNKS) {
  const pubPath = path.join(PUBLIC_DIR, rel);
  const distPath = path.join(DIST_DIR, rel);

  if (!fs.existsSync(distPath)) {
    if (fs.existsSync(pubPath)) {
      const dir = path.dirname(distPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.copyFileSync(pubPath, distPath);
    } else {
      await downloadFile(`https://www.deltachem.pro/${rel}`, pubPath);
      if (fs.existsSync(pubPath)) {
        const dir = path.dirname(distPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.copyFileSync(pubPath, distPath);
      }
    }
  }
}

console.log('✓ JavaScript dynamic bundles ready');

console.log('\n=== [3/5] Deploying High-Resolution Brand Logos & Variants ===');
const sourceLogo = path.resolve('public/wp-content/Main-logo-Deltachem-2048x872.png');
if (fs.existsSync(sourceLogo)) {
  const distLogoPath = path.resolve('dist/wp-content/Main-logo-Deltachem-2048x872.png');
  fs.mkdirSync(path.dirname(distLogoPath), { recursive: true });
  fs.copyFileSync(sourceLogo, distLogoPath);

  const uploadsDirs = [
    path.resolve('public/wp-content/uploads/2024/10'),
    path.resolve('dist/wp-content/uploads/2024/10')
  ];

  const logoVariants = [
    'Main-logo-Deltachem.png',
    'Main-logo-Deltachem-2048x872.png',
    'Main-logo-Deltachem-1536x654.png',
    'Main-logo-Deltachem-1024x436.png',
    'Main-logo-Deltachem-768x327.png',
    'Main-logo-Deltachem-300x128.png',
    'Main-logo-Deltachem-scaled.png'
  ];

  for (const dir of uploadsDirs) {
    fs.mkdirSync(dir, { recursive: true });
    for (const v of logoVariants) {
      fs.copyFileSync(sourceLogo, path.join(dir, v));
    }
  }
}
console.log('✓ Brand logos synced');

console.log('\n=== [4/5] Injecting Custom Header Logo Frame CSS ===');
const customHeaderCSS = `
/* Custom Header Logo Frame Fix */
.elementor-element-464bec70 {
  min-width: 180px !important;
  max-width: 280px !important;
  flex: 0 0 auto !important;
}
.elementor-element-5846fc31 img,
.elementor-widget-theme-site-logo img {
  width: auto !important;
  height: auto !important;
  max-height: 65px !important;
  max-width: 100% !important;
  object-fit: contain !important;
  object-position: left center !important;
  display: block !important;
}
`;

const cssFiles = [
  path.resolve('public/wp-content/uploads/elementor/css/post-113.css'),
  path.resolve('dist/wp-content/uploads/elementor/css/post-113.css')
];

for (const f of cssFiles) {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    if (!content.includes('Custom Header Logo Frame Fix')) {
      content += customHeaderCSS;
      fs.writeFileSync(f, content, 'utf8');
    }
  }
}
console.log('✓ Header CSS verified');

console.log('\n=== [5/5] Sanitizing HTML Paths & Header Logo Tags across dist/... ===');
const headerTag = `<img fetchpriority="high" width="2447" height="1042" src="/wp-content/Main-logo-Deltachem-2048x872.png" class="attachment-full size-full wp-image-103" alt="Deltachem Logo" />`;

function sanitizeHtml(content) {
  let rewritten = content;
  // Fix header logo tag
  rewritten = rewritten.replace(/<img[^>]*wp-image-103[^>]*>/gi, headerTag);

  // Fix all corrupted relative references to wp-content and wp-includes
  rewritten = rewritten.replace(/([\"\'])(?:(?:\.\.|\.)+\/)+wp-content\//g, '$1/wp-content/');
  rewritten = rewritten.replace(/([\"\'])(?:(?:\.\.|\.)+\/)+wp-includes\//g, '$1/wp-includes/');
  rewritten = rewritten.replace(/url\(([\"\']?)(?:(?:\.\.|\.)+\/)+wp-content\//g, 'url($1/wp-content/');
  rewritten = rewritten.replace(/url\(([\"\']?)(?:(?:\.\.|\.)+\/)+wp-includes\//g, 'url($1/wp-includes/');
  rewritten = rewritten.replace(/\\\/ жизнен/g, '/');
  rewritten = rewritten.replace(/(?:(?:\.\.|\.)+\\\/)+wp-content\\\//g, '\\/wp-content\\/');
  rewritten = rewritten.replace(/(?:(?:\.\.|\.)+\\\/)+wp-includes\\\//g, '\\/wp-includes\\/');
  rewritten = rewritten.replace(/https?:\/\/(www\.)?deltachem\.pro\/wp-content\//gi, '/wp-content/');
  rewritten = rewritten.replace(/https?:\/\/(www\.)?deltachem\.pro\/wp-includes\//gi, '/wp-includes/');
  rewritten = rewritten.replace(/https?:\\\/\\\/[^\/]+\\\/wp-content\\\//gi, '\\/wp-content\\/');
  rewritten = rewritten.replace(/https?:\\\/\\\/[^\/]+\\\/wp-includes\\\//gi, '\\/wp-includes\\/');
  rewritten = rewritten.replace(/(?<!:)\/\/\/+/g, '/');
  return rewritten;
}

function processHtmlFiles(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      processHtmlFiles(full);
    } else if (entry.isFile() && entry.name === 'index.html') {
      const original = fs.readFileSync(full, 'utf8');
      const fixed = sanitizeHtml(original);
      if (original !== fixed) {
        fs.writeFileSync(full, fixed, 'utf8');
      }
    }
  }
}

processHtmlFiles(PUBLIC_DIR);
processHtmlFiles(DIST_DIR);

console.log('✓ All HTML paths sanitized');
console.log('\n✨ Production build completed successfully in ./dist/ ✨\n');
