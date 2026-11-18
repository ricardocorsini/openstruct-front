import { developmentSources } from './development.ts';
import { SNAPSHOT_STALE_MS } from './github-snapshot.ts';
import type { GithubSnapshot, PublicIssue, PublicRepository } from './github-snapshot.ts';

type ContributionPolicy = {
  labels: readonly string[];
  guide: { url: string; label: string };
  documentation: string;
  examples?: string;
  reviewedRef: string;
  reviewedAt: string;
};
/** Eligibility rules, not a claim that these labels exist or that work is easy. */
export const contributionPolicies: Record<PublicRepository, ContributionPolicy> = {
  'ricardocorsini/openstruct-front': {
    labels: ['good first issue', 'help wanted'],
    guide: {
      url: 'https://github.com/ricardocorsini/openstruct-front/blob/master/README.md#desenvolvimento',
      label: 'Orientações no README',
    },
    documentation: 'https://github.com/ricardocorsini/openstruct-front/blob/master/README.md',
    reviewedRef: '237472ac58239e2be539c0621aab1ed83e9df6ba',
    reviewedAt: '2026-11-07',
  },
  'ricardocorsini/consolo-struct': {
    labels: ['good first issue', 'help wanted'],
    guide: {
      url: 'https://github.com/ricardocorsini/consolo-struct/blob/master/CONTRIBUTING.md',
      label: 'Guia de contribuição',
    },
    documentation:
      'https://github.com/ricardocorsini/consolo-struct/blob/master/docs/INSTALACAO.md',
    examples: 'https://github.com/ricardocorsini/consolo-struct/tree/master/examples',
    reviewedRef: '54abc400ae43a5a3bdf025df85c327dde1ad5086',
    reviewedAt: '2026-11-07',
  },
  'ricardocorsini/mola-struct': {
    labels: ['good first issue', 'help wanted'],
    guide: {
      url: 'https://github.com/ricardocorsini/mola-struct/blob/master/CONTRIBUTING.md',
      label: 'Guia de contribuição',
    },
    documentation: 'https://github.com/ricardocorsini/mola-struct/blob/master/README.md',
    examples: 'https://github.com/ricardocorsini/mola-struct/blob/master/examples/README.md',
    reviewedRef: 'aeda58309ddadcd53cac16aa1625473391d8efad',
    reviewedAt: '2026-11-07',
  },
  'ricardocorsini/armadura-struct': {
    labels: ['good first issue', 'help wanted'],
    guide: {
      url: 'https://github.com/ricardocorsini/armadura-struct/blob/master/README.md#contribuir',
      label: 'Como contribuir no README',
    },
    documentation: 'https://github.com/ricardocorsini/armadura-struct/blob/master/docs/GUIA.md',
    examples:
      'https://github.com/ricardocorsini/armadura-struct/blob/master/docs/examples/initial/README.md',
    reviewedRef: '86db6dd9c286e28a44a70afa10efede70f7127b3',
    reviewedAt: '2026-11-07',
  },
  'itanervale/GEOSPT-STRUCT': {
    labels: ['good first issue', 'help wanted'],
    guide: {
      url: 'https://github.com/itanervale/GEOSPT-STRUCT/blob/5f5cded75e94dbce2bea90eb685deef74d1dfd1f/README.md',
      label: 'Manual e testes no README',
    },
    documentation:
      'https://github.com/itanervale/GEOSPT-STRUCT/blob/5f5cded75e94dbce2bea90eb685deef74d1dfd1f/README.md',
    examples:
      'https://github.com/itanervale/GEOSPT-STRUCT/blob/5f5cded75e94dbce2bea90eb685deef74d1dfd1f/src/engine/dataset-balsas.js',
    reviewedRef: '5f5cded75e94dbce2bea90eb685deef74d1dfd1f',
    reviewedAt: '2026-11-10',
  },
  'ricardocorsini/geo-struct': {
    labels: ['good first issue', 'help wanted'],
    guide: {
      url: 'https://github.com/ricardocorsini/geo-struct/blob/6fe17367ba9bf85d8ddccc42cbba23631ae58253/CONTRIBUTING.md',
      label: 'Guia de contribuição',
    },
    documentation:
      'https://github.com/ricardocorsini/geo-struct/blob/6fe17367ba9bf85d8ddccc42cbba23631ae58253/docs/GUIA-DE-USO.md',
    examples:
      'https://github.com/ricardocorsini/geo-struct/tree/6fe17367ba9bf85d8ddccc42cbba23631ae58253/examples',
    reviewedRef: '6fe17367ba9bf85d8ddccc42cbba23631ae58253',
    reviewedAt: '2026-11-18',
  },
  'ricardocorsini/openstruct-catalog': {
    labels: ['good first issue', 'help wanted'],
    guide: {
      url: 'https://github.com/ricardocorsini/openstruct-catalog/blob/main/README.md',
      label: 'Orientações no README',
    },
    documentation: 'https://github.com/ricardocorsini/openstruct-catalog/blob/main/README.md',
    reviewedRef: 'a527a902cb35299c334e01564e83e798cd64c048',
    reviewedAt: '2026-11-07',
  },
};

export function selectFirstContributions(
  snapshot: GithubSnapshot | null | undefined,
  now: number,
  offline = false,
  policies = contributionPolicies,
) {
  const opportunities: {
    issue: PublicIssue;
    source: (typeof developmentSources)[number];
    labels: string[];
    policy: ContributionPolicy;
  }[] = [];
  const coverage = developmentSources.map((source) => {
    const repo = snapshot?.repositories.find(
      (repo) => repo.repository === source.repository && repo.visibility === 'public',
    );
    const list = repo?.issueDetails.open;
    const known = Boolean(list && list.state !== 'unavailable');
    const age = now - Date.parse(list?.checkedAt ?? '');
    const fresh = Boolean(
      known &&
      !offline &&
      list!.state === 'fresh' &&
      Number.isFinite(age) &&
      age >= 0 &&
      age <= SNAPSHOT_STALE_MS,
    );
    const policy = policies[source.repository];
    if (fresh) {
      const pullNumbers = new Set(
        repo!.lists.pulls.items.map((item) =>
          Number(item.url.slice(item.url.lastIndexOf('/') + 1)),
        ),
      );
      const seen = new Set<number>();
      for (const issue of list!.items) {
        if (
          issue.state !== 'open' ||
          !Number.isSafeInteger(issue.number) ||
          issue.number < 1 ||
          seen.has(issue.number) ||
          pullNumbers.has(issue.number) ||
          Object.hasOwn(issue, 'pull_request') ||
          issue.url !== source.url + '/issues/' + issue.number
        )
          continue;
        seen.add(issue.number);
        const labels = [
          ...new Set(issue.labels?.filter((label) => policy.labels.includes(label)) ?? []),
        ];
        if (labels.length) opportunities.push({ issue, source, labels, policy });
      }
    }
    return {
      source,
      state: !known ? ('unavailable' as const) : fresh ? ('fresh' as const) : ('stale' as const),
      checkedAt: list?.checkedAt ?? null,
      truncated: Boolean(list?.truncated),
    };
  });
  opportunities.sort(
    (a, b) =>
      (Date.parse(b.issue.updatedAt ?? '') || 0) - (Date.parse(a.issue.updatedAt ?? '') || 0) ||
      a.source.slug.localeCompare(b.source.slug) ||
      b.issue.number - a.issue.number,
  );
  return { opportunities, coverage };
}
