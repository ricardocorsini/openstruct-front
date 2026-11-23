import test from 'node:test';
import assert from 'node:assert/strict';
import {
  developmentSources,
  developmentView,
  selectDevelopmentSources,
  githubListUrl,
} from '../src/lib/development.ts';
import {
  emptyGithubSnapshot,
  GITHUB_REPOSITORIES,
  SNAPSHOT_STALE_MS,
  validateGithubSnapshot,
} from '../src/lib/github-snapshot.ts';

const now = Date.parse('2026-11-07T18:00:00Z');
const at = new Date(now).toISOString();
function fixture() {
  const snapshot = emptyGithubSnapshot();
  snapshot.generatedAt = at;
  for (const repo of snapshot.repositories) {
    repo.visibility = 'public';
    repo.verifiedPublicAt = at;
    repo.lastSuccessAt = at;
    repo.status = 'ready';
    repo.problem = null;
    repo.summary = {
      name: repo.repository.split('/')[1],
      description: '',
      url: 'https://github.com/' + repo.repository,
      stars: 99,
      forks: 2,
      openIssuesAndPullRequests: 999,
      defaultBranch: 'master',
    };
    for (const list of Object.values(repo.lists))
      Object.assign(list, { state: 'fresh', checkedAt: at });
    repo.release = { state: 'fresh', checkedAt: at, item: null };
  }
  return snapshot;
}
function item(repo, kind, id, updatedAt = at) {
  return {
    id: String(id),
    title: 'Item ' + id,
    url:
      'https://github.com/' +
      repo.repository +
      '/' +
      (kind === 'issues' ? 'issues' : 'pull') +
      '/' +
      id,
    updatedAt,
    count: null,
  };
}

test('each public product and infrastructure source keeps its identity; private Launcher is never a source', () => {
  assert.deepEqual(
    developmentSources.map((source) => source.repository),
    [...GITHUB_REPOSITORIES],
  );
  assert.equal(
    developmentSources.find((source) => source.slug === 'armadura-struct').name,
    'ArmaduraStruct',
  );
  assert.equal(
    developmentSources.find((source) => source.slug === 'mola-struct').appRoute,
    '/apps/molastruct',
  );
  assert.ok(!developmentSources.some((source) => source.repository.includes('launcher-struct')));
  assert.equal(selectDevelopmentSources('mola-struct').length, 1);
  assert.equal(selectDevelopmentSources('geo-struct')[0]?.appRoute, '/apps/geostruct');
  assert.equal(selectDevelopmentSources('k-struct')[0]?.appRoute, '/apps/kstruct');
  for (const invalid of [null, '', 'private', 'ricardocorsini/launcher-struct'])
    assert.equal(selectDevelopmentSources(invalid).length, GITHUB_REPOSITORIES.length);
});

test('counts unique open items in the slice, not the combined GitHub counter, and separates PRs', () => {
  const snapshot = fixture();
  const [first, second] = snapshot.repositories;
  first.lists.issues.items = [
    item(first, 'issues', 1),
    item(first, 'issues', 1),
    item(first, 'issues', 2),
    item(first, 'pulls', 3),
  ];
  first.lists.pulls.items = [item(first, 'pulls', 2), item(first, 'pulls', 2)];
  second.lists.issues.items = [item(second, 'issues', 1)];
  const view = developmentView(snapshot, developmentSources, now);
  assert.equal(view.issues.count, 2); // #1 from two different repositories.
  assert.equal(view.pulls.count, 1); // #2 is a PR, never counted again as an issue.
  assert.equal(view.issues.knownSources, GITHUB_REPOSITORIES.length);
  const selected = developmentView(snapshot, selectDevelopmentSources('openstruct-front'), now);
  assert.equal(selected.issues.count, 1);
  assert.equal(selected.pulls.count, 1);
  assert.equal(selected.repositories.length, 1);
});

test('unknown data is not zero; partial failures preserve the other sources and coverage', () => {
  const snapshot = fixture();
  snapshot.repositories[0].lists.issues = {
    state: 'unavailable',
    checkedAt: null,
    items: [],
    truncated: false,
  };
  snapshot.repositories[1].lists.issues.items = [item(snapshot.repositories[1], 'issues', 4)];
  snapshot.repositories[1].lists.issues.truncated = true;
  const view = developmentView(snapshot, developmentSources, now);
  assert.equal(view.issues.count, 1);
  assert.equal(view.issues.knownSources, GITHUB_REPOSITORIES.length - 1);
  assert.equal(view.issues.unavailableSources, 1);
  assert.equal(view.issues.truncatedSources, 1);
  assert.equal(view.repositories[0].issues.state, 'unavailable');
  assert.equal(view.repositories[1].issues.state, 'fresh');
  assert.equal(view.pulls.unavailableSources, 0);
  const unknown = developmentView(null, developmentSources, now);
  assert.equal(unknown.issues.count, null);
  assert.equal(unknown.pulls.count, null);
});

test('real empty lists are zero; source errors and old checks remain distinct', () => {
  const snapshot = fixture();
  assert.equal(developmentView(snapshot, developmentSources, now).issues.count, 0);
  snapshot.repositories[0].lists.issues.state = 'stale';
  const view = developmentView(snapshot, developmentSources, now);
  assert.equal(view.issues.staleSources, 1);
  assert.equal(view.pulls.staleSources, 0);
  assert.equal(
    developmentView(snapshot, developmentSources, now + SNAPSHOT_STALE_MS + 1).pulls.staleSources,
    GITHUB_REPOSITORIES.length,
  );
  const offline = developmentView(snapshot, developmentSources, now, true);
  assert.equal(offline.pulls.staleSources, GITHUB_REPOSITORIES.length);
  assert.equal(offline.repositories[0].release.state, 'stale');
});

test('does not show cached data when the repository visibility is unconfirmed', () => {
  const snapshot = fixture();
  const repo = snapshot.repositories[0];
  repo.visibility = 'unknown';
  repo.lists.issues.items = [item(repo, 'issues', 1)];
  const view = developmentView(snapshot, developmentSources, now);
  assert.equal(view.repositories[0].entry, undefined);
  assert.equal(view.repositories[0].issues.items.length, 0);
  assert.equal(view.repositories[0].release.state, 'unavailable');
});

test('ordering uses update dates and keeps a stable order on ties, not popularity', () => {
  const snapshot = fixture();
  snapshot.repositories[0].lists.issues.items = [
    item(snapshot.repositories[0], 'issues', 4, '2026-11-07T16:00:00Z'),
  ];
  snapshot.repositories[1].lists.issues.items = [
    item(snapshot.repositories[1], 'issues', 8),
    item(snapshot.repositories[1], 'issues', 9),
  ];
  const view = developmentView(snapshot, developmentSources, now);
  assert.deepEqual(
    view.issues.items.map(({ item }) => item.id),
    ['8', '9', '4'],
  );
  for (const source of developmentSources) {
    assert.ok(githubListUrl(source, 'issues').startsWith(source.url + '/issues?'));
    assert.ok(githubListUrl(source, 'pulls').startsWith(source.url + '/pulls?'));
  }
});

test('v1 snapshots migrate without fabricating release evidence; v2 rejects foreign or unconfirmed releases', () => {
  const legacy = fixture();
  legacy.schemaVersion = 1;
  for (const repo of legacy.repositories) {
    delete repo.release;
    delete repo.issueDetails;
    delete repo.discussions;
    delete repo.releaseHistory;
    delete repo.codeRelations;
    delete repo.recentCommits;
  }
  const migrated = validateGithubSnapshot(legacy);
  assert.equal(migrated.schemaVersion, 9);
  assert.equal(migrated.repositories[0].release.state, 'unavailable');
  assert.equal(migrated.repositories[0].release.item, null);
  assert.equal(legacy.schemaVersion, 1);
  const snapshot = fixture();
  snapshot.repositories[0].release.item = {
    tag: 'v1.0.0',
    name: 'Release',
    publishedAt: at,
    url: 'https://github.com/ricardocorsini/openstruct-front/releases/tag/v1.0.0',
  };
  assert.equal(validateGithubSnapshot(snapshot), snapshot);
  const bad = structuredClone(snapshot);
  bad.repositories[0].release.item.url =
    'https://github.com/ricardocorsini/launcher-struct/releases/tag/v1.0.0';
  assert.throws(() => validateGithubSnapshot(bad));
  const hidden = emptyGithubSnapshot();
  hidden.repositories[0].release = snapshot.repositories[0].release;
  assert.throws(() => validateGithubSnapshot(hidden));
});
