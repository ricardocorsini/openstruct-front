import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PublicDiscussionText } from '../src/components/PublicDiscussionText.ts';
import { collectGithub } from '../scripts/github-collector.mjs';
import { GITHUB_REPOSITORIES, validateGithubSnapshot } from '../src/lib/github-snapshot.ts';
const at = '2026-11-07T21:00:00Z';
const now = () => Date.parse(at);
const repository = 'ricardocorsini/openstruct-front';
const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers });
function issue(repo, number = 2) {
  return {
    number,
    title: 'Discussão ' + number,
    state: 'open',
    html_url: `https://github.com/${repo}/issues/${number}`,
    updated_at: at,
    labels: [],
    comments: 1,
    user: { login: 'contributor' },
  };
}
function pull(repo) {
  return {
    ...issue(repo, 1),
    html_url: `https://github.com/${repo}/pull/1`,
    draft: false,
    merged_at: null,
    closed_at: null,
    created_at: at,
    head: { ref: 'feature' },
    base: { ref: 'master' },
  };
}
function api(overrides = () => null) {
  return async (address, options) => {
    const url = new URL(address);
    const overridden = overrides(url, options);
    if (overridden) return overridden;
    const [, repo, endpoint] = url.pathname.match(/^\/repos\/([^/]+\/[^/]+)(?:\/(.*))?$/);
    if (!endpoint)
      return json({
        private: false,
        visibility: 'public',
        full_name: repo,
        html_url: 'https://github.com/' + repo,
        name: repo.split('/')[1],
        default_branch: 'master',
      });
    if (endpoint === 'releases/latest') return json({}, 404);
    if (repo !== repository) return json([]);
    if (endpoint === 'issues')
      return json(url.searchParams.get('state') === 'open' ? [issue(repo)] : []);
    if (endpoint === 'pulls') return json([pull(repo)]);
    if (endpoint === 'issues/2')
      return json({ ...issue(repo), body: 'Resumo\nContato public@example.com' });
    if (endpoint === 'issues/1')
      return json({ ...pull(repo), pull_request: {}, body: 'Descrição real do PR' });
    if (endpoint === 'issues/2/comments' || endpoint === 'issues/1/comments') {
      assert.equal(options.headers['If-None-Match'], undefined);
      const number = endpoint.split('/')[1];
      const kind = number === '1' ? 'pull' : 'issues';
      return json(
        [
          {
            id: 5,
            body: 'Conversa <script>alert(1)</script>',
            html_url: `https://github.com/${repo}/${kind}/${number}#issuecomment-5`,
            user: { login: 'public-user', email: 'secret@example.com' },
            created_at: at,
            updated_at: at,
          },
        ],
        200,
        { link: `<${url.origin}${url.pathname}?per_page=5&page=2>; rel="next"` },
      );
    }
    if (endpoint === 'pulls/1/comments')
      return json([
        {
          id: 8,
          body: 'Revisão do código',
          html_url: `https://github.com/${repo}/pull/1#discussion_r8`,
          user: { login: 'reviewer' },
          path: 'src/example.ts',
          line: 12,
          created_at: at,
          updated_at: at,
        },
      ]);
    return json([]);
  };
}
const collect = (fetchImpl = api(), previous) =>
  collectGithub({ fetchImpl, previous, now, includeDiscussions: true });

test('collects bounded recent issue and PR details with separate conversation/review and public permalinks', async () => {
  const { snapshot, requests, cache } = await collect();
  assert.equal(requests, GITHUB_REPOSITORIES.length * 7 + 3 + 5);
  const details = snapshot.repositories[0].discussions;
  assert.equal(details.length, 2);
  const pr = details.find((d) => d.kind === 'pull');
  const issue = details.find((d) => d.kind === 'issue');
  assert.equal(pr.state, 'available');
  assert.equal(pr.review.items[0].path, 'src/example.ts');
  assert.equal(pr.review.items[0].line, 12);
  assert.match(pr.review.items[0].url, /#discussion_r8$/);
  assert.equal(issue.review, null);
  assert.equal(issue.conversation.truncated, true);
  assert.ok(issue.body.includes('\n') && !JSON.stringify(snapshot).includes('@'));
  assert.ok(!Object.keys(cache).some((url) => /\/\d+(\/comments)?(?:\?|$)/.test(url)));
  assert.equal(validateGithubSnapshot(snapshot), snapshot);
});
test('HTML, script, javascript links and image syntax remain inert React text', () => {
  const attack =
    '<script>alert(1)</script><img src=x onerror=alert(2)>[link](javascript:alert(3)) ![image](https://evil.example/image)';
  const html = renderToStaticMarkup(createElement(PublicDiscussionText, { text: attack }));
  assert.ok(html.includes('&lt;script&gt;') && html.includes('javascript:'));
  assert.ok(!/<script|<img|<a\b|href=|src=/.test(html.replace('src=x', '')));
});
test('deleted comments and removed items withdraw previous text instead of retaining a stale copy', async () => {
  const first = await collect();
  const removed = await collect(
    api((url) =>
      url.pathname.endsWith('/issues/2/comments')
        ? json([])
        : url.pathname.endsWith('/issues/1')
          ? json({}, 404)
          : null,
    ),
    first.snapshot,
  );
  const details = removed.snapshot.repositories[0].discussions;
  assert.equal(details.find((d) => d.kind === 'issue').conversation.items.length, 0);
  const pr = details.find((d) => d.kind === 'pull');
  assert.equal(pr.body, null);
  assert.equal(pr.state, 'unavailable');
  assert.equal(pr.conversation.items.length, 0);
});
test('failed comment refresh removes old text in that category while preserving the other category', async () => {
  const first = await collect();
  const failed = await collect(
    api((url) => (url.pathname.endsWith('/issues/1/comments') ? json({}, 503) : null)),
    first.snapshot,
  );
  const pr = failed.snapshot.repositories[0].discussions.find((d) => d.kind === 'pull');
  assert.equal(pr.conversation.state, 'unavailable');
  assert.deepEqual(pr.conversation.items, []);
  assert.equal(pr.review.state, 'fresh');
  assert.equal(pr.body, 'Descrição real do PR');
});
test('privacy changes, invalid protocols, unexpected fields and cross-repo comment links fail closed', async () => {
  const first = await collect();
  for (const url of [
    'javascript:alert(1)',
    'https://github.com/other/repo/issues/2#issuecomment-5',
  ]) {
    const bad = structuredClone(first.snapshot);
    bad.repositories[0].discussions[0].conversation.items[0].url = url;
    assert.throws(() => validateGithubSnapshot(bad));
  }
  const extra = structuredClone(first.snapshot);
  extra.repositories[0].discussions[0].conversation.items[0].email = 'secret@example.com';
  assert.throws(() => validateGithubSnapshot(extra));
  const hidden = await collect(
    api((url) => (url.pathname === '/repos/' + repository ? json({ private: true }) : null)),
    first.snapshot,
  );
  assert.deepEqual(hidden.snapshot.repositories[0].discussions, []);
  assert.ok(!JSON.stringify(hidden.snapshot).includes('Descrição real'));
});
test('text and item limits are explicit and details absent from the next selection are removed', async () => {
  const result = await collect(
    api((url) =>
      url.pathname.endsWith('/issues/2')
        ? json({ ...issue(repository), body: 'a'.repeat(6000) })
        : null,
    ),
  );
  const d = result.snapshot.repositories[0].discussions.find((d) => d.kind === 'issue');
  assert.equal(d.body.length, 4000);
  assert.equal(d.bodyTruncated, true);
  const empty = await collect(
    api((url) =>
      url.pathname.endsWith('/issues') || url.pathname.endsWith('/pulls') ? json([]) : null,
    ),
    result.snapshot,
  );
  assert.deepEqual(empty.snapshot.repositories[0].discussions, []);
});
test('v4 migration is repeatable, preserves real PR evidence and does not fabricate comments', async () => {
  const first = await collect();
  const legacy = structuredClone(first.snapshot);
  legacy.schemaVersion = 4;
  for (const repo of legacy.repositories) {
    delete repo.discussions;
    delete repo.releaseHistory;
    delete repo.codeRelations;
    delete repo.recentCommits;
  }
  const migrated = validateGithubSnapshot(legacy);
  assert.equal(migrated.schemaVersion, 9);
  assert.doesNotThrow(() => validateGithubSnapshot(migrated));
  assert.deepEqual(migrated.repositories[0].lists.pulls, legacy.repositories[0].lists.pulls);
  assert.deepEqual(migrated.repositories[0].discussions, []);
  const restored = await collect(api(), migrated);
  assert.equal(restored.snapshot.repositories[0].status, 'ready');
});

test('selection stops at two recent items and does not request the remaining item details', async () => {
  const requested = [];
  const result = await collect(
    api((url) => {
      if (url.pathname === '/repos/' + repository + '/issues')
        return json(
          url.searchParams.get('state') === 'open'
            ? [issue(repository, 2), issue(repository, 3), issue(repository, 4)]
            : [],
        );
      if (/\/issues\/\d+$/.test(url.pathname)) requested.push(url.pathname);
      if (url.pathname === '/repos/' + repository + '/issues/3')
        return json({ ...issue(repository, 3), body: 'Terceira issue' });
    }),
  );
  assert.equal(result.snapshot.repositories[0].discussions.length, 2);
  assert.deepEqual(requested, [
    '/repos/' + repository + '/issues/2',
    '/repos/' + repository + '/issues/3',
  ]);
});
