import test from 'node:test';
import assert from 'node:assert/strict';
import { collectGithub } from '../scripts/github-collector.mjs';
import { GITHUB_REPOSITORIES, validateGithubSnapshot } from '../src/lib/github-snapshot.ts';
import { developmentSources, developmentView } from '../src/lib/development.ts';
import { pullState, readPullFilters, selectPulls } from '../src/lib/pulls.ts';
const at = '2026-11-07T19:00:00Z';
const now = () => Date.parse(at);
function pr(repository, number, state = 'open', draft = false, merged_at = null) {
  return {
    number,
    state,
    draft,
    merged_at,
    title: 'PR ' + number,
    html_url: `https://github.com/${repository}/pull/${number}`,
    created_at: at,
    updated_at: at,
    closed_at: state === 'closed' ? at : null,
    user: { login: 'contributor', email: 'private@example.com' },
    head: { ref: 'feature/cad' },
    base: { ref: 'master' },
    body: 'not exported',
  };
}
function api(override = () => null) {
  return async (address, options) => {
    const url = new URL(address);
    const custom = override(url, options);
    if (custom) return custom;
    const [, repository, endpoint] = url.pathname.match(/^\/repos\/([^/]+\/[^/]+)(?:\/(.*))?$/);
    if (!endpoint)
      return new Response(
        JSON.stringify({
          private: false,
          visibility: 'public',
          full_name: repository,
          html_url: 'https://github.com/' + repository,
          name: repository.split('/')[1],
          default_branch: 'master',
        }),
      );
    if (endpoint === 'releases/latest') return new Response('{}', { status: 404 });
    if (endpoint === 'pulls') {
      assert.equal(url.searchParams.get('state'), 'all');
      return new Response(
        JSON.stringify([
          pr(repository, 1),
          pr(repository, 2, 'open', true),
          pr(repository, 3, 'closed'),
          pr(repository, 4, 'closed', false, at),
        ]),
        { headers: { etag: 'pulls-v4' } },
      );
    }
    if (endpoint === 'issues')
      return new Response(JSON.stringify([{ ...pr(repository, 1), pull_request: {} }]));
    return new Response('[]');
  };
}
test('collector exports four distinct PR states, public metadata and no issue duplication or CI fiction', async () => {
  const result = await collectGithub({ fetchImpl: api(), now });
  assert.equal(result.requests, GITHUB_REPOSITORIES.length * 7 + 3);
  const repo = result.snapshot.repositories[0];
  assert.deepEqual(repo.lists.pulls.items.map(pullState), ['open', 'draft', 'closed', 'merged']);
  assert.equal(repo.lists.issues.items.length, 0);
  assert.equal(repo.lists.pulls.items[0].pull.author, 'contributor');
  assert.equal(repo.lists.pulls.items[0].pull.head, 'feature/cad');
  const output = JSON.stringify(result.snapshot);
  assert.ok(
    !output.includes('@') && !output.includes('not exported') && !output.includes('checks'),
  );
  const view = developmentView(result.snapshot, developmentSources, now());
  assert.equal(view.pulls.count, developmentSources.length * 2); // Open and draft in each repository.
});
test('state and repository filters use URL selection, stable update ordering and unknown values', async () => {
  const { snapshot } = await collectGithub({ fetchImpl: api(), now });
  assert.deepEqual(readPullFilters(new URLSearchParams('pullState=merged&pullPage=2')), {
    state: 'merged',
    page: 2,
  });
  assert.deepEqual(readPullFilters(new URLSearchParams('pullState=__proto__&pullPage=-1')), {
    state: 'all',
    page: 1,
  });
  const selected = selectPulls(snapshot, [developmentSources[0]], 'merged', now());
  assert.equal(selected.rows.length, 1);
  assert.equal(pullState(selected.rows[0].item), 'merged');
  assert.equal(
    selectPulls(snapshot, developmentSources, 'all', now()).rows.length,
    developmentSources.length * 4,
  );
  assert.equal(
    selectPulls(snapshot, developmentSources, 'closed', now()).rows.length,
    developmentSources.length,
  );
});
test('missing draft or merge evidence stays unknown; invalid metadata and foreign URLs are rejected', async () => {
  const { snapshot } = await collectGithub({ fetchImpl: api(), now });
  const item = snapshot.repositories[0].lists.pulls.items[0];
  assert.equal(pullState({ ...item, pull: undefined }), 'unknown');
  assert.equal(pullState({ ...item, pull: { ...item.pull, draft: null } }), 'unknown');
  assert.equal(
    pullState({ ...item, pull: { ...item.pull, state: 'closed', mergeKnown: false } }),
    'unknown',
  );
  for (const patch of [
    { mergedAt: at },
    { author: 'private@example.com' },
    { head: 'javascript\u0000bad' },
    { checks: 'success' },
  ]) {
    const bad = structuredClone(snapshot);
    Object.assign(bad.repositories[0].lists.pulls.items[0].pull, patch);
    assert.throws(() => validateGithubSnapshot(bad));
  }
  const bad = structuredClone(snapshot);
  bad.repositories[0].lists.pulls.items[0].url = 'https://evil.example/pull/1';
  assert.throws(() => validateGithubSnapshot(bad));
});
test('304 reuses normalized PR evidence; failure retains stale public data and private sources remove it', async () => {
  const first = await collectGithub({ fetchImpl: api(), now });
  const second = await collectGithub({
    previous: first.snapshot,
    cache: first.cache,
    now,
    fetchImpl: api((url, options) => {
      if (url.pathname.endsWith('/pulls')) {
        assert.equal(options.headers['If-None-Match'], 'pulls-v4');
        return new Response(null, { status: 304 });
      }
    }),
  });
  assert.deepEqual(
    second.snapshot.repositories[0].lists.pulls.items,
    first.snapshot.repositories[0].lists.pulls.items,
  );
  const failed = await collectGithub({
    previous: first.snapshot,
    now,
    fetchImpl: api((url) =>
      url.pathname.endsWith('/pulls') ? new Response('{}', { status: 503 }) : null,
    ),
  });
  assert.equal(failed.snapshot.repositories[0].lists.pulls.state, 'stale');
  assert.equal(
    selectPulls(failed.snapshot, developmentSources, 'all', now()).coverage[0].stale,
    true,
  );
  const hidden = await collectGithub({
    previous: first.snapshot,
    now,
    fetchImpl: api((url) =>
      !url.pathname.slice('/repos/'.length).includes('/pulls') &&
      url.pathname === '/repos/ricardocorsini/openstruct-front'
        ? new Response('{"private":true}')
        : null,
    ),
  });
  assert.equal(hidden.snapshot.repositories[0].lists.pulls.items.length, 0);
});
test('legacy v3 open-only preview never becomes confirmed history for all PR states', async () => {
  const { snapshot } = await collectGithub({ fetchImpl: api(), now });
  snapshot.schemaVersion = 3;
  for (const repo of snapshot.repositories) {
    delete repo.discussions;
    delete repo.releaseHistory;
    delete repo.codeRelations;
    delete repo.recentCommits;
  }
  for (const repo of snapshot.repositories)
    repo.lists.pulls.items = repo.lists.pulls.items
      .filter((item) => item.pull.state === 'open')
      .map(({ pull, ...item }) => item);
  const migrated = validateGithubSnapshot(snapshot);
  assert.doesNotThrow(() => validateGithubSnapshot(migrated));
  assert.equal(migrated.repositories[0].status, 'partial');
  const restored = await collectGithub({ previous: migrated, now, fetchImpl: api() });
  assert.equal(restored.snapshot.repositories[0].status, 'ready');
  assert.equal(migrated.schemaVersion, 9);
  assert.equal(migrated.repositories[0].lists.pulls.state, 'unavailable');
  assert.equal(
    selectPulls(migrated, developmentSources, 'all', now()).coverage.some((row) => row.known),
    false,
  );
});
test('PR pagination remains bounded at two pages per repository and exposes truncation', async () => {
  const result = await collectGithub({
    now,
    fetchImpl: api((url) => {
      if (!url.pathname.endsWith('/pulls')) return null;
      const page = Number(url.searchParams.get('page'));
      const repository = url.pathname.slice('/repos/'.length, -'/pulls'.length);
      const next = new URL(url);
      next.searchParams.set('page', String(page + 1));
      return new Response(
        JSON.stringify(
          Array.from({ length: 30 }, (_, i) => pr(repository, (page - 1) * 30 + i + 1)),
        ),
        { headers: { link: `<${next}>; rel="next"` } },
      );
    }),
  });
  assert.equal(result.requests, GITHUB_REPOSITORIES.length * 8 + 3);
  assert.equal(result.snapshot.repositories[0].lists.pulls.items.length, 60);
  assert.equal(result.snapshot.repositories[0].lists.pulls.truncated, true);
});
