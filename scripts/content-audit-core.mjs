import { existsSync, readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { compareVersions } from '../src/lib/catalog.ts';

export const SITE = 'https://www.openstruct.com.br';
export const decodeHtml = (s) =>
  s.replace(
    /&(?:amp|quot|apos|lt|gt|#x[\da-f]+|#\d+);/gi,
    (m) =>
      ({ '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>' })[m] ??
      String.fromCodePoint(parseInt(m.slice(m[2] === 'x' ? 3 : 2, -1), m[2] === 'x' ? 16 : 10)),
  );
export const slug = (s) =>
  s
    .replace(/<[^>]*>/g, '')
    .replace(/[`*_]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_\-\s]/gu, '')
    .trim()
    .replace(/\s/g, '-');
export function markdownIds(text) {
  const seen = new Map();
  return new Set(
    [...text.replace(/```[\s\S]*?```/g, '').matchAll(/^#{1,6}\s+(.+)$/gm)].map((m) => {
      const id = slug(m[1]);
      const n = seen.get(id) || 0;
      seen.set(id, n + 1);
      return id + (n ? '-' + n : '');
    }),
  );
}
export function issue(ref, code, message, action, severity = 'error') {
  return { ...ref, code, severity, message, action };
}
export function checkLocal(ref, { root, pages }) {
  let url;
  try {
    url = new URL(ref.url, ref.page ? SITE + ref.page : SITE + '/');
  } catch {
    return issue(ref, 'invalid-url', 'URL inválida', 'Corrigir a sintaxe.');
  }
  if (!['http:', 'https:'].includes(url.protocol))
    return ['mailto:', 'tel:'].includes(url.protocol)
      ? null
      : issue(ref, 'unsafe-protocol', 'Protocolo não permitido', 'Usar HTTPS ou destino local.');
  if (![SITE, 'https://openstruct.com.br'].includes(url.origin)) return null;
  let pathname, hash;
  try {
    pathname = decodeURIComponent(url.pathname);
    hash = decodeURIComponent(url.hash.slice(1));
  } catch {
    return issue(ref, 'invalid-encoding', 'Escape inválido', 'Corrigir URL/âncora.');
  }
  if (ref.fileLink) {
    const path = resolve(root, ref.fileLink);
    if (!path.startsWith(root + sep) || !existsSync(path))
      return issue(
        ref,
        'missing-file',
        'Arquivo referenciado não existe',
        'Corrigir caminho relativo ao documento.',
      );
    if (hash && /\.md$/i.test(path) && !markdownIds(readFileSync(path, 'utf8')).has(hash))
      return issue(
        ref,
        'missing-anchor',
        'Título/âncora Markdown não existe',
        'Usar o fragmento do título atual.',
      );
    return null;
  }
  const page = pages.get(pathname.replace(/\/$/, '') || '/');
  if (page)
    return hash && !page.ids.has(hash)
      ? issue(
          ref,
          'missing-anchor',
          'Âncora não existe na rota',
          'Corrigir o fragmento ou adicionar o ID na página.',
        )
      : null;
  const path = resolve(root, 'public', '.' + pathname);
  if (path.startsWith(resolve(root, 'public') + sep) && existsSync(path)) return null;
  return issue(
    ref,
    'missing-route-or-media',
    'Rota ou mídia não existe',
    'Corrigir o destino ou adicionar o arquivo/rota.',
  );
}
export function editorialDrift(apps, catalog) {
  return apps
    .filter((a) => a.stage === 'current')
    .flatMap((a) => {
      const product = catalog.products[a.id];
      const ref = { file: 'src/lib/apps.ts', line: 1, url: a.documentation.url };
      if (product?.status !== 'ready')
        return [
          issue(
            ref,
            'feed-product-unavailable',
            a.name + ': feed sem versão estável válida',
            'Conferir o catálogo; não inferir versão.',
            'review',
          ),
        ];
      const documented = a.distribution?.version ?? a.code.version,
        distributed = product.release.version;
      if (compareVersions(distributed, documented) === 0) return [];
      return [
        issue(
          ref,
          compareVersions(distributed, documented) > 0 ? 'editorial-behind' : 'editorial-ahead',
          `${a.name}: documentação ${documented}; feed estável ${distributed}`,
          'Revisar a tag distribuída, fontes e capturas manualmente; não copiar master.',
          'review',
        ),
      ];
    });
}
export function classify(status) {
  if (status >= 200 && status < 300) return 'ok';
  if (status === 404 || status === 410) return 'broken';
  if (status === 401 || status === 403) return 'authentication-or-limit';
  if (status === 429) return 'rate-limited';
  return 'inconclusive';
}
export function retryAt(headers, now) {
  const raw = headers.get('retry-after');
  const reset = Number(headers.get('x-ratelimit-reset')) * 1000;
  const retry = raw ? (/^\d+$/.test(raw) ? now + Number(raw) * 1000 : Date.parse(raw)) : 0;
  return Math.max(
    now + 60_000,
    Number.isFinite(retry) ? retry : 0,
    Number.isFinite(reset) ? reset : 0,
  );
}
/** Serial, bounded, no token, no body retention. Cached observations retain checkedAt. */
export async function probeLinks(
  urls,
  { request = fetch, cache = {}, now = Date.now(), limit = 120, timeoutMs = 8000 } = {},
) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 120) throw Error('Invalid request budget');
  cache = Object.fromEntries(
    Object.entries(cache && typeof cache === 'object' ? cache : {}).filter(([url, row]) => {
      try {
        return (
          new URL(url).protocol === 'https:' &&
          row &&
          ['ok', 'broken', 'authentication-or-limit', 'rate-limited', 'inconclusive'].includes(
            row.status,
          ) &&
          Number.isFinite(row.nextAt) &&
          Number.isFinite(Date.parse(row.checkedAt)) &&
          Date.parse(row.checkedAt) <= now + 60000 &&
          (!row.etag || (typeof row.etag === 'string' && row.etag.length < 500))
        );
      } catch {
        return false;
      }
    }),
  );
  const results = [];
  const hosts = new Map();
  let requests = 0;
  for (const [url, row] of Object.entries(cache))
    if (row?.nextAt > now && ([403, 429].includes(row.http) || row.cooldownUntil > now))
      hosts.set(new URL(url).host, row.nextAt);
  for (const url of [...new Set(urls)].sort(
    (a, b) =>
      (Date.parse(cache[a]?.checkedAt) || 0) - (Date.parse(cache[b]?.checkedAt) || 0) ||
      a.localeCompare(b),
  )) {
    const old = cache[url];
    const host = new URL(url).host;
    if (old && old.nextAt > now) {
      results.push({ ...old, url, cached: true });
      continue;
    }
    if (requests >= limit || hosts.get(host) > now) {
      results.push({
        url,
        status: 'inconclusive',
        reason: requests >= limit ? 'run-budget' : 'host-cooldown',
        checkedAt: null,
      });
      continue;
    }
    let row;
    try {
      const headers = {};
      if (old?.etag) headers['If-None-Match'] = old.etag;
      requests++;
      let response = await request(url, {
        method: 'HEAD',
        headers,
        signal: AbortSignal.timeout(timeoutMs),
        redirect: 'manual',
        credentials: 'omit',
      });
      if ([405, 501].includes(response.status) && requests < limit) {
        await response.body?.cancel();
        requests++;
        response = await request(url, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(timeoutMs),
          redirect: 'manual',
          credentials: 'omit',
        });
      }
      const status =
        response.status === 304 && old?.status === 'ok' ? 'ok' : classify(response.status);
      row = {
        url,
        status,
        http: response.status,
        checkedAt: new Date(now).toISOString(),
        nextAt:
          now + (status === 'ok' ? 86400_000 : status === 'broken' ? 7 * 86400_000 : 3600_000),
      };
      if (response.status >= 300 && response.status < 400 && response.status !== 304) {
        row.reason = 'redirect-review';
        row.location = response.headers.get('location')?.slice(0, 2000);
      }
      if (response.status === 304 && status !== 'ok') row.reason = '304-without-valid-observation';
      const etag = response.headers.get('etag');
      if (etag && etag.length < 500) row.etag = etag;
      else if (response.status === 304 && old?.etag) row.etag = old.etag;
      if (
        [403, 429].includes(response.status) ||
        response.headers.get('retry-after') ||
        response.headers.get('x-ratelimit-remaining') === '0'
      ) {
        row.nextAt = retryAt(response.headers, now);
        row.cooldownUntil = row.nextAt;
        hosts.set(host, row.nextAt);
      }
      await response.body?.cancel();
    } catch {
      hosts.set(host, now + 60_000);
      row = {
        url,
        status: 'inconclusive',
        reason: 'network-or-timeout',
        checkedAt: new Date(now).toISOString(),
        nextAt: now + 3600_000,
      };
    }
    cache[url] = row;
    results.push(row);
  }
  return {
    results,
    cache: Object.fromEntries([...new Set(urls)].filter((u) => cache[u]).map((u) => [u, cache[u]])),
    requests,
  };
}
