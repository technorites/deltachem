import http from 'node:http';

const PORT = parseInt(process.env.PORT, 10) || 4321;
const BASE_URL = `http://localhost:${PORT}`;

const ROUTES = [
  '/',
  '/arable-crops/',
  '/b2b/',
  '/coating/',
  '/contact-form/',
  '/deltaboost/',
  '/deltachem/',
  '/deltacote/',
  '/deltalent/',
  '/deltalent-active/',
  '/deltalent-duo-active/',
  '/deltalent-yousafe-force/',
  '/deltastim/',
  '/deltastim-active-p/',
  '/download/',
  '/events/ipm-2025/',
  '/events/tsw-2025/',
  '/intermediates/',
  '/knowledge/',
  '/ornamental/',
  '/people/',
  '/plantation/',
  '/privacy-policy/',
  '/products/',
  '/quality/',
  '/sport-green/',
  '/stabilizing/',
  '/trade-condition/',
  '/trails/potato-trial-uan-stabilized-with-deltalent-active-1-3/',
  '/vegetables-fruits/'
];

const ASSETS = [
  '/wp-content/Main-logo-Deltachem-2048x872.png',
  '/wp-content/plugins/elementor/assets/js/shared-frontend-handlers.03caa53373b56d3bab67.bundle.min.js',
  '/wp-content/plugins/elementor-pro/assets/js/mega-menu.857df1cf3198ae47b617.bundle.min.js',
  '/wp-content/plugins/elementor-pro/assets/js/mega-menu-stretch-content.7ed04741ba7d5a80c556.bundle.min.js',
  '/wp-content/plugins/elementor-pro/assets/js/menu-title-keyboard-handler.b3891112675eb0b0c4d5.bundle.min.js',
  '/wp-content/plugins/elementor/assets/js/text-editor.45609661e409413f1cef.bundle.min.js',
  '/wp-content/plugins/elementor-pro/assets/js/load-more.7c4417f8a727b79f546f.bundle.min.js',
  '/wp-content/plugins/elementor-pro/assets/js/posts.844727d8428792223d2f.bundle.min.js',
  '/wp-content/plugins/elementor/assets/js/image-carousel.6167d20b95b33386757b.bundle.min.js',
  '/wp-includes/js/wp-emoji-release.min.js'
];

function fetchEndpoint(urlPath, headers = {}) {
  return new Promise((resolve) => {
    const start = performance.now();
    const req = http.get(`${BASE_URL}${urlPath}`, { headers }, (res) => {
      let data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => {
        const elapsed = (performance.now() - start).toFixed(2);
        resolve({
          path: urlPath,
          status: res.statusCode,
          headers: res.headers,
          latencyMs: elapsed,
          size: Buffer.concat(data).length
        });
      });
    });
    req.on('error', (err) => {
      resolve({ path: urlPath, error: err.message, status: 0 });
    });
  });
}

async function runTests() {
  console.log(`\n🔍 Testing Deltachem Production Endpoints against ${BASE_URL}...\n`);

  let allPassed = true;

  console.log('--- 1. Testing All 30 Website Pages ---');
  for (const route of ROUTES) {
    const res = await fetchEndpoint(route, { 'Accept-Encoding': 'gzip' });
    if (res.status === 200 && res.headers['content-type']?.includes('text/html')) {
      console.log(`  ✓ [200 OK] ${route.padEnd(65)} (${res.latencyMs}ms, ${res.headers['content-encoding'] || 'identity'})`);
    } else {
      console.error(`  ✗ [FAILED ${res.status}] ${route}`);
      allPassed = false;
    }
  }

  console.log('\n--- 2. Testing Static Assets & Immutable Caching ---');
  for (const asset of ASSETS) {
    const res = await fetchEndpoint(asset, { 'Accept-Encoding': 'br, gzip' });
    const isImmutable = res.headers['cache-control']?.includes('immutable');
    if (res.status === 200 && isImmutable) {
      console.log(`  ✓ [200 OK] ${asset.padEnd(70)} (Cache: ${res.headers['cache-control']})`);
    } else {
      console.error(`  ✗ [FAILED ${res.status}] ${asset}`);
      allPassed = false;
    }
  }

  console.log('\n--- 3. Testing 404 Fallback Handler ---');
  const notFound = await fetchEndpoint('/non-existent-page-test-12345/');
  if (notFound.status === 404 && notFound.headers['content-type']?.includes('text/html')) {
    console.log(`  ✓ [404 OK] Correctly rendered branded 404 page for /non-existent-page-test-12345/`);
  } else {
    console.error(`  ✗ [FAILED] Expected 404 status, received: ${notFound.status}`);
    allPassed = false;
  }

  console.log('\n--- 4. Testing Security Headers ---');
  const home = await fetchEndpoint('/');
  const hasNoSniff = home.headers['x-content-type-options'] === 'nosniff';
  const hasFrameOpt = home.headers['x-frame-options'] === 'SAMEORIGIN';
  if (hasNoSniff && hasFrameOpt) {
    console.log(`  ✓ [SECURITY] X-Content-Type-Options & X-Frame-Options present`);
  } else {
    console.warn(`  ✗ [SECURITY] Missing expected security headers`);
    allPassed = false;
  }

  if (allPassed) {
    console.log('\n🎉 ALL PRODUCTION AUDITS & TESTS PASSED PERFECTLY!\n');
  } else {
    console.error('\n❌ SOME TESTS FAILED. Please review the output above.\n');
    process.exit(1);
  }
}

runTests();
