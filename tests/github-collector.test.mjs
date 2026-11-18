import test from 'node:test';
import assert from 'node:assert/strict';
import { collectGithub } from '../scripts/github-collector.mjs';
import {
  GITHUB_REPOSITORIES,
  emptyGithubSnapshot,
  validateGithubSnapshot,
} from '../src/lib/github-snapshot.ts';
const at = Date.parse('2026-11-07T16:00:00Z');
const now = () => at;
function response(body, status = 200, headers = {}) {
  return new Response(status === 304 ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}
function metadata(repository, extra = {}) {
  return {
    private: false,
    visibility: 'public',
    full_name: repository,
    html_url: 'https://github.com/' + repository,
    name: repository.split('/')[1],
    default_branch: 'master',
    description: 'Contato publico@example.com',
    stargazers_count: 2,
    forks_count: 1,
    open_issues_count: 3,
    ...extra,
  };
}
function issue(repository, number = 1, extra = {}) {
  return {
    number,
    state: 'open',
    labels: [],
    comments: 0,
    title: 'Teste publico@example.com',
    html_url: 'https://github.com/' + repository + '/issues/' + number,
    updated_at: '2026-11-07T15:00:00Z',
    body: 'not exported',
    user: { email: 'never@example.com' },
    ...extra,
  };
}
function fixture(overrides = () => null) {
  return async (url, options) => {
    const custom = overrides(url, options);
    if (custom) return custom;
    const match = new URL(url).pathname.match(/^\/repos\/([^/]+\/[^/]+)(?:\/(.*))?$/);
    assert.ok(match);
    const [, repository, endpoint] = match;
    assert.ok(GITHUB_REPOSITORIES.includes(repository));
    if (!endpoint) return response(metadata(repository));
    if (endpoint === 'releases/latest') return response({}, 404);
    if (endpoint === 'issues' && new URL(url).searchParams.get('state') === 'closed')
      return response([]);
    if (endpoint === 'issues') return response([issue(repository)]);
    return response([]);
  };
}

test('exports only selected public fields, redacts emails and rejects unknown contract keys', async () => {
  const { snapshot, requests } = await collectGithub({ fetchImpl: fixture(), now });
  assert.equal(requests, GITHUB_REPOSITORIES.length * 7 + 3);
  assert.equal(snapshot.repositories.length, GITHUB_REPOSITORIES.length);
  assert.ok(snapshot.repositories.every((entry) => entry.status === 'ready'));
  const json = JSON.stringify(snapshot);
  assert.ok(!json.includes('@') && !json.includes('not exported') && !json.includes('token'));
  assert.equal(validateGithubSnapshot(snapshot), snapshot);
  assert.throws(() => validateGithubSnapshot({ ...snapshot, token: 'secret' }));
  const duplicate = structuredClone(snapshot);
  duplicate.repositories[1] = duplicate.repositories[0];
  assert.throws(() => validateGithubSnapshot(duplicate));
});

test('private or no longer confirmed repository never exports previous data or requests its lists', async () => {
  const first = await collectGithub({ fetchImpl: fixture(), now });
  const target = GITHUB_REPOSITORIES[0];
  const seen = [];
  const second = await collectGithub({
    previous: first.snapshot,
    cache: first.cache,
    now,
    fetchImpl: fixture((url) => {
      seen.push(url);
      if (url === 'https://api.github.com/repos/' + target)
        return response(metadata(target, { private: true, visibility: 'private' }));
    }),
  });
  const entry = second.snapshot.repositories[0];
  assert.equal(entry.visibility, 'unknown');
  assert.equal(entry.summary, null);
  assert.equal(entry.lastSuccessAt, null);
  assert.ok(Object.values(entry.lists).every((list) => !list.items.length));
  assert.ok(!seen.some((url) => url.startsWith('https://api.github.com/repos/' + target + '/')));
  assert.ok(!Object.keys(second.cache).some((url) => url.includes(target + '/')));
  assert.equal(second.snapshot.repositories[1].status, 'ready');
});

test('follows Link pagination, filters PRs out of issues and declares a bounded slice', async () => {
  const result = await collectGithub({
    now,
    fetchImpl: fixture((url) => {
      if (!(url.includes('/issues?') && new URL(url).searchParams.get('state') === 'open'))
        return null;
      const u = new URL(url);
      const repository = u.pathname.split('/').slice(2, 4).join('/');
      const page = Number(u.searchParams.get('page'));
      const next = new URL(url);
      next.searchParams.set('page', String(page + 1));
      return response([issue(repository, page), issue(repository, 90, { pull_request: {} })], 200, {
        link: '<' + next.href + '>; rel="next"',
        etag: '"page-' + page + '"',
      });
    }),
  });
  assert.equal(result.requests, GITHUB_REPOSITORIES.length * 8 + 3);
  assert.deepEqual(
    result.snapshot.repositories[0].lists.issues.items.map((item) => item.id),
    ['1', '2'],
  );
  assert.equal(result.snapshot.repositories[0].lists.issues.truncated, true);
});

test('304 reuses sanitized page and pagination, with a fresh visibility check every cycle', async () => {
  const first = await collectGithub({
    now,
    fetchImpl: fixture((url) =>
      url.includes('/issues?') && new URL(url).searchParams.get('state') === 'open'
        ? response([issue(url.split('/repos/')[1].split('/issues')[0])], 200, { etag: '"same"' })
        : null,
    ),
  });
  let metadataCalls = 0;
  const second = await collectGithub({
    previous: first.snapshot,
    cache: first.cache,
    now: () => at + 1000,
    fetchImpl: fixture((url, options) => {
      if (!url.includes('?') && !url.endsWith('/releases/latest')) {
        metadataCalls++;
        assert.equal(options.headers['If-None-Match'], undefined);
      }
      if (url.includes('/issues?') && new URL(url).searchParams.get('state') === 'open') {
        assert.equal(options.headers['If-None-Match'], '"same"');
        return response(null, 304);
      }
    }),
  });
  assert.equal(metadataCalls, GITHUB_REPOSITORIES.length);
  assert.equal(second.snapshot.repositories[0].lists.issues.items.length, 1);
  assert.equal(second.snapshot.repositories[0].lists.issues.state, 'fresh');
  assert.equal(
    second.snapshot.repositories[0].lists.issues.checkedAt,
    new Date(at + 1000).toISOString(),
  );
});

test('partial failure retains last valid list only after fresh public confirmation', async () => {
  const first = await collectGithub({ now, fetchImpl: fixture() });
  const target = GITHUB_REPOSITORIES[0];
  const second = await collectGithub({
    previous: first.snapshot,
    now: () => at + 1000,
    fetchImpl: fixture((url) =>
      url.startsWith('https://api.github.com/repos/' + target + '/issues?')
        ? response({}, 500)
        : null,
    ),
  });
  assert.equal(second.snapshot.repositories[0].status, 'partial');
  assert.equal(second.snapshot.repositories[0].lists.issues.state, 'stale');
  assert.deepEqual(
    second.snapshot.repositories[0].lists.issues.items,
    first.snapshot.repositories[0].lists.issues.items,
  );
  assert.equal(
    second.snapshot.repositories[0].lastSuccessAt,
    first.snapshot.repositories[0].lastSuccessAt,
  );
  assert.equal(second.snapshot.repositories[1].status, 'ready');
});

test('403 and 429 stop requests and honor Retry-After/reset across runs without sleeping', async () => {
  for (const status of [403, 429]) {
    let calls = 0;
    const result = await collectGithub({
      now,
      fetchImpl: async () => {
        calls++;
        return response({}, status, {
          'retry-after': '3600',
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': String((at + 1800000) / 1000),
        });
      },
    });
    assert.equal(calls, 1);
    assert.equal(result.snapshot.retryAt, new Date(at + 3600000).toISOString());
    assert.ok(result.snapshot.repositories.every((entry) => entry.summary === null));
    const skipped = await collectGithub({
      previous: result.snapshot,
      now,
      fetchImpl: async () => {
        throw new Error('must not call');
      },
    });
    assert.equal(skipped.requests, 0);
    assert.equal(skipped.snapshot, result.snapshot);
  }
});

test('timeout, invalid source and malformed response are isolated, without leaking raw errors', async () => {
  const target = GITHUB_REPOSITORIES[0];
  const result = await collectGithub({
    now,
    timeoutMs: 1,
    fetchImpl: fixture((url, options) => {
      if (url === 'https://api.github.com/repos/' + target)
        return new Promise((_, reject) =>
          options.signal.addEventListener('abort', () => reject(new Error('secret'))),
        );
      if (url.includes(GITHUB_REPOSITORIES[1] + '/issues?'))
        return response([
          issue(GITHUB_REPOSITORIES[1], 1, { html_url: 'https://evil.example/secret' }),
        ]);
      return null;
    }),
  });
  assert.equal(result.snapshot.repositories[0].summary, null);
  assert.equal(result.snapshot.repositories[1].lists.issues.state, 'unavailable');
  assert.equal(result.snapshot.repositories[2].status, 'ready');
  assert.ok(!JSON.stringify(result.snapshot).includes('secret'));
});

test('rejects unauthorized repositories and any data on unconfirmed visibility', () => {
  const snapshot = emptyGithubSnapshot();
  snapshot.repositories[0].repository = 'ricardocorsini/launcher-struct';
  assert.throws(() => validateGithubSnapshot(snapshot));
  const unknown = emptyGithubSnapshot();
  unknown.repositories[0].lists.issues = {
    state: 'fresh',
    checkedAt: new Date(at).toISOString(),
    truncated: false,
    items: [issue(GITHUB_REPOSITORIES[0])],
  };
  assert.throws(() => validateGithubSnapshot(unknown));
});

test('a 304 without saved page is unavailable, while a successful empty list is fresh', async () => {
  const result = await collectGithub({
    now,
    fetchImpl: fixture((url) =>
      url.includes('/issues?') && new URL(url).searchParams.get('state') === 'open'
        ? response(null, 304)
        : null,
    ),
  });
  assert.equal(result.snapshot.repositories[0].lists.issues.state, 'unavailable');
  assert.equal(result.snapshot.repositories[0].lists.pulls.state, 'fresh');
});
test('Retry-After HTTP-date is honored and a foreign pagination origin cannot be followed', async () => {
  const throttled = await collectGithub({
    now,
    fetchImpl: async () =>
      response({}, 429, { 'retry-after': new Date(at + 900000).toUTCString() }),
  });
  assert.equal(throttled.snapshot.retryAt, new Date(at + 900000).toISOString());
  const result = await collectGithub({
    now,
    fetchImpl: fixture((url) =>
      url.includes('/issues?') && new URL(url).searchParams.get('state') === 'open'
        ? response([], 200, {
            link: '<https://evil.example/private?per_page=30&page=2>; rel="next"',
          })
        : null,
    ),
  });
  assert.equal(result.snapshot.repositories[0].lists.issues.state, 'unavailable');
  assert.equal(result.snapshot.repositories[0].lists.pulls.state, 'fresh');
});

function release(repository, extra = {}) {
  return {
    tag_name: 'v1.2.3',
    name: 'Release',
    html_url: 'https://github.com/' + repository + '/releases/tag/v1.2.3',
    published_at: '2026-11-07T15:00:00Z',
    draft: false,
    prerelease: false,
    body: 'not exported',
    ...extra,
  };
}
test('collects only public stable releases, including conditional 304 and confirmed absence', async () => {
  const first = await collectGithub({
    now,
    fetchImpl: fixture((url) =>
      url.endsWith('/releases/latest')
        ? response(release(url.split('/repos/')[1].split('/releases/')[0]), 200, {
            etag: '"release"',
          })
        : null,
    ),
  });
  assert.equal(first.snapshot.schemaVersion, 9);
  assert.equal(first.snapshot.repositories[0].release.item.tag, 'v1.2.3');
  assert.ok(!JSON.stringify(first.snapshot).includes('not exported'));
  const second = await collectGithub({
    now,
    previous: first.snapshot,
    cache: first.cache,
    fetchImpl: fixture((url, options) => {
      if (!url.endsWith('/releases/latest')) return null;
      assert.equal(options.headers['If-None-Match'], '"release"');
      return response(null, 304);
    }),
  });
  assert.deepEqual(second.snapshot.repositories[0].release, first.snapshot.repositories[0].release);
  const none = await collectGithub({
    now,
    previous: first.snapshot,
    cache: first.cache,
    fetchImpl: fixture(),
  });
  assert.equal(none.snapshot.repositories[0].release.state, 'fresh');
  assert.equal(none.snapshot.repositories[0].release.item, null);
});
test('release failure keeps old public release as stale; draft, prerelease and unauthorized URLs are never exported', async () => {
  const target = GITHUB_REPOSITORIES[0];
  const first = await collectGithub({
    now,
    fetchImpl: fixture((url) =>
      url.endsWith('/releases/latest')
        ? response(release(url.split('/repos/')[1].split('/releases/')[0]))
        : null,
    ),
  });
  for (const patch of [
    { draft: true },
    { prerelease: true },
    { html_url: 'https://evil.example/secret' },
  ]) {
    const result = await collectGithub({
      now,
      previous: first.snapshot,
      fetchImpl: fixture((url) =>
        url === 'https://api.github.com/repos/' + target + '/releases/latest'
          ? response(release(target, patch))
          : null,
      ),
    });
    assert.equal(result.snapshot.repositories[0].release.state, 'stale');
    assert.deepEqual(
      result.snapshot.repositories[0].release.item,
      first.snapshot.repositories[0].release.item,
    );
    assert.equal(result.snapshot.repositories[1].status, 'ready');
    assert.ok(!JSON.stringify(result.snapshot).includes('evil.example'));
  }
  const hidden = await collectGithub({
    now,
    previous: first.snapshot,
    fetchImpl: fixture((url) =>
      url === 'https://api.github.com/repos/' + target
        ? response(metadata(target, { private: true, visibility: 'private' }))
        : null,
    ),
  });
  assert.equal(hidden.snapshot.repositories[0].release.state, 'unavailable');
  assert.equal(hidden.snapshot.repositories[0].release.item, null);
});

test('milestones collect both states, preserve exact counters/dates and reuse normalized 304 pages', async () => {
  const endpoint = (url) => new URL(url).pathname.endsWith('/milestones');
  const data = (url) => {
    assert.equal(new URL(url).searchParams.get('state'), 'all');
    return [
      {
        number: 1,
        title: 'Milestone aberto',
        html_url:
          url.split('/milestones')[0].replace('api.github.com/repos/', 'github.com/') +
          '/milestone/1',
        state: 'open',
        open_issues: 3,
        closed_issues: 1,
        updated_at: '2026-11-07T15:00:00Z',
        due_on: null,
        closed_at: null,
      },
      {
        number: 2,
        title: 'Fechado com pendência',
        html_url:
          url.split('/milestones')[0].replace('api.github.com/repos/', 'github.com/') +
          '/milestone/2',
        state: 'closed',
        open_issues: 1,
        closed_issues: 2,
        updated_at: '2026-11-07T15:00:00Z',
        due_on: '2026-12-01T00:00:00Z',
        closed_at: '2026-11-07T15:00:00Z',
      },
    ];
  };
  const first = await collectGithub({
    now,
    fetchImpl: fixture((url) =>
      endpoint(url) ? response(data(url), 200, { etag: '"milestones"' }) : null,
    ),
  });
  const list = first.snapshot.repositories[0].lists.milestones;
  assert.equal(list.state, 'fresh');
  assert.equal(list.items[1].milestone.state, 'closed');
  assert.equal(list.items[1].milestone.openItems, 1);
  assert.equal(list.items[0].milestone.dueOn, null);
  assert.equal(list.items[0].updatedAt, '2026-11-07T15:00:00.000Z');
  const second = await collectGithub({
    now,
    previous: first.snapshot,
    cache: first.cache,
    fetchImpl: fixture((url, options) => {
      if (!endpoint(url)) return null;
      assert.equal(options.headers['If-None-Match'], '"milestones"');
      return response(null, 304);
    }),
  });
  assert.deepEqual(second.snapshot.repositories[0].lists.milestones, list);
  const failed = await collectGithub({
    now,
    previous: first.snapshot,
    fetchImpl: fixture((url) =>
      endpoint(url) ? response(data(url).map((m) => ({ ...m, closed_issues: -1 }))) : null,
    ),
  });
  assert.equal(failed.snapshot.repositories[0].lists.milestones.state, 'stale');
  assert.deepEqual(failed.snapshot.repositories[0].lists.milestones.items, list.items);
  assert.equal(failed.snapshot.repositories[0].issueDetails.open.state, 'fresh');
});

test('bounded release history uses ETag pages, filters draft text, retains partial sources and withdraws removed releases', async () => {
  const target = 'ricardocorsini/openstruct-catalog';
  const endpoint = (url) => url.includes(target + '/releases?');
  const first = await collectGithub({
    now,
    fetchImpl: fixture((url) => {
      if (!endpoint(url)) return null;
      const page = Number(new URL(url).searchParams.get('page'));
      const next = new URL(url);
      next.searchParams.set('page', String(page + 1));
      const tag = 'launcher-v0.2.' + page;
      return response(
        [
          { draft: true, tag_name: 'armadurastruct-v9.0.0', body: 'draft secret' },
          {
            draft: false,
            prerelease: page === 2,
            tag_name: tag,
            name: 'Launcher',
            published_at: '2026-11-07T15:00:00Z',
            html_url: 'https://github.com/' + target + '/releases/tag/' + tag,
            body: 'Notas públicas',
          },
        ],
        200,
        { etag: '"history-' + page + '"', link: '<' + next.href + '>; rel="next"' },
      );
    }),
  });
  const source = first.snapshot.repositories.at(-1).releaseHistory;
  assert.equal(source.items.length, 2);
  assert.equal(source.truncated, true);
  assert.ok(!JSON.stringify(first.cache).includes('draft secret'));
  const second = await collectGithub({
    now,
    previous: first.snapshot,
    cache: first.cache,
    fetchImpl: fixture((url, options) => {
      if (!endpoint(url)) return null;
      assert.ok(options.headers['If-None-Match']);
      return response(null, 304);
    }),
  });
  assert.deepEqual(second.snapshot.repositories.at(-1).releaseHistory, source);
  const failed = await collectGithub({
    now,
    previous: first.snapshot,
    fetchImpl: fixture((url) => (endpoint(url) ? response({}, 500) : null)),
  });
  assert.equal(failed.snapshot.repositories.at(-1).releaseHistory.state, 'stale');
  assert.equal(failed.snapshot.repositories[1].releaseHistory.state, 'fresh');
  const cleared = await collectGithub({ now, previous: first.snapshot, fetchImpl: fixture() });
  assert.equal(cleared.snapshot.repositories.at(-1).releaseHistory.items.length, 0);
  const hidden = await collectGithub({
    now,
    previous: first.snapshot,
    fetchImpl: fixture((url) =>
      url === 'https://api.github.com/repos/' + target
        ? response(metadata(target, { private: true, visibility: 'private' }))
        : null,
    ),
  });
  assert.equal(hidden.snapshot.repositories.at(-1).releaseHistory.state, 'unavailable');
  assert.equal(hidden.snapshot.repositories.at(-1).releaseHistory.items.length, 0);
});

test('v6 migration preserves milestone and discussion evidence while history remains unknown', async () => {
  const first = await collectGithub({ now, fetchImpl: fixture() });
  const legacy = structuredClone(first.snapshot);
  legacy.schemaVersion = 6;
  for (const repo of legacy.repositories) {
    delete repo.releaseHistory;
    delete repo.codeRelations;
    delete repo.recentCommits;
  }
  const migrated = validateGithubSnapshot(legacy);
  assert.equal(migrated.schemaVersion, 9);
  assert.deepEqual(
    migrated.repositories[0].lists.milestones,
    legacy.repositories[0].lists.milestones,
  );
  assert.deepEqual(migrated.repositories[0].discussions, legacy.repositories[0].discussions);
  assert.equal(migrated.repositories[0].releaseHistory.state, 'unavailable');
  assert.doesNotThrow(() => validateGithubSnapshot(migrated));
});
