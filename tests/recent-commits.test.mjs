import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRecentCommits, collectRecentCommits } from '../scripts/github-commits.mjs';
import { emptyRecentCommits, validateRecentCommits } from '../src/lib/commit-contract.ts';
import {
  emptyGithubSnapshot,
  GITHUB_REPOSITORIES,
  validateGithubSnapshot,
} from '../src/lib/github-snapshot.ts';
import { collectGithub } from '../scripts/github-collector.mjs';
import { commitSectionLink, recentCommitsView } from '../src/lib/recent-commits.ts';
import { developmentSources, selectDevelopmentSources } from '../src/lib/development.ts';
const repo = 'ricardocorsini/armadura-struct';
const A = 'a'.repeat(40),
  B = 'b'.repeat(40),
  C = 'c'.repeat(40);
const at = '2026-11-08T23:00:00.000Z';
const user = (login) => ({
  login,
  type: 'User',
  html_url: 'https://github.com/' + login,
  email: 'private@example.com',
  avatar_url: 'https://example.com/private.png',
});
function commit(sha = A, extra = {}) {
  return {
    sha,
    html_url: `https://github.com/${repo}/commit/${sha}`,
    author: user('autor'),
    committer: user('registrador'),
    commit: {
      message: 'Merge branch teste\n\nCorpo com segredo não exportado',
      author: { name: 'Nome privado', email: 'email@example.com', date: '2026-11-08T12:00:00Z' },
      committer: { email: 'outro@example.com', date: '2026-11-08T15:00:00Z' },
    },
    files: [{ patch: 'not published' }],
    ...extra,
  };
}
function fixture(opts = {}) {
  const branch = opts.branch ?? 'work/mais+novo';
  const urls = [];
  const cache = opts.cache ?? {};
  const request = async (url, old) => {
    urls.push(url);
    if (opts.fail) throw Object.assign(Error('failed'), { code: opts.fail });
    if (opts.use304 && old) return { items: old.items, etag: old.etag, next: old.next };
    if (url.includes('/git/ref/heads/'))
      return {
        body: { ref: 'refs/heads/' + branch, object: { type: 'commit', sha: opts.head ?? A } },
        etag: 'ref',
      };
    return {
      body: opts.body ?? [commit(opts.head ?? A), commit(B)],
      etag: 'list',
      next: opts.next ?? 'sample-limit',
    };
  };
  return {
    args: { repository: repo, branch, request, cache, previous: opts.previous, at },
    urls,
    cache,
  };
}
test('normalization preserves API order and exact SHA, deduplicates merges, separates accounts/dates and drops raw personal fields', () => {
  const body = [commit(B), commit(A), commit(B)];
  const result = normalizeRecentCommits(body, repo);
  assert.deepEqual(
    result.map((r) => r.sha),
    [B, A],
  );
  assert.equal(result[0].author.login, 'autor');
  assert.equal(result[0].committer.login, 'registrador');
  assert.notEqual(result[0].authoredAt, result[0].committedAt);
  const raw = JSON.stringify(result);
  for (const secret of [
    'private@example',
    'Nome privado',
    'Corpo com segredo',
    'avatar',
    'files',
    'patch',
  ])
    assert.ok(!raw.includes(secret));
  const bot = normalizeRecentCommits(
    [
      commit(A, {
        author: {
          login: 'github-actions[bot]',
          type: 'Bot',
          html_url: 'https://github.com/apps/github-actions',
        },
        committer: null,
      }),
    ],
    repo,
  )[0];
  assert.equal(bot.author.type, 'Bot');
  assert.equal(bot.author.url, 'https://github.com/apps/github-actions');
  assert.equal(bot.committer, null);
  const unknown = normalizeRecentCommits(
    [
      commit(A, {
        author: null,
        committer: { ...user('registrador'), html_url: 'javascript:alert(1)' },
        commit: { message: '', author: { date: null }, committer: { date: 'bad' } },
      }),
    ],
    repo,
  )[0];
  assert.equal(unknown.author, null);
  assert.equal(unknown.committer, null);
  assert.equal(unknown.subject, '');
  assert.equal(unknown.committedAt, null);
  assert.throws(() =>
    normalizeRecentCommits([commit(A, { html_url: 'https://evil.example/commit/' + A })], repo),
  );
  assert.throws(() =>
    normalizeRecentCommits(
      Array.from({ length: 31 }, () => commit()),
      repo,
    ),
  );
});
test('subjects are bounded inert text with emails, controls and bidi removed, while HTML is retained only as escaped display text', () => {
  const result = normalizeRecentCommits(
    [
      commit(A, {
        commit: {
          message:
            '<script>alert(1)</script> javascript:bad test@example.com\u202e' + 'x'.repeat(300),
          author: {},
          committer: {},
        },
      }),
    ],
    repo,
  )[0];
  assert.equal(result.subject.length, 240);
  assert.equal(result.subjectTruncated, true);
  assert.ok(!result.subject.includes('@') && !result.subject.includes('\u202e'));
  assert.match(result.subject, /<script>/);
  const list = {
    ...emptyRecentCommits(),
    state: 'fresh',
    branch: 'work/a',
    headSha: A,
    checkedAt: at,
    items: [result],
  };
  validateRecentCommits(list, repo, true);
  assert.throws(() =>
    validateRecentCommits(
      { ...list, items: [{ ...result, subject: 'bad@example.com' }] },
      repo,
      true,
    ),
  );
  assert.throws(() => validateRecentCommits(list, repo, false));
  assert.throws(() => validateRecentCommits({ ...list, items: [result, result] }, repo, true));
});
test('collection pins the actual branch HEAD, retains bounded ordered metadata and revalidates 304 normalized cache', async () => {
  const f = fixture();
  const first = await collectRecentCommits(f.args);
  assert.equal(first.state, 'fresh');
  assert.equal(first.headSha, A);
  assert.equal(first.truncated, true);
  assert.ok(f.urls[0].endsWith(encodeURIComponent('work/mais+novo')));
  assert.ok(f.urls[1].includes('sha=' + A + '&per_page=30'));
  assert.ok(!f.urls.some((u) => u.includes('compare')));
  const again = fixture({ use304: true, cache: f.cache });
  const second = await collectRecentCommits({ ...again.args, at: '2026-11-08T23:01:00.000Z' });
  assert.deepEqual(second.items, first.items);
  assert.notEqual(second.checkedAt, first.checkedAt);
  const corrupt = structuredClone(f.cache);
  corrupt[f.urls[1]].items[0].url = 'https://evil.example';
  const fail = fixture({ use304: true, cache: corrupt });
  assert.equal((await collectRecentCommits(fail.args)).state, 'unavailable');
  const pushed = fixture({ head: C, cache: f.cache, previous: first });
  const next = await collectRecentCommits(pushed.args);
  assert.equal(next.headSha, C);
  assert.ok(pushed.urls[1].includes('sha=' + C));
  assert.ok(!Object.keys(f.cache).some((u) => u.includes('/commits?sha=' + A)));
});
test('quota, timeout and 404 preserve stale data and date without inventing an empty history; confirmed empty and unknown legacy differ', async () => {
  const first = await collectRecentCommits(fixture().args);
  for (const fail of ['rate-limit', 'request', 'not-found']) {
    const f = fixture({ fail, previous: first });
    const old = await collectRecentCommits({ ...f.args, at: '2026-11-08T23:05:00.000Z' });
    assert.equal(old.state, 'stale');
    assert.equal(old.checkedAt, first.checkedAt);
    assert.equal(old.items.length, 2);
    const absent = await collectRecentCommits({ ...f.args, previous: null });
    assert.equal(absent.state, 'unavailable');
    assert.equal(absent.checkedAt, null);
  }
  const empty = await collectRecentCommits({
    ...fixture().args,
    request: async () => ({ body: { emptyRepository: true } }),
  });
  assert.equal(empty.state, 'fresh');
  assert.equal(empty.problem, 'empty-repository');
  assert.equal(empty.headSha, null);
  assert.equal(empty.items.length, 0);
  validateRecentCommits(empty, repo, true);
  let calls = 0;
  const missingHead = await collectRecentCommits({
    ...fixture().args,
    request: async () => {
      if (!calls++) throw Object.assign(Error(), { code: 'not-found' });
      return { body: [] };
    },
  });
  assert.equal(missingHead.problem, 'empty-repository');
  assert.equal(calls, 2);
});
function network(override = () => null) {
  return async (url) => {
    const custom = override(url);
    if (custom) return custom;
    const [, repository, endpoint] = new URL(url).pathname.match(
      /^\/repos\/([^/]+\/[^/]+)(?:\/(.*))?$/,
    );
    assert.ok(GITHUB_REPOSITORIES.includes(repository));
    if (!endpoint)
      return new Response(
        JSON.stringify({
          private: false,
          visibility: 'public',
          full_name: repository,
          html_url: 'https://github.com/' + repository,
          name: repository.split('/')[1],
          default_branch: 'trunk/real',
        }),
      );
    if (endpoint.startsWith('git/ref/heads/'))
      return new Response(
        JSON.stringify({ ref: 'refs/heads/trunk/real', object: { type: 'commit', sha: A } }),
      );
    if (endpoint === 'commits')
      return new Response(
        JSON.stringify([
          commit(A, { html_url: 'https://github.com/' + repository + '/commit/' + A }),
        ]),
      );
    if (endpoint === 'releases/latest') return new Response('{}', { status: 404 });
    return new Response('[]');
  };
}
test('collector integrates every authorized source, isolates failures and clears history/cache when visibility cannot be reconfirmed', async () => {
  const first = await collectGithub({
    fetchImpl: network(),
    includeRecentCommits: true,
    now: () => Date.parse(at),
  });
  assert.equal(first.requests, GITHUB_REPOSITORIES.length * 9 + 3);
  assert.ok(first.snapshot.repositories.every((r) => r.recentCommits.items.length === 1));
  assert.equal(first.snapshot.schemaVersion, 9);
  assert.equal(validateGithubSnapshot(first.snapshot), first.snapshot);
  const failed = await collectGithub({
    previous: first.snapshot,
    includeRecentCommits: true,
    now: () => Date.parse(at) + 10000,
    fetchImpl: network((url) =>
      url.includes('/armadura-struct/commits?')
        ? new Response('{}', { status: 429, headers: { 'retry-after': '120' } })
        : null,
    ),
  });
  assert.equal(failed.snapshot.repositories[3].recentCommits.state, 'stale');
  assert.equal(failed.snapshot.repositories[0].recentCommits.state, 'fresh');
  assert.ok(failed.snapshot.retryAt);
  const hidden = await collectGithub({
    previous: first.snapshot,
    cache: first.cache,
    includeRecentCommits: true,
    now: () => Date.parse(at) + 10000,
    fetchImpl: network((url) =>
      url === 'https://api.github.com/repos/' + repo
        ? new Response(JSON.stringify({ private: true, visibility: 'private' }))
        : null,
    ),
  });
  assert.equal(hidden.snapshot.repositories[3].recentCommits.state, 'unavailable');
  assert.equal(hidden.snapshot.repositories[3].recentCommits.items.length, 0);
  assert.ok(!Object.keys(hidden.cache).some((k) => k.includes('/' + repo + '/')));
  const empty = await collectGithub({
    includeRecentCommits: true,
    now: () => Date.parse(at),
    fetchImpl: network((url) =>
      url.includes('/armadura-struct/git/ref/heads/')
        ? new Response(JSON.stringify({ message: 'Git Repository is empty.' }), { status: 409 })
        : null,
    ),
  });
  assert.equal(empty.snapshot.repositories[3].recentCommits.problem, 'empty-repository');
  const notFound = await collectGithub({
    includeRecentCommits: true,
    now: () => Date.parse(at),
    fetchImpl: network((url) =>
      url.includes('/armadura-struct/git/ref/heads/') || url.includes('/armadura-struct/commits?')
        ? new Response('{}', { status: 404 })
        : null,
    ),
  });
  assert.equal(notFound.snapshot.repositories[3].recentCommits.state, 'unavailable');
});
test('legacy snapshots migrate to uncollected v9 without losing OSF-52, selection keeps unrelated filters, and freshness is per collection', async () => {
  const first = await collectGithub({
    fetchImpl: network(),
    includeRecentCommits: true,
    now: () => Date.parse(at),
  });
  const legacy = structuredClone(first.snapshot);
  legacy.schemaVersion = 8;
  for (const r of legacy.repositories) delete r.recentCommits;
  const migrated = validateGithubSnapshot(legacy);
  assert.equal(migrated.schemaVersion, 9);
  assert.ok(migrated.repositories.every((r) => r.recentCommits.state === 'unavailable'));
  assert.deepEqual(migrated.repositories[0].codeRelations, legacy.repositories[0].codeRelations);
  const params = new URLSearchParams(
    'repo=mola-struct&issueState=closed&issueLabel=bug&pullState=merged',
  );
  const url = commitSectionLink(params, 'armadura-struct');
  assert.ok(url.endsWith('#commits'));
  assert.ok(url.includes('issueLabel=bug') && url.includes('pullState=merged'));
  assert.equal(params.get('repo'), 'mola-struct');
  const sources = selectDevelopmentSources('armadura-struct');
  assert.equal(
    recentCommitsView(first.snapshot, sources, Date.parse(at))[0].source.repository,
    repo,
  );
  assert.equal(
    recentCommitsView(first.snapshot, sources, Date.parse(at) + 3 * 3600000)[0].state,
    'stale',
  );
  assert.equal(recentCommitsView(first.snapshot, sources, Date.parse(at), true)[0].state, 'stale');
  assert.ok(
    recentCommitsView(first.snapshot, developmentSources, Date.parse(at)).every((v) =>
      v.historyUrl.endsWith('trunk%2Freal'),
    ),
  );
});

test('React renders malicious subjects as text and does not create remote images, HTML or message links', async () => {
  const { createServer } = await import('vite');
  const React = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { MemoryRouter } = await import('react-router-dom');
  const server = await createServer({
    server: { middlewareMode: true, hmr: false, host: '127.0.0.1' },
    appType: 'custom',
  });
  try {
    const { RecentCommits } = await server.ssrLoadModule('/src/components/RecentCommits.tsx');
    const snapshot = emptyGithubSnapshot();
    const target = snapshot.repositories.find((r) => r.repository === repo);
    target.visibility = 'public';
    target.recentCommits = {
      ...emptyRecentCommits(),
      state: 'fresh',
      branch: 'trunk/real',
      headSha: A,
      checkedAt: at,
      items: normalizeRecentCommits(
        [
          commit(A, {
            commit: {
              message:
                '<img src="https://evil.example/img" onerror="alert(1)"> javascript:alert(1)',
              author: {},
              committer: {},
            },
          }),
        ],
        repo,
      ),
    };
    const html = renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/development?repo=armadura-struct&pullState=merged#commits'] },
        React.createElement(RecentCommits, {
          snapshot,
          sources: selectDevelopmentSources('armadura-struct'),
          now: Date.parse(at),
          offline: false,
          loading: false,
        }),
      ),
    );
    assert.ok(html.includes('&lt;img'));
    assert.ok(!html.includes('<img'));
    assert.ok(!html.includes('href="javascript:'));
    assert.ok(html.includes('SHA completo'));
    assert.ok(html.includes('role="status"'));
    assert.ok(html.includes('/commits/trunk%2Freal'));
    assert.ok(html.includes('pullState=merged'));
    assert.ok(!html.includes('private.png'));
  } finally {
    await server.close();
  }
});

test('common credential forms in public subjects are removed before truncation and rejected by the public contract', () => {
  const secrets = [
    'ghp_' + 'a'.repeat(36),
    'github_pat_' + 'b'.repeat(30),
    'sk-' + 'c'.repeat(28),
    'token=very-sensitive-token',
    'Bearer abcdefghijklmnopqr',
  ];
  for (const secret of secrets) {
    const item = normalizeRecentCommits(
      [commit(A, { commit: { message: 'fix ' + secret, author: {}, committer: {} } })],
      repo,
    )[0];
    assert.ok(!item.subject.includes(secret));
    const list = {
      ...emptyRecentCommits(),
      state: 'fresh',
      branch: 'trunk',
      headSha: A,
      checkedAt: at,
      items: [{ ...item, subject: secret }],
    };
    assert.throws(() => validateRecentCommits(list, repo, true));
  }
});
