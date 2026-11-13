import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readPublic,
  isOverview,
  isReport,
  isPage,
  isCountedPage,
  isItem,
  isEvent,
  isWorkstream,
  isEvidence,
  isRelease,
  isRecommendation,
  queryPath,
  publicUrl,
  safeSourceUrl,
  itemSource,
  countOf,
  mergeEvents,
  botDate,
} from '../src/lib/structbot.ts';
import { subscribeToEvents } from '../src/lib/structbot-feed.ts';
const event = (id) => ({
  id,
  repository: 'ricardocorsini/armadura-struct',
  kind: 'pull_request.updated',
  title: 'Revisão',
  url: 'https://github.com/ricardocorsini/armadura-struct/pull/1',
  occurred_at: '2026-11-13T20:00:00Z',
});
const overview = {
  generated_at: '2026-11-13T20:00:00Z',
  repositories: [],
  counts: [
    { kind: 'issue', state: 'open', count: 37 },
    { kind: 'pull_request', state: 'merged', count: 98 },
  ],
  workstreams: 0,
};
const report = {
  id: 'report-1',
  provider: 'rules',
  model: null,
  stale: true,
  source_versions_changed: true,
  sources_stale: false,
  created_at: '2026-11-13T20:00:00Z',
  published_at: null,
  content: {
    title: 'Resumo',
    summary: 'Resumo público',
    community_bulletin: 'Boletim',
    advances: [],
    blockers: [],
    next_actions: [],
    limitations: ['Metadados'],
  },
};

test('public reads omit credentials and use only the public proxy; 404 latest is empty, other failures are not', async () => {
  const signal = new AbortController().signal;
  let request;
  const value = await readPublic('/overview', isOverview, signal, async (url, options) => {
    request = { url, options };
    return Response.json(overview);
  });
  assert.deepEqual(value, overview);
  assert.equal(request.url, '/structbot-api/overview');
  assert.equal(request.options.credentials, 'omit');
  assert.equal(request.options.headers.Authorization, undefined);
  assert.equal(request.options.signal, signal);
  assert.equal(
    await readPublic(
      '/reports/latest',
      isReport,
      signal,
      async () => new Response('', { status: 404 }),
    ),
    null,
  );
  await assert.rejects(
    readPublic(
      '/reports/report-1',
      isReport,
      signal,
      async () => new Response('', { status: 404 }),
    ),
    /404/,
  );
  await assert.rejects(
    readPublic('/overview', isOverview, signal, async () => new Response('', { status: 503 })),
    /503/,
  );
  await assert.rejects(
    readPublic('/overview', isOverview, signal, async () => Response.json({ counts: [] })),
    /incompatível/,
  );
  await assert.rejects(
    readPublic('/overview', isOverview, signal, async () => new Response('<html>Error</html>')),
    SyntaxError,
  );
});
test('queries encode filters and pagination without changing public origin', () => {
  const path = queryPath('/items', {
    repository: 'owner/repo',
    q: 'a&state=closed',
    kind: 'issue',
    state: 'open',
    offset: 15,
    limit: 15,
    label: '',
  });
  const query = new URL(publicUrl(path), 'https://openstruct.com.br').searchParams;
  assert.equal(query.get('q'), 'a&state=closed');
  assert.equal(query.get('state'), 'open');
  assert.equal(query.get('offset'), '15');
  assert.equal(query.has('label'), false);
  for (const path of [
    'https://evil.example/items',
    '//evil.example',
    '/../admin/sync',
    '/reports/../../admin',
  ])
    assert.throws(() => publicUrl(path));
});
test('unsafe source schemes and credentials cannot become links; references resolve without HTML', () => {
  for (const value of [
    'javascript:alert(1)',
    'data:text/html,<script>',
    'http://example.com',
    'https://user:secret@example.com',
    '//evil.example',
    '',
  ])
    assert.equal(safeSourceUrl(value), undefined);
  assert.equal(safeSourceUrl('https://github.com/owner/repo'), 'https://github.com/owner/repo');
  assert.equal(itemSource('owner/repo#23'), 'https://github.com/owner/repo/issues/23');
  assert.equal(itemSource('owner/repo#1" onclick="alert(1)'), undefined);
});
test('missing overview is unknown, successful empty counts are zero; state counts stay distinct', () => {
  assert.equal(countOf(null, 'issue', 'open'), null);
  assert.equal(countOf(overview, 'issue', 'open'), 37);
  assert.equal(countOf(overview, 'pull_request', 'merged'), 98);
  assert.equal(countOf(overview, 'pull_request', 'closed'), 0);
  assert.match(botDate('2026-11-13T20:00:00Z'), /17:00/);
  assert.equal(botDate('bad'), 'Ainda não informado');
});
test('contract rejects broken nested values and tolerates additive fields and untrusted plain text', () => {
  assert.equal(isReport({ ...report, extra: 123 }), true);
  assert.equal(
    isReport({ ...report, content: { ...report.content, summary: { html: 'oops' } } }),
    false,
  );
  assert.equal(
    isReport({
      ...report,
      content: { ...report.content, community_bulletin: '<img src=x onerror=alert(1)>' },
    }),
    true,
  );
  assert.equal(
    isOverview({ ...overview, counts: [{ kind: 'issue', state: 'open', count: -1 }] }),
    false,
  );
  assert.equal(isPage(isItem)({ items: [] }), true);
  assert.equal(isCountedPage(isItem)({ items: [] }), false);
  const item = {
    key: 'a/b#1',
    repository: 'a/b',
    number: 1,
    title: 'Title',
    url: 'https://github.com/a/b/issues/1',
    kind: 'issue',
    state: 'open',
    labels: [],
    assignees: [],
    author: 'a',
    updated_at: '2026-11-13T20:00:00Z',
    head_sha: null,
    details: {},
  };
  assert.equal(isItem(item), true);
  assert.equal(isItem({ ...item, assignees: [{}] }), false);
  const work = {
    id: '1',
    repository: 'a/b',
    title: 'Task',
    status: 'claimed',
    note: '',
    updated_at: 'date',
    owner: 'user',
    source_url: null,
    item_numbers: [1],
    depends_on: [],
  };
  assert.equal(isWorkstream(work), true);
  assert.equal(isWorkstream({ ...work, depends_on: {} }), false);
  assert.equal(
    isEvidence({
      id: '1',
      repository: 'a/b',
      item_number: null,
      kind: 'note',
      author: 'user',
      summary: 'text',
      source_url: 'https://github.com/a/b',
      observed_at: 'date',
      stale: false,
    }),
    true,
  );
  assert.equal(
    isRelease({
      id: '1',
      repository: 'a/b',
      tag: 'v1',
      title: 'v1',
      url: 'https://github.com/a/b',
      prerelease: false,
      published_at: null,
    }),
    true,
  );
  assert.equal(
    isRecommendation({
      id: '1',
      report_id: '1',
      title: 'Task',
      description: 'Text',
      priority: 'high',
      status: 'proposed',
      item_keys: [],
      updated_at: 'date',
    }),
    true,
  );
});
test('event replay is deduplicated, ordered and bounded without mutating input', () => {
  const previous = [event(1), event(3)];
  assert.deepEqual(
    mergeEvents(previous, [event(3), event(2), event(4)], 3).map((e) => e.id),
    [4, 3, 2],
  );
  assert.deepEqual(
    previous.map((e) => e.id),
    [1, 3],
  );
  assert.equal(isEvent({ ...event(1), id: -1 }), false);
});
test('SSE resumes from the known cursor, ignores malformed messages and cleans up', () => {
  let source,
    handler,
    events = [],
    cursor = 5,
    changes = 0,
    closed = false;
  const states = [];
  const stop = subscribeToEvents({
    cursor,
    onCursor: (v) => (cursor = v),
    onEvents: (fn) => (events = fn(events)),
    onState: (v) => states.push(v),
    onChange: () => changes++,
    createSource: (url) => {
      assert.match(url, /after_id=5$/);
      source = {
        onopen: null,
        onerror: null,
        close() {
          closed = true;
        },
        addEventListener(name, fn) {
          assert.equal(name, 'development');
          handler = fn;
        },
      };
      return source;
    },
  });
  source.onopen();
  handler({ data: JSON.stringify(event(6)) });
  handler({ data: 'invalid' });
  handler({ data: JSON.stringify(event(6)) });
  assert.equal(cursor, 6);
  assert.equal(changes, 1);
  assert.equal(events.length, 1);
  assert.deepEqual(states, ['connecting', 'live']);
  stop();
  assert.equal(closed, true);
  handler({ data: JSON.stringify(event(7)) });
  assert.equal(cursor, 6);
});
test('fallback drains ascending history instead of mistaking the first page for latest', async () => {
  let events = [],
    cursor = 0;
  const states = [];
  const paths = [];
  let done;
  const ready = new Promise((resolve) => (done = resolve));
  const stop = subscribeToEvents({
    cursor,
    onCursor: (v) => (cursor = v),
    onEvents: (fn) => (events = fn(events)),
    onState: (v) => {
      states.push(v);
      if (paths.length === 2) done();
    },
    onChange: () => {},
    createSource: () => {
      throw Error('SSE unavailable');
    },
    fetcher: async (url) => {
      paths.push(url);
      const after = Number(new URL(url, 'https://openstruct.com.br').searchParams.get('after_id'));
      return Response.json({
        items: after === 0 ? Array.from({ length: 100 }, (_, i) => event(i + 1)) : [event(101)],
        next_cursor: after === 0 ? 100 : 101,
      });
    },
  });
  try {
    await ready;
    assert.equal(cursor, 101);
    assert.equal(events[0].id, 101);
    assert.equal(events.length, 60);
    assert.match(paths[1], /after_id=100/);
    assert.ok(states.includes('polling'));
  } finally {
    stop();
  }
});
test('failed feed reports unavailable and aborts in-flight fallback on disposal', async () => {
  let requestSignal;
  let notify;
  const failed = new Promise((resolve) => (notify = resolve));
  const states = [];
  const stop = subscribeToEvents({
    cursor: 0,
    onCursor: () => {},
    onEvents: () => {},
    onState: (v) => {
      states.push(v);
      if (v === 'unavailable') notify();
    },
    onChange: () => {},
    createSource: () => {
      throw Error();
    },
    fetcher: async (_url, options) => {
      requestSignal = options.signal;
      return new Response('', { status: 503 });
    },
  });
  await failed;
  stop();
  assert.equal(requestSignal.aborted, true);
  assert.deepEqual(states, ['connecting', 'unavailable']);
});
