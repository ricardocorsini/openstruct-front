import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('global security headers coexist with CSP and are identical on Vercel and Netlify', async () => {
  const vercel = JSON.parse(await read('vercel.json'));
  assert.equal(vercel.headers.length, 1);
  assert.equal(vercel.headers[0].source, '/(.*)');
  const headers = new Map(vercel.headers[0].headers.map(({ key, value }) => [key, value]));
  assert.equal(headers.size, 5);
  assert.equal(vercel.headers[0].headers.length, headers.size);
  assert.equal(headers.get('X-Frame-Options'), 'SAMEORIGIN');
  assert.equal(headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin');
  assert.equal(
    headers.get('Permissions-Policy'),
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  );
  assert.match(headers.get('Content-Security-Policy'), /frame-ancestors 'self'/);
  const netlify = await read('netlify.toml');
  assert.equal([...netlify.matchAll(/\[\[headers\]\]/g)].length, 1);
  assert.match(netlify, /\[\[headers\]\]\s+for = "\/\*"/);
  const netlifyHeaders = new Map(
    [...netlify.matchAll(/^\s+([\w-]+) = "([^"]*)"$/gm)]
      .filter(([, key]) => headers.has(key))
      .map(([, key, value]) => [key, value]),
  );
  assert.deepEqual(netlifyHeaders, headers);
  assert.equal(vercel.git.deploymentEnabled['github-data'], false);
  assert.deepEqual(vercel.rewrites, [
    {
      source: '/structbot-api/:path*',
      destination: 'https://api.openstruct.com.br/api/v1/public/:path*',
    },
    { source: '/(.*)', destination: '/index.html' },
  ]);
  assert.ok(netlify.indexOf('from = "/structbot-api/*"') < netlify.indexOf('from = "/*"'));
  assert.match(netlify, /to = "https:\/\/api\.openstruct\.com\.br\/api\/v1\/public\/:splat"/);
  assert.match(netlify, /\[\[redirects\]\]\s+from = "\/\*"\s+to = "\/index\.html"\s+status = 200/);
});
