import test from 'node:test';
import assert from 'node:assert/strict';
import { collectGithub } from '../scripts/github-collector.mjs';
import {
  emptyGithubSnapshot,
  validateGithubSnapshot,
  GITHUB_REPOSITORIES,
  SNAPSHOT_STALE_MS,
} from '../src/lib/github-snapshot.ts';
import { developmentSources, selectDevelopmentSources } from '../src/lib/development.ts';
import {
  loadedIssueLabels,
  readIssueFilters,
  writeIssueFilters,
  defaultIssueFilters,
  issueRepositoryParams,
  selectIssues,
} from '../src/lib/issues.ts';

const time = Date.parse('2026-11-07T19:00:00Z');
const at = new Date(time).toISOString();
function issue(repo, number, state = 'open', extra = {}) {
  return {
    number,
    title: 'Revisão da máscara ' + number,
    state,
    url: 'https://github.com/' + repo.repository + '/issues/' + number,
    updatedAt: at,
    labels: [],
    author: { login: 'public-user', url: 'https://github.com/public-user' },
    comments: 0,
    ...extra,
  };
}
function fixture() {
  const snapshot = emptyGithubSnapshot();
  snapshot.generatedAt = at;
  for (const repo of snapshot.repositories) {
    Object.assign(repo, {
      visibility: 'public',
      verifiedPublicAt: at,
      lastSuccessAt: at,
      status: 'ready',
      problem: null,
      summary: {
        name: repo.repository.split('/')[1],
        description: '',
        url: 'https://github.com/' + repo.repository,
        stars: 0,
        forks: 0,
        openIssuesAndPullRequests: 9999,
        defaultBranch: 'master',
      },
      release: { state: 'fresh', checkedAt: at, item: null },
    });
    for (const list of [...Object.values(repo.lists), ...Object.values(repo.issueDetails)])
      Object.assign(list, { state: 'fresh', checkedAt: at });
  }
  return snapshot;
}
const select = (
  snapshot,
  filters = defaultIssueFilters,
  sources = developmentSources,
  now = time,
  offline = false,
) => selectIssues(snapshot, sources, filters, now, offline);

test('issue filters round-trip accented labels and search in the URL, preserving repository and other selections', () => {
  const label = 'revisão & DXF';
  const filters = { state: 'all', label, q: '#42 ação + CAD', page: 3 };
  const base = new URLSearchParams({ repo: 'armadura-struct', pullState: 'open' });
  const params = writeIssueFilters(base, filters);
  assert.deepEqual(readIssueFilters(new URLSearchParams(params.toString()), [label]), filters);
  assert.equal(params.get('repo'), 'armadura-struct');
  assert.equal(params.get('pullState'), 'open');
  assert.deepEqual(
    [...writeIssueFilters(params, defaultIssueFilters).keys()],
    ['repo', 'pullState'],
  );
  const invalid = readIssueFilters(
    new URLSearchParams({
      issueState: 'merged',
      issueLabel: 'fictícia',
      issuePage: '-2',
      issueQ: 'x'.repeat(300),
    }),
    [label],
  );
  assert.equal(invalid.state, 'open');
  assert.equal(invalid.label, '');
  assert.equal(invalid.page, 1);
  assert.equal(invalid.q.length, 200);
});

test('labels come only from the selected public repositories and retain exact real names', () => {
  const snapshot = fixture();
  snapshot.repositories[0].issueDetails.open.items = [
    issue(snapshot.repositories[0], 1, 'open', { labels: ['revisão & DXF', 'help wanted'] }),
  ];
  snapshot.repositories[1].issueDetails.closed.items = [
    issue(snapshot.repositories[1], 2, 'closed', { labels: ['geometria'] }),
  ];
  assert.deepEqual(loadedIssueLabels(snapshot, selectDevelopmentSources('openstruct-front')), [
    'help wanted',
    'revisão & DXF',
  ]);
  assert.ok(!loadedIssueLabels(snapshot, developmentSources).includes('bug'));
  snapshot.repositories[1].visibility = 'unknown';
  assert.ok(!loadedIssueLabels(snapshot, developmentSources).includes('geometria'));
});

test('combines app, state, exact label and accent-insensitive local search; comments zero is real data', () => {
  const snapshot = fixture();
  const repo = snapshot.repositories[1];
  repo.issueDetails.open.items = [issue(repo, 1, 'open', { labels: ['geometria'] })];
  repo.issueDetails.closed.items = [
    issue(repo, 42, 'closed', { title: 'Correção de ação no CAD', labels: ['revisão & DXF'] }),
  ];
  const filters = { state: 'closed', label: 'revisão & DXF', q: 'acao', page: 1 };
  const view = select(snapshot, filters, selectDevelopmentSources('consolo-struct'));
  assert.equal(view.total, 1);
  assert.equal(view.rows[0].issue.number, 42);
  assert.equal(view.rows[0].issue.comments, 0);
  assert.equal(view.rows[0].issue.state, 'closed');
  assert.equal(select(snapshot, { ...filters, q: '#42' }).total, 1);
  assert.equal(select(snapshot, { ...filters, q: 'public-user' }).total, 1);
  assert.equal(select(snapshot, { ...filters, label: 'geometria' }).total, 0);
});

test('pagination counts the same filtered dataset once, clamps invalid pages and keeps stable ordering', () => {
  const snapshot = fixture();
  const repo = snapshot.repositories[0];
  repo.issueDetails.open.items = Array.from({ length: 27 }, (_, i) => issue(repo, i + 1));
  const pages = [1, 2, 3].map((page) => select(snapshot, { ...defaultIssueFilters, page }));
  assert.deepEqual(
    pages.map((page) => page.rows.length),
    [10, 10, 7],
  );
  assert.equal(pages[0].rows[0].issue.number, 27);
  assert.equal(pages[1].rows[0].issue.number, 17);
  assert.equal(pages[0].total, 27);
  assert.equal(new Set(pages.flatMap((page) => page.rows.map((row) => row.issue.url))).size, 27);
  assert.equal(select(snapshot, { ...defaultIssueFilters, page: 9999 }).page, 3);
  assert.equal(select(snapshot, { ...defaultIssueFilters, q: 'not in snapshot', page: 3 }).page, 1);
});

test('PR URLs and duplicate issues are excluded while matching numbers in different repositories remain distinct', () => {
  const snapshot = fixture();
  const [first, second] = snapshot.repositories;
  first.issueDetails.open.items = [
    issue(first, 1),
    issue(first, 1),
    issue(first, 3, 'open', { url: 'https://github.com/' + first.repository + '/pull/3' }),
  ];
  second.issueDetails.open.items = [issue(second, 1)];
  assert.equal(select(snapshot).total, 2);
  assert.equal(select(snapshot).loadedCount, 2);
  assert.equal(select(snapshot).rows.length, 2);
});

test('coverage distinguishes zero from unavailable, stale and bounded slices per state', () => {
  const snapshot = fixture();
  const repo = snapshot.repositories[0];
  repo.issueDetails.closed = { state: 'unavailable', checkedAt: null, items: [], truncated: false };
  repo.issueDetails.open.truncated = true;
  const all = select(snapshot, { ...defaultIssueFilters, state: 'all' });
  assert.equal(all.knownCollections, developmentSources.length * 2 - 1);
  assert.equal(all.total, 0);
  assert.equal(all.coverage[1].state, 'unavailable');
  assert.equal(all.coverage[0].truncated, true);
  assert.equal(select(null).knownCollections, 0);
  assert.ok(
    select(
      snapshot,
      defaultIssueFilters,
      developmentSources,
      time + SNAPSHOT_STALE_MS + 1,
    ).coverage.every((row) => row.state === 'stale'),
  );
  assert.ok(
    select(snapshot, defaultIssueFilters, developmentSources, time, true).coverage.every(
      (row) => row.state === 'stale',
    ),
  );
});

test('legacy open issues migrate without inventing labels, authors, comments or closed coverage', () => {
  for (const schemaVersion of [1, 2]) {
    const snapshot = fixture();
    const repo = snapshot.repositories[0];
    repo.lists.issues.items = [
      {
        id: '3',
        title: 'Legacy',
        url: 'https://github.com/' + repo.repository + '/issues/3',
        updatedAt: at,
        count: 999,
      },
    ];
    snapshot.schemaVersion = schemaVersion;
    for (const entry of snapshot.repositories) {
      delete entry.issueDetails;
      delete entry.discussions;
      delete entry.releaseHistory;
      delete entry.codeRelations;
      delete entry.recentCommits;
      if (schemaVersion === 1) delete entry.release;
    }
    const migrated = validateGithubSnapshot(snapshot);
    assert.equal(migrated.schemaVersion, 9);
    const item = migrated.repositories[0].issueDetails.open.items[0];
    assert.equal(item.state, 'open');
    assert.equal(item.number, 3);
    assert.equal(item.comments, null);
    assert.equal(item.author, null);
    assert.equal(item.labels, null);
    assert.equal(migrated.repositories[0].issueDetails.closed.state, 'unavailable');
    assert.equal(snapshot.schemaVersion, schemaVersion);
  }
});

test('v3 contract rejects mixed PR payloads, incoherent states, duplicate numbers and unsafe author data', () => {
  const snapshot = fixture();
  const repo = snapshot.repositories[0];
  repo.issueDetails.open.items = [issue(repo, 3)];
  assert.equal(validateGithubSnapshot(snapshot), snapshot);
  for (const patch of [
    { pull_request: {} },
    { state: 'closed' },
    { comments: -1 },
    { number: 4 },
    { author: { login: 'public-user', url: 'https://evil.example' } },
    { labels: ['mail@example.com'] },
  ]) {
    const bad = structuredClone(snapshot);
    Object.assign(bad.repositories[0].issueDetails.open.items[0], patch);
    assert.throws(() => validateGithubSnapshot(bad));
  }
  const duplicate = structuredClone(snapshot);
  duplicate.repositories[0].issueDetails.closed.items = [issue(repo, 3, 'closed')];
  assert.throws(() => validateGithubSnapshot(duplicate));
});

function json(body, status = 200, headers = {}) {
  return new Response(status === 304 ? null : JSON.stringify(body), { status, headers });
}
function rawIssue(repository, number, state) {
  return {
    number,
    state,
    title: 'Interface pública',
    html_url: 'https://github.com/' + repository + '/issues/' + number,
    updated_at: at,
    labels: [{ name: 'revisão & DXF' }, { name: 'help wanted' }],
    user: {
      login: 'public-user',
      html_url: 'https://github.com/public-user',
      email: 'secret@example.com',
    },
    comments: 0,
    body: 'private-not-exported',
  };
}
function api(overrides = () => null) {
  return async (url, options) => {
    const override = overrides(url, options);
    if (override) return override;
    const u = new URL(url);
    const [, repository, endpoint] = u.pathname.match(/^\/repos\/([^/]+\/[^/]+)(?:\/(.*))?$/);
    assert.ok(GITHUB_REPOSITORIES.includes(repository));
    if (!endpoint)
      return json({
        private: false,
        visibility: 'public',
        full_name: repository,
        html_url: 'https://github.com/' + repository,
        name: repository.split('/')[1],
        default_branch: 'master',
      });
    if (endpoint === 'releases/latest') return json({}, 404);
    if (endpoint === 'issues') {
      const state = u.searchParams.get('state');
      return json(
        [
          rawIssue(repository, state === 'open' ? 1 : 2, state),
          { ...rawIssue(repository, 3, state), pull_request: null },
        ],
        200,
        { etag: '"issues-' + state + '"' },
      );
    }
    return json([]);
  };
}

test('collector exports separate state slices and metadata, excludes every pull_request key, and preserves open summary', async () => {
  const result = await collectGithub({ now: () => time, fetchImpl: api() });
  assert.equal(result.requests, GITHUB_REPOSITORIES.length * 7 + 3);
  const repo = result.snapshot.repositories[0];
  assert.equal(repo.issueDetails.open.items.length, 1);
  assert.equal(repo.issueDetails.closed.items.length, 1);
  assert.equal(repo.issueDetails.open.items[0].comments, 0);
  assert.deepEqual(repo.issueDetails.open.items[0].labels, ['revisão & DXF', 'help wanted']);
  assert.equal(repo.issueDetails.open.items[0].author.login, 'public-user');
  assert.deepEqual(
    repo.lists.issues.items.map((item) => item.id),
    ['1'],
  );
  assert.equal(
    select(result.snapshot, { ...defaultIssueFilters, state: 'all' }).total,
    GITHUB_REPOSITORIES.length * 2,
  );
  assert.ok(!JSON.stringify(result.snapshot).includes('secret@example.com'));
  assert.ok(!JSON.stringify(result.cache).includes('private-not-exported'));
});

test('state-specific ETags and failure preserve the last closed list without making the open list stale', async () => {
  const first = await collectGithub({ now: () => time, fetchImpl: api() });
  const target = GITHUB_REPOSITORIES[0];
  const second = await collectGithub({
    now: () => time + 1000,
    previous: first.snapshot,
    cache: first.cache,
    fetchImpl: api((url, options) => {
      if (!url.includes('/issues?')) return null;
      const scope = new URL(url).searchParams.get('state');
      assert.equal(options.headers['If-None-Match'], '"issues-' + scope + '"');
      if (url.includes(target + '/issues?') && scope === 'closed') return json({}, 500);
      return json(null, 304);
    }),
  });
  assert.equal(second.snapshot.repositories[0].issueDetails.closed.state, 'stale');
  assert.deepEqual(
    second.snapshot.repositories[0].issueDetails.closed.items,
    first.snapshot.repositories[0].issueDetails.closed.items,
  );
  assert.equal(second.snapshot.repositories[0].issueDetails.open.state, 'fresh');
  assert.equal(second.snapshot.repositories[0].lists.issues.state, 'fresh');
  assert.equal(second.snapshot.repositories[1].status, 'ready');
});

test('each issue state follows its own bounded pagination; unsafe labels are unknown instead of renamed', async () => {
  const result = await collectGithub({
    now: () => time,
    fetchImpl: api((url) => {
      if (!url.includes('/issues?')) return null;
      const u = new URL(url);
      const repository = u.pathname.split('/').slice(2, 4).join('/');
      const state = u.searchParams.get('state');
      const page = Number(u.searchParams.get('page'));
      const next = new URL(url);
      next.searchParams.set('page', String(page + 1));
      return json([rawIssue(repository, (state === 'closed' ? 100 : 0) + page, state)], 200, {
        link: '<' + next.href + '>; rel="next"',
      });
    }),
  });
  assert.equal(result.requests, GITHUB_REPOSITORIES.length * 9 + 3);
  assert.equal(result.snapshot.repositories[0].issueDetails.open.truncated, true);
  assert.equal(result.snapshot.repositories[0].issueDetails.closed.truncated, true);
  assert.equal(result.snapshot.repositories[0].issueDetails.closed.items.length, 2);
  const unsafe = await collectGithub({
    now: () => time,
    fetchImpl: api((url) =>
      url.includes('/issues?')
        ? json([
            {
              ...rawIssue(
                GITHUB_REPOSITORIES.find((repo) => url.includes(repo)),
                1,
                new URL(url).searchParams.get('state'),
              ),
              number: new URL(url).searchParams.get('state') === 'open' ? 1 : 2,
              html_url:
                'https://github.com/' +
                GITHUB_REPOSITORIES.find((repo) => url.includes(repo)) +
                '/issues/' +
                (new URL(url).searchParams.get('state') === 'open' ? 1 : 2),
              labels: [{ name: 'email@example.com' }],
            },
          ])
        : null,
    ),
  });
  assert.equal(unsafe.snapshot.repositories[0].issueDetails.open.items[0].labels, null);
});

test('a close/reopen during collection is reconciled using the newest evidence, without counting twice', async () => {
  const result = await collectGithub({
    now: () => time,
    fetchImpl: api((url) => {
      if (!url.includes('/issues?')) return null;
      const repo = GITHUB_REPOSITORIES.find((repo) => url.includes(repo));
      const state = new URL(url).searchParams.get('state');
      return json([
        {
          ...rawIssue(repo, 8, state),
          updated_at: state === 'closed' ? '2026-11-07T18:59:00Z' : '2026-11-07T18:58:00Z',
        },
      ]);
    }),
  });
  const repo = result.snapshot.repositories[0];
  assert.equal(repo.issueDetails.open.items.length, 0);
  assert.equal(repo.issueDetails.closed.items.length, 1);
  assert.equal(repo.lists.issues.items.length, 0);
  assert.equal(
    select(result.snapshot, { ...defaultIssueFilters, state: 'all' }).total,
    GITHUB_REPOSITORIES.length,
  );
  assert.equal(validateGithubSnapshot(result.snapshot), result.snapshot);
});

test('long public titles and labels remain searchable and retain exact text without fictitious truncation', () => {
  const snapshot = fixture();
  const repo = snapshot.repositories[0];
  const label = 'Á'.repeat(100);
  const title = 'Cálculo e revisão '.repeat(11).slice(0, 200);
  repo.issueDetails.open.items = [issue(repo, 10, 'open', { labels: [label], title })];
  validateGithubSnapshot(snapshot);
  const view = select(snapshot, { ...defaultIssueFilters, label, q: 'calculo' });
  assert.equal(view.rows[0].issue.title, title);
  assert.equal(loadedIssueLabels(snapshot, developmentSources)[0], label);
});

test('repository changes share one URL selection and reset only issue label and page', () => {
  const base = new URLSearchParams({
    repo: 'armadura-struct',
    issueState: 'closed',
    issueQ: 'ação',
    issueLabel: 'revisão',
    issuePage: '3',
    pullState: 'open',
  });
  const next = issueRepositoryParams(base, 'consolo-struct');
  assert.equal(next.get('repo'), 'consolo-struct');
  assert.equal(next.get('issueState'), 'closed');
  assert.equal(next.get('issueQ'), 'ação');
  assert.equal(next.get('pullState'), 'open');
  assert.equal(next.has('issuePage'), false);
  assert.equal(next.has('issueLabel'), false);
  assert.equal(issueRepositoryParams(base, 'launcher-struct').has('repo'), false);
});
