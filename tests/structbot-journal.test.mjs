import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import {
  isReport,
  isReportSummary,
  PublicReadError,
  publicResourceFailure,
  readPublic,
} from '../src/lib/structbot.ts';
const { report } = JSON.parse(
  await fs.readFile(new URL('./fixtures/structbot-context.json', import.meta.url), 'utf8'),
);
const path = '/reports/latest?include_sources=false';
const loaded = { path, data: report, loading: false, error: null };

test('journal supports compact editions and a metadata-only history, including old servers during upgrade', () => {
  const compact = structuredClone(report);
  delete compact.source_versions;
  assert.equal(isReport(compact), true);
  assert.equal(
    isReportSummary({
      id: report.id,
      provider: report.provider,
      created_at: report.created_at,
      published_at: report.published_at,
    }),
    true,
  );
  assert.equal(isReportSummary(report), true);
  assert.equal(isReportSummary({ id: 'old', provider: 'openai' }), false);
});
test('transient refresh failures retain the accepted edition with a visible stale-connection notice', () => {
  for (const error of [
    new PublicReadError(503),
    new PublicReadError(429),
    new TypeError('offline'),
    new DOMException('timeout', 'AbortError'),
  ]) {
    const state = publicResourceFailure(loaded, path, error, true);
    assert.equal(state.data, report);
    assert.equal(state.loading, false);
    assert.match(state.error, /última consulta bem-sucedida/);
  }
  assert.equal(
    publicResourceFailure({ ...loaded, data: null }, path, new PublicReadError(503), true).data,
    null,
  );
  assert.equal(
    publicResourceFailure(loaded, '/reports/another-id', new PublicReadError(503), true).data,
    null,
  );
  assert.equal(publicResourceFailure(loaded, path, new PublicReadError(503), false).data, null);
});
test('withdrawal, forbidden access and invalid payloads never preserve a previous edition', async () => {
  for (const error of [
    new PublicReadError(401),
    new PublicReadError(403),
    new PublicReadError(404),
    new Error('invalid contract'),
    new SyntaxError('invalid JSON'),
  ]) {
    assert.equal(publicResourceFailure(loaded, path, error, true).data, null);
  }
  const result = await readPublic(
    path,
    isReport,
    new AbortController().signal,
    async () => new Response('', { status: 404 }),
  );
  assert.equal(result, null);
  await assert.rejects(
    readPublic(
      '/reports/old?include_sources=false',
      isReport,
      new AbortController().signal,
      async () => new Response('', { status: 404 }),
    ),
    (error) => error instanceof PublicReadError && error.status === 404,
  );
});
test('news remains readable during a failed refresh and the notice is rendered beside it', async () => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: 'custom',
  });
  try {
    const { NewsPanel } = await server.ssrLoadModule('/src/components/structbot/NewsPanel.tsx');
    const state = publicResourceFailure(loaded, path, new PublicReadError(503), true);
    const html = renderToStaticMarkup(createElement(NewsPanel, { report: state }));
    assert.match(html, /Uma contribuição avança/);
    assert.match(html, /última consulta bem-sucedida/);
    assert.doesNotMatch(html, /Consultando o StructBot/);
    const withdrawn = renderToStaticMarkup(
      createElement(NewsPanel, { report: { data: null, loading: false, error: null } }),
    );
    assert.doesNotMatch(withdrawn, /Uma contribuição avança/);
  } finally {
    await server.close();
  }
});
