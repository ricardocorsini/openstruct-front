import { emptyRecentCommits, validateRecentCommits } from './commit-contract.ts';
import type { RecentCommits } from './commit-contract.ts';
import { validateCodeRelation } from './code-relation.ts';
import type { CodeRelation } from './code-relation.ts';
import { emptyReleaseHistory, validateReleaseHistory } from './release-history-contract.ts';
import type { ReleaseHistory } from './release-history-contract.ts';
import { DISCUSSION_LIMIT, validateDiscussion } from './discussion-contract.ts';
import type { PublicDiscussion } from './discussion-contract.ts';
/** Public activity is independent of the signed installer catalog. */
export const GITHUB_REPOSITORIES = [
  'ricardocorsini/openstruct-front',
  'ricardocorsini/consolo-struct',
  'ricardocorsini/mola-struct',
  'ricardocorsini/armadura-struct',
  'itanervale/GEOSPT-STRUCT',
  'ricardocorsini/geo-struct',
  'ricardocorsini/openstruct-catalog',
] as const;
export type PublicRepository = (typeof GITHUB_REPOSITORIES)[number];
const REPOSITORIES_ADDED_AFTER_INITIAL_SNAPSHOT = new Set<PublicRepository>([
  'itanervale/GEOSPT-STRUCT',
  'ricardocorsini/geo-struct',
]);
export const ACTIVITY_KINDS = ['issues', 'pulls', 'milestones', 'contributors'] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];
export const SNAPSHOT_MAX_BYTES = 1_000_000;
export const PAGE_SIZE = 30;
export const MAX_PAGES = 2;
export const SNAPSHOT_STALE_MS = 2 * 60 * 60_000;
export const GITHUB_SNAPSHOT_URL =
  'https://raw.githubusercontent.com/ricardocorsini/openstruct-front/github-data/snapshot.json?schema=9';
export type MilestoneMetadata = {
  state: 'open' | 'closed';
  openItems: number;
  closedItems: number;
  dueOn: string | null;
  closedAt: string | null;
};
export type PullMetadata = {
  state: 'open' | 'closed';
  draft: boolean | null;
  mergeKnown: boolean;
  mergedAt: string | null;
  createdAt: string | null;
  closedAt: string | null;
  author: string | null;
  head: string | null;
  base: string | null;
};
export type ActivityItem = {
  milestone?: MilestoneMetadata;
  pull?: PullMetadata;
  id: string;
  title: string;
  url: string;
  updatedAt: string | null;
  count: number | null;
};
export type ActivityList = {
  state: 'fresh' | 'stale' | 'unavailable';
  checkedAt: string | null;
  truncated: boolean;
  items: ActivityItem[];
};
export const ISSUE_STATES = ['open', 'closed'] as const;
export type IssueState = (typeof ISSUE_STATES)[number];
export type PublicIssue = {
  number: number;
  title: string;
  state: IssueState;
  url: string;
  updatedAt: string | null;
  labels: string[] | null;
  author: { login: string; url: string | null } | null;
  comments: number | null;
};
export type IssueCollection = Omit<ActivityList, 'items'> & { items: PublicIssue[] };
export type PublicRelease = {
  tag: string;
  name: string;
  url: string;
  publishedAt: string;
};
export type ReleaseSnapshot = {
  state: 'fresh' | 'stale' | 'unavailable';
  checkedAt: string | null;
  item: PublicRelease | null;
};
export type RepositorySnapshot = {
  repository: PublicRepository;
  visibility: 'public' | 'unknown';
  verifiedPublicAt: string | null;
  lastSuccessAt: string | null;
  status: 'ready' | 'partial' | 'unavailable';
  problem: 'visibility' | 'request' | 'rate-limit' | null;
  summary: {
    name: string;
    description: string;
    url: string;
    stars: number;
    forks: number;
    openIssuesAndPullRequests: number;
    defaultBranch: string;
  } | null;
  lists: Record<ActivityKind, ActivityList>;
  release: ReleaseSnapshot;
  releaseHistory: ReleaseHistory;
  codeRelations: CodeRelation[];
  recentCommits: RecentCommits;
  issueDetails: Record<IssueState, IssueCollection>;
  discussions: PublicDiscussion[];
};
export type GithubSnapshot = {
  schemaVersion: 9;
  generatedAt: string | null;
  retryAt: string | null;
  repositories: RepositorySnapshot[];
};

export function emptyRelease(): ReleaseSnapshot {
  return { state: 'unavailable', checkedAt: null, item: null };
}
export function emptyIssueCollection(): IssueCollection {
  return { state: 'unavailable', checkedAt: null, truncated: false, items: [] };
}
export function emptyRepository(repository: PublicRepository): RepositorySnapshot {
  return {
    repository,
    visibility: 'unknown',
    verifiedPublicAt: null,
    lastSuccessAt: null,
    status: 'unavailable',
    problem: 'visibility',
    summary: null,
    release: emptyRelease(),
    releaseHistory: emptyReleaseHistory(),
    codeRelations: [],
    recentCommits: emptyRecentCommits(),
    discussions: [],
    issueDetails: { open: emptyIssueCollection(), closed: emptyIssueCollection() },
    lists: {
      issues: { state: 'unavailable', checkedAt: null, truncated: false, items: [] },
      pulls: { state: 'unavailable', checkedAt: null, truncated: false, items: [] },
      milestones: { state: 'unavailable', checkedAt: null, truncated: false, items: [] },
      contributors: { state: 'unavailable', checkedAt: null, truncated: false, items: [] },
    },
  };
}
export function emptyGithubSnapshot(): GithubSnapshot {
  return {
    schemaVersion: 9,
    generatedAt: null,
    retryAt: null,
    repositories: GITHUB_REPOSITORIES.map(emptyRepository),
  };
}
function object(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Expected object');
  const record = value as Record<string, unknown>;
  if (
    Object.keys(record).length !== keys.length ||
    Object.keys(record).some((key) => !keys.includes(key))
  )
    throw new Error('Unexpected fields');
  return record;
}
function text(value: unknown, max: number): asserts value is string {
  if (
    typeof value !== 'string' ||
    value.length > max ||
    /[\u0000-\u001f\u007f]/.test(value) ||
    /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(value)
  )
    throw new Error('Invalid public text');
}
function date(value: unknown) {
  if (
    value !== null &&
    (typeof value !== 'string' ||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value) ||
      !Number.isFinite(Date.parse(value)))
  )
    throw new Error('Invalid date');
}
function integer(value: unknown) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
    throw new Error('Invalid counter');
}
export function validateGithubSnapshot(value: unknown): GithubSnapshot {
  if (new TextEncoder().encode(JSON.stringify(value)).length > SNAPSHOT_MAX_BYTES)
    throw new Error('Snapshot too large');
  const root = object(value, ['schemaVersion', 'generatedAt', 'retryAt', 'repositories']);
  if (
    ![1, 2, 3, 4, 5, 6, 7, 8, 9].includes(root.schemaVersion as number) ||
    !Array.isArray(root.repositories) ||
    root.repositories.length > GITHUB_REPOSITORIES.length
  )
    throw new Error('Invalid snapshot');
  date(root.generatedAt);
  date(root.retryAt);
  const seen = new Set<string>();
  for (const raw of root.repositories) {
    const repo = object(raw, [
      'repository',
      'visibility',
      'verifiedPublicAt',
      'lastSuccessAt',
      'status',
      'problem',
      'summary',
      'lists',
      ...(root.schemaVersion !== 1 ? ['release'] : []),
      ...((root.schemaVersion as number) >= 7 ? ['releaseHistory'] : []),
      ...((root.schemaVersion as number) >= 8 ? ['codeRelations'] : []),
      ...(root.schemaVersion === 9 ? ['recentCommits'] : []),
      ...((root.schemaVersion as number) >= 5 ? ['discussions'] : []),
      ...((root.schemaVersion as number) >= 3 ? ['issueDetails'] : []),
    ]);
    if (
      !GITHUB_REPOSITORIES.includes(repo.repository as PublicRepository) ||
      seen.has(repo.repository as string)
    )
      throw new Error('Unauthorized or duplicate repository');
    seen.add(repo.repository as string);
    if (
      !['public', 'unknown'].includes(repo.visibility as string) ||
      !['ready', 'partial', 'unavailable'].includes(repo.status as string) ||
      ![null, 'visibility', 'request', 'rate-limit'].includes(repo.problem as null | string)
    )
      throw new Error('Invalid repository state');
    date(repo.verifiedPublicAt);
    date(repo.lastSuccessAt);
    if (
      repo.visibility === 'unknown' &&
      (repo.summary !== null ||
        repo.verifiedPublicAt !== null ||
        repo.lastSuccessAt !== null ||
        repo.status !== 'unavailable')
    )
      throw new Error('Unconfirmed visibility must not export data');
    if (
      repo.visibility === 'public' &&
      (repo.verifiedPublicAt === null || repo.summary === null || repo.status === 'unavailable')
    )
      throw new Error('Missing public evidence');
    if (repo.summary !== null) {
      const summary = object(repo.summary, [
        'name',
        'description',
        'url',
        'stars',
        'forks',
        'openIssuesAndPullRequests',
        'defaultBranch',
      ]);
      text(summary.name, 100);
      text(summary.description, 350);
      text(summary.defaultBranch, 100);
      if (summary.url !== 'https://github.com/' + repo.repository)
        throw new Error('Invalid source');
      integer(summary.stars);
      integer(summary.forks);
      integer(summary.openIssuesAndPullRequests);
    }
    if (root.schemaVersion !== 1) {
      const release = object(repo.release, ['state', 'checkedAt', 'item']);
      if (!['fresh', 'stale', 'unavailable'].includes(release.state as string))
        throw new Error('Invalid release state');
      date(release.checkedAt);
      if (release.state === 'unavailable' && (release.checkedAt !== null || release.item !== null))
        throw new Error('Unavailable release contains data');
      if (release.state !== 'unavailable' && release.checkedAt === null)
        throw new Error('Missing release check');
      if (repo.visibility !== 'public' && release.state !== 'unavailable')
        throw new Error('Unconfirmed release visibility');
      if (release.item !== null) {
        const item = object(release.item, ['tag', 'name', 'url', 'publishedAt']);
        text(item.tag, 100);
        text(item.name, 200);
        date(item.publishedAt);
        if (!item.tag || item.publishedAt === null || typeof item.url !== 'string')
          throw new Error('Incomplete release');
        const url = new URL(item.url);
        const prefix = 'https://github.com/' + repo.repository + '/releases/tag/';
        if (
          !item.url.startsWith(prefix) ||
          item.url === prefix ||
          url.href !== item.url ||
          url.search ||
          url.hash ||
          url.username ||
          url.password ||
          url.port ||
          decodeURIComponent(item.url.slice(prefix.length)) !== item.tag
        )
          throw new Error('Invalid release source');
      }
    }
    if ((root.schemaVersion as number) >= 7)
      validateReleaseHistory(
        repo.releaseHistory,
        String(repo.repository),
        repo.visibility === 'public',
      );
    if (root.schemaVersion === 9)
      validateRecentCommits(
        repo.recentCommits,
        String(repo.repository),
        repo.visibility === 'public',
      );
    if ((root.schemaVersion as number) >= 8) {
      if (!Array.isArray(repo.codeRelations) || repo.codeRelations.length > 2)
        throw new Error('Invalid relation list');
      const channels = new Set<string>();
      for (const relation of repo.codeRelations) {
        validateCodeRelation(relation, String(repo.repository), repo.visibility === 'public');
        if (channels.has(relation.channel)) throw new Error('Duplicate code channel');
        channels.add(relation.channel);
      }
    }
    if ((root.schemaVersion as number) >= 5) {
      if (
        !Array.isArray(repo.discussions) ||
        repo.discussions.length > DISCUSSION_LIMIT ||
        (repo.visibility !== 'public' && repo.discussions.length)
      )
        throw new Error('Invalid discussion coverage');
      const urls = new Set<string>();
      for (const discussion of repo.discussions) {
        validateDiscussion(discussion, String(repo.repository));
        if (urls.has(discussion.url)) throw new Error('Duplicate discussion');
        urls.add(discussion.url);
      }
    }
    const lists = object(repo.lists, [...ACTIVITY_KINDS]);
    if ((root.schemaVersion as number) >= 3) {
      const details = object(repo.issueDetails, [...ISSUE_STATES]);
      const issueNumbers = new Set<number>();
      for (const scope of ISSUE_STATES) {
        const collection = object(details[scope], ['state', 'checkedAt', 'truncated', 'items']);
        date(collection.checkedAt);
        if (
          !['fresh', 'stale', 'unavailable'].includes(collection.state as string) ||
          typeof collection.truncated !== 'boolean' ||
          !Array.isArray(collection.items) ||
          collection.items.length > PAGE_SIZE * MAX_PAGES
        )
          throw new Error('Invalid issue collection');
        if (
          collection.state === 'unavailable' &&
          (collection.checkedAt !== null || collection.items.length || collection.truncated)
        )
          throw new Error('Unavailable issue collection contains data');
        if (collection.state !== 'unavailable' && collection.checkedAt === null)
          throw new Error('Missing issue collection check');
        if (repo.visibility !== 'public' && collection.state !== 'unavailable')
          throw new Error('Unconfirmed issue visibility');
        for (const rawIssue of collection.items) {
          const issue = object(rawIssue, [
            'number',
            'title',
            'state',
            'url',
            'updatedAt',
            'labels',
            'author',
            'comments',
          ]);
          integer(issue.number);
          text(issue.title, 200);
          date(issue.updatedAt);
          if (
            issue.number === 0 ||
            issueNumbers.has(issue.number as number) ||
            issue.state !== scope ||
            issue.url !== 'https://github.com/' + repo.repository + '/issues/' + issue.number
          )
            throw new Error('Invalid or duplicate issue');
          issueNumbers.add(issue.number as number);
          if (issue.comments !== null) integer(issue.comments);
          if (issue.labels !== null) {
            if (!Array.isArray(issue.labels) || issue.labels.length > 30)
              throw new Error('Invalid issue labels');
            const labels = new Set<string>();
            for (const label of issue.labels) {
              text(label, 100);
              if (!label || labels.has(label)) throw new Error('Invalid issue label');
              labels.add(label);
            }
          }
          if (issue.author !== null) {
            const author = object(issue.author, ['login', 'url']);
            text(author.login, 50);
            if (!/^[a-z\d][a-z\d-]{0,38}(?:\[bot\])?$/i.test(author.login))
              throw new Error('Invalid public author');
            if (
              author.url !== null &&
              author.url !== 'https://github.com/' + author.login &&
              !(
                author.login.endsWith('[bot]') &&
                author.url === 'https://github.com/apps/' + author.login.slice(0, -5)
              )
            )
              throw new Error('Invalid author source');
          }
        }
      }
    }
    for (const kind of ACTIVITY_KINDS) {
      const list = object(lists[kind], ['state', 'checkedAt', 'truncated', 'items']);
      date(list.checkedAt);
      if (
        !['fresh', 'stale', 'unavailable'].includes(list.state as string) ||
        typeof list.truncated !== 'boolean' ||
        !Array.isArray(list.items) ||
        list.items.length > PAGE_SIZE * MAX_PAGES
      )
        throw new Error('Invalid list');
      if (list.state === 'unavailable' && (list.items.length || list.checkedAt !== null))
        throw new Error('Unavailable list contains data');
      if (list.state !== 'unavailable' && list.checkedAt === null) throw new Error('Missing check');
      if (repo.visibility !== 'public' && list.state !== 'unavailable')
        throw new Error('Private or unconfirmed data');
      if (repo.status === 'ready' && list.state !== 'fresh') throw new Error('Invalid ready state');
      const ids = new Set<string>();
      for (const rawItem of list.items) {
        const item = object(rawItem, [
          'id',
          'title',
          'url',
          'updatedAt',
          'count',
          ...(kind === 'milestones' && (root.schemaVersion as number) >= 6 ? ['milestone'] : []),
          ...(kind === 'pulls' &&
          rawItem &&
          typeof rawItem === 'object' &&
          Object.hasOwn(rawItem, 'pull')
            ? ['pull']
            : []),
        ]);
        if (kind === 'milestones' && (root.schemaVersion as number) >= 6) {
          const milestone = object(item.milestone, [
            'state',
            'openItems',
            'closedItems',
            'dueOn',
            'closedAt',
          ]);
          if (!['open', 'closed'].includes(String(milestone.state)))
            throw new Error('Invalid milestone state');
          integer(milestone.openItems);
          integer(milestone.closedItems);
          if (!Number.isSafeInteger(Number(milestone.openItems) + Number(milestone.closedItems)))
            throw new Error('Invalid milestone total');
          date(milestone.dueOn);
          date(milestone.closedAt);
          if (milestone.state === 'open' && milestone.closedAt !== null)
            throw new Error('Incoherent milestone state');
          if (item.count !== milestone.openItems) throw new Error('Incoherent milestone count');
        }
        if (item.pull !== undefined) {
          const pull = object(item.pull, [
            'state',
            'draft',
            'mergeKnown',
            'mergedAt',
            'createdAt',
            'closedAt',
            'author',
            'head',
            'base',
          ]);
          if (
            !['open', 'closed'].includes(String(pull.state)) ||
            ![null, true, false].includes(pull.draft as boolean | null) ||
            typeof pull.mergeKnown !== 'boolean'
          )
            throw new Error('Invalid PR state');
          for (const field of ['mergedAt', 'createdAt', 'closedAt']) date(pull[field]);
          if (
            (!pull.mergeKnown && pull.mergedAt !== null) ||
            (pull.state === 'open' && (pull.mergedAt !== null || pull.closedAt !== null))
          )
            throw new Error('Incoherent PR state');
          if (
            pull.author !== null &&
            (typeof pull.author !== 'string' ||
              !/^[a-z\d][a-z\d-]{0,38}(?:\[bot\])?$/i.test(pull.author))
          )
            throw new Error('Invalid PR author');
          for (const field of ['head', 'base']) if (pull[field] !== null) text(pull[field], 100);
        }
        text(item.id, 100);
        text(item.title, 200);
        if (!item.id || ids.has(item.id)) throw new Error('Duplicate item');
        ids.add(item.id);
        date(item.updatedAt);
        if (item.count !== null) integer(item.count);
        const prefix = 'https://github.com/' + repo.repository + '/';
        if (
          typeof item.url !== 'string' ||
          (kind === 'contributors'
            ? !/^https:\/\/github\.com\/[a-z\d](?:[a-z\d-]{0,38})(?:\[bot\])?$/i.test(item.url)
            : !item.url.startsWith(
                prefix +
                  ({ issues: 'issues/', pulls: 'pull/', milestones: 'milestone/' } as const)[kind],
              ) ||
              !/^\d+$/.test(
                item.url.slice(
                  (
                    prefix +
                    ({ issues: 'issues/', pulls: 'pull/', milestones: 'milestone/' } as const)[kind]
                  ).length,
                ),
              ))
        )
          throw new Error('Invalid item source');
      }
    }
  }
  const missing = GITHUB_REPOSITORIES.filter((repository) => !seen.has(repository));
  if (missing.some((repository) => !REPOSITORIES_ADDED_AFTER_INITIAL_SNAPSHOT.has(repository)))
    throw new Error('Missing required repository');
  const input = value as GithubSnapshot;
  const validated = missing.length
    ? { ...input, repositories: [...input.repositories, ...missing.map(emptyRepository)] }
    : input;
  if (root.schemaVersion === 9) return validated;
  // Earlier milestones were open-only and lacked closed counters/state. Unknown is not zero.
  return {
    ...validated,
    schemaVersion: 9,
    repositories: validated.repositories.map((repo) => ({
      ...repo,
      status: repo.status === 'ready' ? 'partial' : repo.status,
      discussions: (root.schemaVersion as number) >= 5 ? repo.discussions : [],
      release: root.schemaVersion === 1 ? emptyRelease() : repo.release,
      releaseHistory:
        (root.schemaVersion as number) >= 7 ? repo.releaseHistory : emptyReleaseHistory(),
      codeRelations: (root.schemaVersion as number) >= 8 ? repo.codeRelations : [],
      recentCommits: emptyRecentCommits(),
      lists: {
        ...repo.lists,
        milestones:
          (root.schemaVersion as number) >= 6
            ? repo.lists.milestones
            : emptyRepository(repo.repository).lists.milestones,
        ...((root.schemaVersion as number) < 4
          ? { pulls: emptyRepository(repo.repository).lists.pulls }
          : {}),
      },
      issueDetails:
        (root.schemaVersion as number) >= 3
          ? repo.issueDetails
          : {
              open: {
                ...repo.lists.issues,
                items: [
                  ...new Map(
                    repo.lists.issues.items.map((item) => [
                      item.url,
                      {
                        number: Number(item.url.slice(item.url.lastIndexOf('/') + 1)),
                        title: item.title,
                        url: item.url,
                        updatedAt: item.updatedAt,
                        state: 'open' as const,
                        labels: null,
                        author: null,
                        comments: null,
                      },
                    ]),
                  ).values(),
                ],
              },
              closed: emptyIssueCollection(),
            },
    })),
  };
}
