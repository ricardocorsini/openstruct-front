import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { resolve, relative, dirname } from 'node:path';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { parseAst } from 'rolldown/parseAst';
function visitTree(node, fn) {
  if (!node || typeof node !== 'object') return;
  if (typeof node.type === 'string') fn(node);
  for (const [key, value] of Object.entries(node)) {
    if (key === 'parent') continue;
    if (Array.isArray(value)) for (const item of value) visitTree(item, fn);
    else if (value && typeof value === 'object') visitTree(value, fn);
  }
}
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { prerenderToNodeStream } from 'react-dom/static';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { apps, getCurrentApp, getPlannedApp } from '../src/lib/apps.ts';
import { verifySignedCatalog, loadPublicCatalog } from '../src/lib/catalog.ts';
import { CATALOG_IDS, PRODUCT_POLICIES } from '../src/lib/catalog-trust.ts';
import {
  SITE,
  decodeHtml,
  checkLocal,
  editorialDrift,
  issue,
  probeLinks,
} from './content-audit-core.mjs';

const root = resolve('.');
const external = process.argv.includes('--external');
const staticAttributes = [];
const refs = [];
const files = new Map();
const findings = [];
async function walk(dir) {
  for (const ent of await readdir(resolve(root, dir), { withFileTypes: true })) {
    const path = dir + '/' + ent.name;
    if (ent.isDirectory()) await walk(path);
    else if (/\.(tsx?|css|md|json|svg)$/.test(path)) {
      files.set(path, await readFile(resolve(root, path), 'utf8'));
    }
  }
}
await walk('src');
await walk('public');
await walk('docs');
files.set('README.md', await readFile('README.md', 'utf8'));
files.set('index.html', await readFile('index.html', 'utf8'));
const lineAt = (s, index) => s.slice(0, index).split('\n').length;
function location(url, pageFile) {
  for (const [file, source] of files) {
    const index = source.indexOf(url);
    if (index >= 0) return { file, line: lineAt(source, index) };
  }
  // Computed URL: point at the rendering source and label the provenance explicitly.
  const source = files.get(pageFile) || '';
  const index = source.search(/(?:href|to|src)=/);
  return { file: pageFile, line: index < 0 ? 1 : lineAt(source, index), computed: true };
}
function add(url, file, line, extra = {}) {
  refs.push({ url: decodeHtml(url), file, line, ...extra });
}
// Static public URLs/media in registries and manifests also cover conditional UI.
for (const [file, source] of files) {
  if (/\.[cm]?tsx?$/.test(file)) {
    const ast = parseAst(source, { lang: file.endsWith('tsx') ? 'tsx' : 'ts' }, file);
    visitTree(ast, (n) => {
      if (
        n.type === 'JSXAttribute' &&
        ['href', 'to', 'src', 'poster'].includes(n.name?.name) &&
        n.value?.type === 'Literal' &&
        n.value.value.startsWith('/')
      )
        staticAttributes.push({ url: n.value.value, file, line: lineAt(source, n.start) });
      if (
        n.type === 'Literal' &&
        typeof n.value === 'string' &&
        (/^https:\/\//.test(n.value) || /^\/(assets|fonts)\//.test(n.value)) &&
        !n.value.endsWith('/')
      )
        add(n.value, file, lineAt(source, n.start));
    });
  }
  if (/\.(json|svg|css|html)$/.test(file))
    for (const m of source.matchAll(
      /(?:url\(['"]?|(?:src|href)=["']|"url"\s*:\s*")([^"'\s)<>]+)/g,
    )) {
      if (m[1].startsWith('/') || m[1].startsWith('https://'))
        add(
          m[1],
          file,
          lineAt(source, m.index),
          file === 'index.html' && m[1].startsWith('/src/') ? { fileLink: m[1].slice(1) } : {},
        );
    }
  // Published manuals use the web router and the compiler's IDs. Audit their
  // rendered links and media below, where their actual routes are available.
  if (file.endsWith('.md') && !file.startsWith('src/content/manuals/')) {
    const clean = source
      .replace(/```[\s\S]*?```/g, (m) => m.replace(/[^\n]/g, ' '))
      .replace(/`[^`\n]+`/g, (m) => m.replace(/[^\n]/g, ' '));
    for (const match of clean.matchAll(/https?:\/\/[^\s<>\[\]`"')]+/g))
      add(match[0].replace(/[.,;]+$/, ''), file, lineAt(source, match.index));
    const definitions = new Map(
      [...clean.matchAll(/^\[([^\]]+)\]:\s*(\S+)/gm)].map((m) => [m[1].toLowerCase(), m[2]]),
    );
    const links = [...clean.matchAll(/!?\[[^\]]*\]\((<?[^\s)]+>?)(?:\s+"[^"]*")?\)/g)].map((m) => ({
      url: m[1].replace(/^<|>$/g, ''),
      index: m.index,
    }));
    for (const m of clean.matchAll(/\[([^\]]+)\]\[([^\]]*)\]/g)) {
      const url = definitions.get((m[2] || m[1]).toLowerCase());
      if (url) links.push({ url, index: m.index });
      else
        findings.push(
          issue(
            { file, line: lineAt(source, m.index), url: m[0] },
            'missing-reference',
            'Referência Markdown ausente',
            'Adicionar a definição ou corrigir o nome.',
          ),
        );
    }
    for (const { url, index } of links) {
      const isFile = !/^(?:https?:|mailto:|tel:|\/)/.test(url);
      const path = url.split('#')[0];
      add(
        url,
        file,
        lineAt(source, index),
        isFile
          ? {
              fileLink: relative(
                root,
                resolve(root, dirname(file), path || file.split('/').at(-1)),
              ),
            }
          : {},
      );
    }
  }
}
// Derive routes and component imports from the real router; unsupported new syntax fails loudly.
const server = await createServer({
  configFile: resolve('vite.config.ts'),
  server: { middlewareMode: true, hmr: false, ws: false, host: '127.0.0.1' },
  appType: 'custom',
});
const { site } = await server.ssrLoadModule('/src/lib/config.ts');
const main = await readFile('src/main.tsx', 'utf8');
const ast = parseAst(main, { lang: 'tsx' }, 'main.tsx');
const imports = new Map();
for (const n of ast.body)
  if (n.type === 'ImportDeclaration')
    for (const el of n.specifiers)
      if (el.type === 'ImportSpecifier')
        imports.set(el.local.name, {
          file: 'src/' + n.source.value.replace(/^\.\//, ''),
          name: el.imported.name,
        });
for (const m of main.matchAll(
  /const (\w+) = React.lazy\([\s\S]*?import\('([^']+)'\)[\s\S]*?module\.(\w+)/g,
))
  imports.set(m[1], { file: 'src/' + m[2].replace(/^\.\//, ''), name: m[3] });
const routes = [];
visitTree(ast, (n) => {
  if (n.type === 'JSXOpeningElement' && n.name.name === 'Route') {
    const attributes = n.attributes;
    const p = attributes.find((a) => a.name?.name === 'path');
    const idx = attributes.some((a) => a.name?.name === 'index');
    if (p || idx) {
      let path = '/';
      if (p) {
        if (p.value.type === 'Literal') path = p.value.value;
        else {
          const expr = main.slice(p.value.expression.start, p.value.expression.end);
          const match = expr.match(/^getCurrentApp\('([^']+)'\)\.route$/);
          const planned = expr.match(/^getPlannedApp\('([^']+)'\)\.page\.route$/);
          if (match) path = getCurrentApp(match[1]).route;
          else if (planned) path = getPlannedApp(planned[1]).page.route;
          else if (expr === 'site.developmentPath') path = site.developmentPath;
          else throw Error('Unsupported route ' + expr);
        }
      }
      if (path !== '*') {
        let component;
        const element = attributes.find((a) => a.name?.name === 'element');
        visitTree(element, (x) => {
          if (x.type === 'JSXOpeningElement' && imports.has(x.name.name)) component = x.name.name;
        });
        if (!component) throw Error('Missing route component ' + path);
        routes.push({ path: '/' + path.replace(/^\//, ''), ...imports.get(component) });
      }
    }
  }
});
for (const ref of staticAttributes) {
  const route = routes.find((r) => r.file + '.tsx' === ref.file);
  refs.push({ ...ref, ...(route ? { page: route.path } : {}) });
}
async function auditManualSearch({
  manualSystems,
  manualChapterPath,
  publicManualEditions,
  publicManualChapters,
}) {
  const { default: loaders } = await server.ssrLoadModule('virtual:manual-search');
  const indexSource = { file: 'vite.config.ts', line: 1, computed: true };
  const editions = new Map(
    manualSystems.flatMap((system) =>
      publicManualEditions(system).map((edition) => [
        `${system.id}/${edition.id}`,
        new Map(
          publicManualChapters(edition).map((chapter) => [
            manualChapterPath(system.id, edition.id, chapter.slug),
            `src/content/manuals/${chapter.source}`,
          ]),
        ),
      ]),
    ),
  );

  for (const key of editions.keys()) {
    if (!Object.hasOwn(loaders, key))
      findings.push(
        issue(
          { ...indexSource, url: key },
          'missing-search-edition',
          'Edição pública ausente no índice da documentação',
          'Gerar o índice da edição a partir dos capítulos públicos.',
        ),
      );
  }

  for (const [key, load] of Object.entries(loaders)) {
    const chapters = editions.get(key);
    if (!chapters)
      findings.push(
        issue(
          { ...indexSource, url: key },
          'unexpected-search-edition',
          'O índice contém uma edição inexistente ou em rascunho',
          'Indexar somente edições públicas.',
        ),
      );

    const targets = new Set();
    for (const { href, systemId, editionId } of await load()) {
      const pathname = href.split('#', 1)[0];
      const source = chapters?.get(pathname);
      const ref = source
        ? { file: source, line: 1, computed: true, url: href, page: pathname }
        : { ...indexSource, url: href };
      refs.push(ref);
      if (chapters && (!source || `${systemId}/${editionId}` !== key))
        findings.push(
          issue(
            ref,
            'wrong-search-edition',
            'Resultado de busca fora dos capítulos públicos da edição',
            'Gerar o destino e os metadados a partir do capítulo da edição indexada.',
          ),
        );
      if (targets.has(href))
        findings.push(
          issue(
            ref,
            'duplicate-search-target',
            'Destino repetido no índice da documentação',
            'Indexar cada seção uma única vez na edição.',
          ),
        );
      targets.add(href);
    }
  }
}

const pages = new Map();
try {
  const { Layout } = await server.ssrLoadModule('/src/components/Layout.tsx');
  const { ExperienceProvider } = await server.ssrLoadModule('/src/components/Experience.tsx');
  const { CatalogProvider } = await server.ssrLoadModule('/src/components/CatalogProvider.tsx');
  const manuals = await server.ssrLoadModule('/src/lib/manual-chapters.ts');
  for (const route of routes) {
    const module = await server.ssrLoadModule('/' + route.file + '.tsx');
    const Component = module[route.name];
    const documentation = route.path === '/docs/*';
    const paths = documentation ? manuals.publicManualPaths() : [route.path];

    for (const page of paths) {
      const element = React.createElement(
        MemoryRouter,
        { initialEntries: [page] },
        React.createElement(
          CatalogProvider,
          null,
          React.createElement(
            ExperienceProvider,
            null,
            React.createElement(
              Routes,
              null,
              React.createElement(
                Route,
                { element: React.createElement(Layout) },
                React.createElement(Route, {
                  path: route.path,
                  element: React.createElement(Component),
                }),
              ),
            ),
          ),
        ),
      );
      let html;
      if (documentation) {
        // Aguarde os capítulos lazy para auditar o conteúdo, em vez do fallback.
        const errors = [];
        const { prelude } = await prerenderToNodeStream(element, {
          onError(error) {
            errors.push(error);
          },
        });
        html = Buffer.concat(await Array.fromAsync(prelude)).toString('utf8');
        if (errors.length) throw new AggregateError(errors, `Falha ao renderizar ${page}`);
        if (/\sdata-docs-(?:not-found|load-error)(?:=|\s|>)/.test(html))
          throw Error(`A rota de documentação publicada ${page} não pôde ser renderizada.`);
      } else {
        html = renderToStaticMarkup(element);
      }

      const ids = new Set();
      for (const match of html.matchAll(/\sid="([^"]+)"/g)) {
        const id = decodeHtml(match[1]);
        if (documentation && ids.has(id))
          findings.push(
            issue(
              { file: route.file + '.tsx', line: 1, page, url: '#' + id, computed: true },
              'duplicate-anchor',
              'ID duplicado na rota de documentação',
              'Dar identificadores únicos às seções, equações e outros elementos da página.',
            ),
          );
        ids.add(id);
      }
      pages.set(page, { ids });
      for (const match of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
        const url = decodeHtml(match[1]);
        const loc = location(url, route.file + '.tsx');
        add(url, loc.file, loc.line, {
          page,
          ...(loc.computed ? { computed: true } : {}),
        });
      }
    }
  }
  await auditManualSearch(manuals);
} finally {
  await server.close();
}
for (const ref of refs) {
  const result = checkLocal(ref, { root, pages });
  if (result) findings.push(result);
}
const baseline = await verifySignedCatalog(
  JSON.parse(await readFile('src/data/catalog.signed.json', 'utf8')),
);
let catalog = baseline;
let feed = { source: 'bundled-signed-snapshot', publishedAt: baseline.publishedAt };
if (external) {
  try {
    const loaded = await loadPublicCatalog();
    catalog = loaded.catalog;
    feed = { source: 'live-verified-signature', publishedAt: catalog.publishedAt };
  } catch {
    findings.push(
      issue(
        { file: 'src/lib/catalog-trust.ts', line: 5, url: 'catalog.signed.json' },
        'feed-inconclusive',
        'Feed inacessível ou assinatura inválida; comparação apenas com snapshot local',
        'Repetir consulta; não atualizar conteúdo.',
        'inconclusive',
      ),
    );
  }
}
for (const row of editorialDrift(apps, catalog)) {
  row.line = location(row.url).line;
  findings.push(row);
}
// Signed package validation is authoritative; do not infer assets from URL naming.
for (const id of CATALOG_IDS) {
  const p = baseline.products[id];
  if (p.status === 'invalid')
    findings.push(
      issue(
        { file: 'src/data/catalog.signed.json', line: 1, url: id },
        'invalid-package',
        'Produto/pacote não passou no contrato assinado',
        'Revisar origem, assinatura e assets oficiais.',
      ),
    );
  if (p.status === 'ready')
    for (const release of p.history)
      for (const asset of release.assets) add(asset.url, 'src/data/catalog.signed.json', 1);
}
for (const app of apps.filter((a) => a.stage === 'current'))
  for (const asset of app.distribution?.platforms ?? []) {
    const expected =
      'https://github.com/' + PRODUCT_POLICIES[app.id].releaseRepo + '/releases/download/';
    if (!asset.url.startsWith(expected))
      findings.push(
        issue(
          { file: 'src/lib/apps.ts', line: location(asset.url).line, url: asset.url },
          'unauthorized-download',
          'Download editorial fora da origem oficial',
          'Usar o pacote validado do produto.',
        ),
      );
  }
let probes = [];
let requests = 0;
if (external) {
  let cache = {};
  try {
    const raw = await readFile('.cache/content-audit/links.json', 'utf8');
    if (raw.length < 2_000_000) cache = JSON.parse(raw);
  } catch {}
  const urls = refs
    .map((r) => r.url)
    .filter(
      (u) =>
        u.startsWith('https://') && new URL(u).origin !== SITE && !u.includes('/launcher-struct'),
    );
  const safeRequest = async (url, opts) => {
    const u = new URL(url);
    if (
      u.protocol !== 'https:' ||
      u.username ||
      u.password ||
      u.port ||
      isIP(u.hostname) ||
      !u.hostname.includes('.')
    )
      throw Error('Unsafe URL');
    let onAbort;
    const addresses = await Promise.race([
      lookup(u.hostname, { all: true }),
      new Promise((_, reject) => {
        onAbort = () => reject(Error('DNS timeout'));
        if (opts.signal.aborted) onAbort();
        else opts.signal.addEventListener('abort', onAbort, { once: true });
      }),
    ]).finally(() => opts.signal.removeEventListener('abort', onAbort));
    if (
      addresses.some((a) =>
        /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|::|f[cd]|fe80)/i.test(
          a.address,
        ),
      )
    )
      throw Error('Private host');
    return fetch(url, opts);
  };
  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : 120;
  if (!Number.isInteger(limit) || limit < 1 || limit > 120)
    throw Error('Limite deve estar entre 1 e 120.');
  const result = await probeLinks(urls, { cache, request: safeRequest, limit });
  probes = result.results;
  requests = result.requests;
  await mkdir('.cache/content-audit', { recursive: true });
  await writeFile('.cache/content-audit/links.json', JSON.stringify(result.cache));
  for (const row of probes.filter((r) => r.status !== 'ok'))
    for (const ref of refs.filter((r) => r.url === row.url))
      findings.push(
        issue(
          ref,
          'external-' + row.status,
          `HTTP ${row.http ?? '?'}: ${row.reason ?? row.status}${row.cached ? ' (cache)' : ''}`,
          row.status === 'broken'
            ? 'Confirmar que o recurso é público (GitHub pode mascarar acesso como 404), depois corrigir/remover o link.'
            : 'Aguardar limite ou repetir; não classificar como quebrado.',
          row.status === 'broken' ? 'review' : 'inconclusive',
        ),
      );
}
const unique = [
  ...new Map(
    findings.map((f) => [JSON.stringify([f.file, f.line, f.url, f.code, f.page]), f]),
  ).values(),
];
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  mode: external ? 'external' : 'local',
  coverage: {
    routes: [...pages.keys()],
    references: refs.length,
    externalRequests: requests,
    externalLimit: 120,
    scope:
      'Rotas reais renderizadas no estado inicial, strings públicas de registros, Markdown, mídia e destinos da busca dos manuais; dados remotos/diálogos após interação e âncoras externas não são cobertos.',
  },
  feed,
  findings: unique,
  external: probes,
};
await mkdir('out/content-audit', { recursive: true });
await writeFile('out/content-audit/report.json', JSON.stringify(report, null, 2) + '\n');
const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/[|\r\n]/g, ' ')
    .replace(/`/g, "'");
const md =
  `# Auditoria de conteúdo\n\n${report.generatedAt} · ${report.mode} · ${refs.length} referências · ${pages.size} rotas · ${requests} requisições externas\n\nFeed: ${feed.source}, publicado em ${feed.publishedAt}. Revisões são alertas humanos, sem alteração automática.\n\n| Estado | Arquivo:linha | URL | Diagnóstico | Ação |\n| --- | --- | --- | --- | --- |\n` +
  unique
    .map(
      (f) =>
        `| ${f.severity} | ${esc(f.file)}:${f.line}${f.computed ? ' (destino calculado)' : ''} | ${esc(f.url)} | ${esc(f.message)} | ${esc(f.action)} |`,
    )
    .join('\n') +
  '\n\n' +
  report.coverage.scope +
  '\n';
await writeFile('out/content-audit/report.md', md);
console.log(
  `${unique.filter((f) => f.severity === 'error').length} erros locais; ${unique.filter((f) => f.severity === 'review').length} revisões; ${unique.filter((f) => f.severity === 'inconclusive').length} inconclusivos. Relatório: out/content-audit/report.md`,
);
for (const f of unique.filter((f) => f.severity === 'error'))
  console.error(`${f.file}:${f.line} ${f.code} ${f.url}`);
if (unique.some((f) => f.severity === 'error')) process.exitCode = 1;
