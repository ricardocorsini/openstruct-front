import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyGithubSnapshot,
  GITHUB_REPOSITORIES,
  SNAPSHOT_STALE_MS,
} from '../src/lib/github-snapshot.ts';
import { contributionPolicies, selectFirstContributions } from '../src/lib/contributions.ts';
import { currentApps } from '../src/lib/apps.ts';
const time = Date.parse('2026-11-07T22:00:00Z');
const at = new Date(time).toISOString();
function fixture() {
  const snapshot = emptyGithubSnapshot();
  snapshot.generatedAt = at;
  for (const repo of snapshot.repositories) {
    repo.visibility = 'public';
    repo.verifiedPublicAt = at;
    Object.assign(repo.issueDetails.open, { state: 'fresh', checkedAt: at });
  }
  return snapshot;
}
function issue(repo, number, labels = ['good first issue'], extra = {}) {
  return {
    number,
    title: 'Problema público ' + number,
    state: 'open',
    url: 'https://github.com/' + repo.repository + '/issues/' + number,
    updatedAt: at,
    labels,
    author: null,
    comments: 0,
    ...extra,
  };
}
test('only configured labels on open issue URLs create opportunities; original labels remain intact', () => {
  const snapshot = fixture();
  const repo = snapshot.repositories[0];
  repo.issueDetails.open.items = [
    issue(repo, 1, ['good first issue', 'help wanted']),
    issue(repo, 2, ['bug']),
    issue(repo, 3, null),
    issue(repo, 4, ['help wanted'], { state: 'closed' }),
    issue(repo, 5, ['iniciante']),
    issue(repo, 6, []),
  ];
  const result = selectFirstContributions(snapshot, time);
  assert.deepEqual(
    result.opportunities.map((row) => row.issue.number),
    [1],
  );
  assert.deepEqual(result.opportunities[0].labels, ['good first issue', 'help wanted']);
  assert.equal(result.opportunities[0].issue.title, 'Problema público 1');
});
test('equivalent labels are explicit per repository and cannot spill into another source', () => {
  const snapshot = fixture();
  const [a, b] = snapshot.repositories;
  a.issueDetails.open.items = [issue(a, 1, ['documentação inicial'])];
  b.issueDetails.open.items = [issue(b, 1, ['documentação inicial'])];
  assert.equal(selectFirstContributions(snapshot, time).opportunities.length, 0);
  const policies = {
    ...contributionPolicies,
    [a.repository]: { ...contributionPolicies[a.repository], labels: ['documentação inicial'] },
  };
  const result = selectFirstContributions(snapshot, time, false, policies);
  assert.equal(result.opportunities.length, 1);
  assert.equal(result.opportunities[0].source.repository, a.repository);
  assert.deepEqual(result.opportunities[0].labels, ['documentação inicial']);
});
test('stale, offline, unavailable, private and future-dated sources cannot advertise work', () => {
  const snapshot = fixture();
  const repo = snapshot.repositories[0];
  repo.issueDetails.open.items = [issue(repo, 1)];
  for (const change of [
    (s) => {
      s.repositories[0].visibility = 'unknown';
    },
    (s) => {
      s.repositories[0].issueDetails.open.state = 'stale';
    },
    (s) => {
      s.repositories[0].issueDetails.open.state = 'unavailable';
    },
    (s) => {
      s.repositories[0].issueDetails.open.checkedAt = '2026-11-08T22:00:00Z';
    },
  ]) {
    const bad = structuredClone(snapshot);
    change(bad);
    assert.equal(selectFirstContributions(bad, time).opportunities.length, 0);
  }
  assert.equal(selectFirstContributions(snapshot, time, true).opportunities.length, 0);
  assert.equal(
    selectFirstContributions(snapshot, time + SNAPSHOT_STALE_MS + 1).opportunities.length,
    0,
  );
});
test('PRs, mixed payloads, foreign URLs and duplicates do not become showcase tickets', () => {
  const snapshot = fixture();
  const repo = snapshot.repositories[0];
  repo.lists.pulls.items = [{ id: '3', url: 'https://github.com/' + repo.repository + '/pull/3' }];
  repo.issueDetails.open.items = [
    issue(repo, 1),
    issue(repo, 1),
    issue(repo, 2, ['help wanted'], { pull_request: {} }),
    issue(repo, 3),
    issue(repo, 4, ['help wanted'], { url: 'javascript:alert(1)' }),
    issue(repo, 5, ['help wanted'], { url: 'https://github.com/other/repo/issues/5' }),
  ];
  assert.deepEqual(
    selectFirstContributions(snapshot, time).opportunities.map((row) => row.issue.number),
    [1],
  );
});
test('update order is stable and independent of title length, comment counts and AI wording', () => {
  const snapshot = fixture();
  const repo = snapshot.repositories[0];
  repo.issueDetails.open.items = [
    issue(repo, 1, ['help wanted'], { title: 'Curto', comments: 999 }),
    issue(repo, 2, ['help wanted'], {
      title: 'Usar IA '.repeat(20),
      comments: 0,
      updatedAt: '2026-11-07T21:00:00Z',
    }),
    issue(repo, 3, ['help wanted'], { title: 'Um caso detalhado de reprodução', comments: 0 }),
  ];
  assert.deepEqual(
    selectFirstContributions(snapshot, time).opportunities.map((row) => row.issue.number),
    [3, 1, 2],
  );
});
test('empty results and partial coverage preserve honest alternatives without fake tickets', () => {
  const snapshot = fixture();
  snapshot.repositories[0].issueDetails.open.truncated = true;
  let result = selectFirstContributions(snapshot, time);
  assert.equal(result.opportunities.length, 0);
  assert.equal(result.coverage[0].truncated, true);
  assert.equal(result.coverage[0].state, 'fresh');
  result = selectFirstContributions(null, time);
  assert.equal(result.opportunities.length, 0);
  assert.ok(result.coverage.every((row) => row.state === 'unavailable'));
});
test('each opportunity links directly to its own reviewed guide, with alternatives for every public source', () => {
  assert.deepEqual(Object.keys(contributionPolicies).sort(), [...GITHUB_REPOSITORIES].sort());
  const snapshot = fixture();
  for (const repo of snapshot.repositories) repo.issueDetails.open.items = [issue(repo, 1)];
  for (const row of selectFirstContributions(snapshot, time).opportunities) {
    const app = currentApps.find(({ id }) => id === row.source.appId);
    assert.ok(row.policy.guide.url.startsWith(row.source.url + '/blob/'));
    assert.ok(row.policy.documentation.startsWith(row.source.url + '/blob/'));
    if (row.policy.examples) assert.ok(row.policy.examples.startsWith(row.source.url + '/'));
    assert.match(row.policy.reviewedRef, /^[a-f0-9]{40}$/);
    assert.equal(row.policy.reviewedAt, app?.editorial.reviewedAt ?? '2026-11-07');
    assert.ok(
      row.policy.guide.label.includes('README') ||
        row.policy.guide.label === 'Guia de contribuição',
    );
    assert.ok(!row.policy.guide.url.includes('launcher-struct'));
  }
});
