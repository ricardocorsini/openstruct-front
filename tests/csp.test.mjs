import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('HTTP CSP covers routes and static files without allowing inline scripts, eval or foreign frames', async () => {
  const config = JSON.parse(await read('vercel.json'));
  const global = config.headers.find((rule) => rule.source === '/(.*)');
  assert.ok(global);
  const header = global.headers.find((item) => item.key === 'Content-Security-Policy');
  assert.ok(header);
  assert.equal(
    global.headers.some((item) => item.key === 'Content-Security-Policy-Report-Only'),
    false,
  );
  assert.doesNotMatch(header.value, /unsafe-inline|unsafe-eval|\*/);
  const directives = new Map(
    header.value.split(';').map((part) => {
      const [name, ...sources] = part.trim().split(/\s+/);
      return [name, sources];
    }),
  );
  for (const name of [
    'default-src',
    'script-src',
    'style-src',
    'font-src',
    'base-uri',
    'form-action',
    'frame-ancestors',
  ])
    assert.deepEqual(directives.get(name), ["'self'"], name);
  assert.deepEqual(directives.get('object-src'), ["'none'"]);
  assert.deepEqual(directives.get('connect-src'), [
    "'self'",
    'https://raw.githubusercontent.com',
    'https://api.openstruct.com.br',
  ]);
  assert.deepEqual(directives.get('img-src'), [
    "'self'",
    'data:',
    'https://github.com',
    'https://avatars.githubusercontent.com',
  ]);
  assert.ok(
    config.rewrites.some((rule) => rule.source === '/(.*)' && rule.destination === '/index.html'),
  );
  assert.equal(config.git.deploymentEnabled['github-data'], false);
  const netlify = await read('netlify.toml');
  assert.match(netlify, /\[\[headers\]\]\s+for = "\/\*"/);
  assert.equal(netlify.match(/\bContent-Security-Policy = "([^"]+)"/)?.[1], header.value);
});

test('theme bootstrap is a same-origin synchronous head script and HTML contains no inline scripts or CSP meta', async () => {
  const html = await read('index.html');
  const theme = html.match(/<script\b([^>]*)src="\/theme-init\.js"([^>]*)>\s*<\/script>/);
  assert.ok(theme);
  assert.doesNotMatch(theme[1] + theme[2], /\b(?:async|defer|type)\b/);
  assert.ok(html.indexOf(theme[0]) < html.indexOf('</head>'));
  for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    assert.match(script[1], /\bsrc=/);
    assert.equal(script[2].trim(), '');
  }
  assert.doesNotMatch(html, /http-equiv=["']Content-Security-Policy/i);
});

test('theme is initialized before React with saved light/dark, invalid/missing or inaccessible localStorage', async () => {
  const source = await read('public/theme-init.js');
  for (const saved of ['light', 'dark', null, 'invalid']) {
    const document = { documentElement: { dataset: {} } };
    runInNewContext(source, {
      document,
      localStorage: {
        getItem(key) {
          assert.equal(key, 'openstruct-theme-v1');
          return saved;
        },
      },
    });
    assert.equal(document.documentElement.dataset.theme, saved === 'dark' ? 'dark' : 'light');
  }
  for (const inaccessible of ['property', 'getItem']) {
    const document = { documentElement: { dataset: {} } };
    const context = { document };
    const fail = () => {
      throw new Error('Storage blocked');
    };
    if (inaccessible === 'property') Object.defineProperty(context, 'localStorage', { get: fail });
    else context.localStorage = { getItem: fail };
    assert.doesNotThrow(() => runInNewContext(source, context));
    assert.equal(document.documentElement.dataset.theme, 'light');
  }
});

test('source components cannot reintroduce inline styles that bypass the stylesheet policy', async () => {
  async function check(directory) {
    for (const entry of await readdir(new URL(directory, root), { withFileTypes: true })) {
      const path = directory + '/' + entry.name;
      if (entry.isDirectory()) await check(path);
      else if (/\.(?:tsx?|css)$/.test(path))
        assert.doesNotMatch(await read(path), /\bstyle\s*=|<style\b/, path);
    }
  }
  await check('src');
});
