import { validateAppRegistry } from './app-registry.ts';
import type { CurrentApp, SourceReference } from './app-registry.ts';
import { apps, currentApps, getCurrentApp } from './apps.ts';
import { compareVersions } from './catalog.ts';
import { releaseVersionPattern } from './release-history-contract.ts';

export type ManualChapter = {
  slug: string;
  title: string;
  summary: string;
  order: number;
  keywords: string[];
  /** Markdown file relative to src/content/manuals. */
  source: string;
  status: 'sample' | 'published' | 'draft';
  reviewedAt: string | null;
  sources: SourceReference[];
};

export type ManualVersionRange = { min: string; max: string };
export type ManualCoverage = {
  version: string;
  sources: SourceReference[];
  /** Inclusive SemVer interval, explicitly reviewed. */
  range?: ManualVersionRange;
};

export type ManualEdition = {
  id: string;
  title: string;
  status: 'sample' | 'reviewed' | 'draft';
  reviewedAt: string | null;
  coverage: ManualCoverage | null;
  chapters: ManualChapter[];
};

export type ManualSystem = {
  id: string;
  name: string;
  summary: string;
  currentEditionId: string | null;
  editions: ManualEdition[];
} & ({ kind: 'app'; app: CurrentApp } | { kind: 'editorial' });

export const MANUAL_SYSTEM_ROUTE = ':systemId';
export const MANUAL_EDITION_ROUTE = `${MANUAL_SYSTEM_ROUTE}/:editionId`;
export const MANUAL_CHAPTER_ROUTE = `${MANUAL_EDITION_ROUTE}/:chapterSlug`;

export function manualSystemPath(systemId: string): string {
  return `/docs/${systemId}`;
}

export function manualEditionPath(systemId: string, editionId: string): string {
  return `${manualSystemPath(systemId)}/${editionId}`;
}

export function manualChapterPath(
  systemId: string,
  editionId: string,
  chapterSlug: string,
): string {
  return `${manualEditionPath(systemId, editionId)}/${chapterSlug}`;
}

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const chapterPathPattern = /^(?:[a-z0-9]+(?:-[a-z0-9]+)*\/)*[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
const commitPattern = /^[a-f0-9]{40}$/;

function requireValue(condition: unknown, field: string): asserts condition {
  if (!condition) throw new Error(`Metadados de manuais inválidos: ${field}.`);
}

function record(value: unknown, field: string): Record<string, unknown> {
  requireValue(value && typeof value === 'object' && !Array.isArray(value), field);
  return value as Record<string, unknown>;
}

function text(value: unknown, field: string): string {
  requireValue(typeof value === 'string' && value.trim().length > 0, field);
  return value;
}

function uniqueSlug(value: unknown, seen: Set<string>, field: string): string {
  const id = text(value, field);
  requireValue(
    slugPattern.test(id) && !seen.has(id),
    `${field}: identificador inválido ou duplicado`,
  );
  seen.add(id);
  return id;
}

function reviewDate(value: unknown, draft: boolean, field: string): void {
  if (value === null && draft) return;
  const date = text(value, field);
  requireValue(
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
      Number.isFinite(Date.parse(date)) &&
      new Date(date).toISOString().slice(0, 10) === date,
    field,
  );
}

export function isComparableManualVersion(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 100 &&
    releaseVersionPattern.test(value) &&
    value
      .split(/[.+-]/)
      .slice(0, 3)
      .every((part) => Number.isSafeInteger(Number(part)))
  );
}

export function isManualVersionRange(value: unknown, version: string): value is ManualVersionRange {
  if (!value || typeof value !== 'object' || !('min' in value) || !('max' in value)) return false;
  return (
    isComparableManualVersion(version) &&
    isComparableManualVersion(value.min) &&
    isComparableManualVersion(value.max) &&
    compareVersions(value.min, version) <= 0 &&
    compareVersions(version, value.max) <= 0
  );
}

function validateSources(
  value: unknown,
  field: string,
  repository?: string,
  coveredVersion?: string,
): void {
  requireValue(Array.isArray(value) && value.length > 0, field);
  for (const entry of value) {
    const source = record(entry, field);
    const ref = text(source.ref, `${field}.ref`);
    const raw = text(source.url, `${field}.url`);
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw new Error(`Metadados de manuais inválidos: ${field}.url.`);
    }
    requireValue(
      url.protocol === 'https:' && !url.username && !url.password && !url.port,
      `${field}.url`,
    );
    if (!repository) continue;

    const tagVersion = ref.startsWith('v') ? ref.slice(1) : '';
    requireValue(
      commitPattern.test(ref) || isComparableManualVersion(tagVersion),
      `${field}.ref: use SHA ou tag`,
    );
    const base = `${repository}/`;
    const fixedPath =
      url.href.startsWith(`${base}blob/${ref}/`) ||
      url.href.startsWith(`${base}tree/${ref}/`) ||
      url.href === `${base}tree/${ref}`;
    requireValue(fixedPath && !url.search && !url.hash, `${field}.url: origem ou ref`);
    requireValue(
      !tagVersion || !coveredVersion || tagVersion === coveredVersion,
      `${field}.ref: versão coberta`,
    );
  }
}

/** Validates editorial data in the content audit and when the registry loads. */
export function validateManualSystems(value: unknown): asserts value is ManualSystem[] {
  requireValue(Array.isArray(value) && value.length > 0, 'sistemas');
  const systemIds = new Set<string>();
  const chapterSources = new Set<string>();

  for (const entry of value) {
    const system = record(entry, 'sistema');
    const systemId = uniqueSlug(system.id, systemIds, 'sistema.id');
    const name = text(system.name, `${systemId}.name`);
    text(system.summary, `${systemId}.summary`);
    requireValue(system.kind === 'app' || system.kind === 'editorial', `${systemId}.kind`);
    const app = currentApps.find((candidate) => candidate.id === systemId);
    if (system.kind === 'app') {
      const appEntries = [system.app];
      validateAppRegistry(appEntries);
      const [registeredApp] = appEntries;
      requireValue(
        app &&
          name === app.name &&
          registeredApp.stage === 'current' &&
          registeredApp.id === app.id &&
          registeredApp.repository.url === app.repository.url,
        `${systemId}.app: aplicativo atual do registro`,
      );
    } else {
      requireValue(!apps.some((app) => app.id === systemId), `${systemId}.kind`);
    }
    const repository = app?.repository.url;

    requireValue(Array.isArray(system.editions), `${systemId}.editions`);
    const editionIds = new Set<string>();
    const availableEditions = new Set<string>();
    for (const entry of system.editions) {
      const edition = record(entry, `${systemId}.edition`);
      const editionId = uniqueSlug(edition.id, editionIds, `${systemId}.edition.id`);
      const scope = `${systemId}/${editionId}`;
      text(edition.title, `${scope}.title`);
      requireValue(
        edition.status === 'draft' || edition.status === 'sample' || edition.status === 'reviewed',
        `${scope}.status`,
      );
      reviewDate(edition.reviewedAt, edition.status === 'draft', `${scope}.reviewedAt`);

      if (edition.coverage !== null) {
        const coverage = record(edition.coverage, `${scope}.coverage`);
        const coveredVersion = text(coverage.version, `${scope}.coverage.version`);
        requireValue(
          repository && isComparableManualVersion(coveredVersion),
          `${scope}.coverage.version`,
        );
        if (coverage.range !== undefined) {
          requireValue(
            isManualVersionRange(coverage.range, coveredVersion),
            `${scope}.coverage.range`,
          );
        }
        validateSources(coverage.sources, `${scope}.coverage.sources`, repository, coveredVersion);
      } else {
        requireValue(!repository || edition.status !== 'reviewed', `${scope}.coverage`);
      }

      requireValue(Array.isArray(edition.chapters), `${scope}.chapters`);
      const slugs = new Set<string>();
      const orders = new Set<number>();
      let visibleChapters = 0;
      let publishedChapters = 0;
      for (const entry of edition.chapters) {
        const chapter = record(entry, `${scope}.chapter`);
        const slug = uniqueSlug(chapter.slug, slugs, `${scope}.chapter.slug`);
        const field = `${scope}/${slug}`;
        text(chapter.title, `${field}.title`);
        text(chapter.summary, `${field}.summary`);
        requireValue(
          typeof chapter.order === 'number' &&
            Number.isSafeInteger(chapter.order) &&
            chapter.order > 0 &&
            !orders.has(chapter.order),
          `${field}.order: ordem inválida ou duplicada`,
        );
        orders.add(chapter.order);
        requireValue(
          Array.isArray(chapter.keywords) && chapter.keywords.length > 0,
          `${field}.keywords`,
        );
        chapter.keywords.forEach((keyword) => text(keyword, `${field}.keywords`));
        const source = text(chapter.source, `${field}.source`);
        requireValue(
          chapterPathPattern.test(source) && !chapterSources.has(source),
          `${field}.source: arquivo inválido ou duplicado`,
        );
        chapterSources.add(source);
        requireValue(
          chapter.status === 'draft' ||
            chapter.status === 'sample' ||
            chapter.status === 'published',
          `${field}.status`,
        );
        requireValue(
          edition.status !== 'draft' || chapter.status === 'draft',
          `${field}.status: edição em elaboração`,
        );
        reviewDate(chapter.reviewedAt, chapter.status === 'draft', `${field}.reviewedAt`);
        requireValue(Array.isArray(chapter.sources), `${field}.sources`);
        if (chapter.sources.length > 0 || (repository && chapter.status !== 'draft')) {
          validateSources(chapter.sources, `${field}.sources`, repository);
        }
        if (chapter.status !== 'draft') visibleChapters++;
        if (chapter.status === 'published') publishedChapters++;
      }

      requireValue(
        edition.status !== 'sample' || visibleChapters > 0,
        `${scope}.chapters: amostra vazia`,
      );
      requireValue(
        edition.status !== 'reviewed' || publishedChapters > 0,
        `${scope}.chapters: edição sem capítulo publicado`,
      );
      if (edition.status !== 'draft') availableEditions.add(editionId);
    }

    requireValue(
      system.currentEditionId === null ||
        (typeof system.currentEditionId === 'string' &&
          availableEditions.has(system.currentEditionId)),
      `${systemId}.currentEditionId: edição vigente inexistente ou em elaboração`,
    );
  }
}

const initialReviewDate = '2026-11-11';

const rectangleAreaChapter: ManualChapter = {
  slug: 'area-retangular',
  title: 'Área de um retângulo',
  summary: 'Da fórmula à substituição numérica, com as unidades de cada grandeza.',
  order: 1,
  keywords: ['área', 'retângulo', 'base', 'altura', 'unidades', 'fórmula'],
  source: 'area-retangular.md',
  status: 'sample',
  reviewedAt: initialReviewDate,
  sources: [
    {
      ref: 'OpenStax, Prealgebra 2e, seção 9.4',
      url: 'https://openstax.org/books/prealgebra-2e/pages/9-4-use-properties-of-rectangles-triangles-and-trapezoids',
    },
  ],
};

const editorialModelChapter: ManualChapter = {
  slug: 'modelo-editorial',
  title: 'Modelo editorial de capítulo',
  summary:
    'Um exemplo de como publicar capturas, tabelas, avisos, código, fórmulas e referências cruzadas.',
  order: 2,
  keywords: ['modelo', 'autoria', 'legenda', 'glossário', 'JSON', 'matriz', 'equação'],
  source: 'modelo-editorial.md',
  status: 'sample',
  reviewedAt: initialReviewDate,
  sources: [
    ...rectangleAreaChapter.sources,
    {
      ref: 'f3f31df7e9dfa35967ceac6f26a950d80014a120',
      url: 'https://github.com/ricardocorsini/GEOSPT-STRUCT/blob/f3f31df7e9dfa35967ceac6f26a950d80014a120/public/manual.html',
    },
    {
      ref: '88ffb2e06b2e87d7270ff9e4bc40f48937b97e29',
      url: 'https://github.com/ricardocorsini/openstruct-front/blob/88ffb2e06b2e87d7270ff9e4bc40f48937b97e29/docs/CONSOLOSTRUCT-CAPTURAS.md',
    },
  ],
};

const editorialEdition: ManualEdition = {
  id: 'edicao-1',
  title: 'Edição 1',
  status: 'sample',
  reviewedAt: rectangleAreaChapter.reviewedAt,
  coverage: null,
  chapters: [rectangleAreaChapter, editorialModelChapter],
};

const editorialSystem: ManualSystem = {
  id: 'recursos-editoriais',
  kind: 'editorial',
  name: 'Recursos editoriais',
  summary: 'Amostras de como os manuais apresentam fórmulas, unidades e referências.',
  currentEditionId: editorialEdition.id,
  editions: [editorialEdition],
};

function githubSource(repository: string, ref: string, path: string): SourceReference {
  return { ref, url: `https://github.com/${repository}/blob/${ref}/${path}` };
}

const consoloRef = 'f5267af015b77741b5e31b2a1900056bf43f7740';
const consoloRepository = 'ricardocorsini/consolo-struct';
const consoloGuide = githubSource(consoloRepository, consoloRef, 'docs/GUIA-DE-USO.md');
const consoloReadme = githubSource(consoloRepository, consoloRef, 'README.md');
const consoloExample = githubSource(
  consoloRepository,
  consoloRef,
  'examples/detalhamento/consolos-detalhados.lume.json',
);
const molaGuide = githubSource(
  'ricardocorsini/mola-struct',
  '5d22f0626f8feb709a8b3b8301babd9985667d01',
  'README.md',
);
const armaduraGuide = githubSource(
  'ricardocorsini/armadura-struct',
  'c25baa3b6b914670eccc58e40c87e06732d9019b',
  'docs/GUIA.md',
);
const geoSptGuide = githubSource(
  'itanervale/GEOSPT-STRUCT',
  '5f5cded75e94dbce2bea90eb685deef74d1dfd1f',
  'README.md',
);
const geostruct = getCurrentApp('geostruct');

type InitialSampleChapter = Pick<
  ManualChapter,
  'slug' | 'title' | 'summary' | 'keywords' | 'sources'
>;

function initialSampleEdition(
  appId: string,
  coverage: ManualCoverage,
  chapters: InitialSampleChapter[],
  reviewedAt = initialReviewDate,
): ManualEdition {
  return {
    id: 'edicao-1',
    title: 'Edição 1',
    status: 'sample',
    reviewedAt,
    coverage,
    chapters: chapters.map((chapter, index) => ({
      ...chapter,
      order: index + 1,
      source: `${appId}/${chapter.slug}.md`,
      status: 'sample',
      reviewedAt,
    })),
  };
}

const appManuals: Partial<Record<string, Pick<ManualSystem, 'currentEditionId' | 'editions'>>> = {
  consolostruct: {
    currentEditionId: 'edicao-1',
    editions: [
      initialSampleEdition(
        'consolostruct',
        { version: '0.7.1', sources: [consoloGuide, consoloReadme] },
        [
          {
            slug: 'apresentacao',
            title: 'Apresentação do ConsoloStruct',
            summary: 'Escopo do cálculo local, organização do projeto e limites da versão 0.7.1.',
            keywords: ['consolo', 'ELU', 'memória', 'detalhamento', 'escopo'],
            sources: [consoloGuide, consoloReadme],
          },
          {
            slug: 'c01-modelo-memoria',
            title: 'C01: do modelo à memória de cálculo',
            summary:
              'Abra o exemplo público, confira as entradas e acompanhe o resultado da peça C01.',
            keywords: ['C01', 'primeiros passos', 'unidades', 'modelo', 'memória', 'captura'],
            sources: [consoloGuide, consoloReadme, consoloExample],
          },
        ],
      ),
    ],
  },
  molastruct: {
    currentEditionId: 'edicao-1',
    editions: [
      initialSampleEdition('molastruct', { version: '0.5.1', sources: [molaGuide] }, [
        {
          slug: 'apresentacao',
          title: 'Apresentação do MolaStruct',
          summary: 'Escopo, entradas e saídas da estimativa de rigidez na versão 0.5.1.',
          keywords: ['rigidez', 'fundação', 'sapata', 'estaca', 'SPT'],
          sources: [molaGuide],
        },
      ]),
    ],
  },
  armadurastruct: {
    currentEditionId: 'edicao-1',
    editions: [
      initialSampleEdition('armadurastruct', { version: '0.2.0', sources: [armaduraGuide] }, [
        {
          slug: 'apresentacao',
          title: 'Apresentação do ArmaduraStruct',
          summary:
            'Detalhamento, arquivos do projeto e limites de importação e exportação da versão 0.2.0.',
          keywords: ['armadura', 'CAD', 'DXF', 'DWG', 'quadro de aço'],
          sources: [armaduraGuide],
        },
      ]),
    ],
  },
  geosptstruct: {
    currentEditionId: 'edicao-1',
    editions: [
      initialSampleEdition('geosptstruct', { version: '2.0.7', sources: [geoSptGuide] }, [
        {
          slug: 'apresentacao',
          title: 'Apresentação do GeoSPT',
          summary: 'Sondagens, interpretação geotécnica e saídas da versão 2.0.7.',
          keywords: ['GeoSPT', 'sondagem', 'cotas', 'estaca', 'capacidade de carga'],
          sources: [geoSptGuide],
        },
      ]),
    ],
  },
  geostruct: {
    currentEditionId: 'edicao-1',
    editions: [
      initialSampleEdition(
        'geostruct',
        { version: '0.2.0', sources: [geostruct.documentation] },
        [
          {
            slug: 'apresentacao',
            title: 'Primeiros passos no GeoStruct',
            summary:
              'Abra o projeto padrão e compare as análises de círculo fixo e busca circular.',
            keywords: ['GeoStruct', 'talude', 'Fellenius', 'Bishop', 'busca circular'],
            sources: [geostruct.documentation],
          },
        ],
        geostruct.editorial.reviewedAt,
      ),
    ],
  },
};

export const manualSystems: ManualSystem[] = [
  ...currentApps.map((app): ManualSystem => {
    const manual = appManuals[app.id];
    return {
      id: app.id,
      kind: 'app',
      name: app.name,
      summary: app.description,
      app,
      currentEditionId: manual?.currentEditionId ?? null,
      editions: manual?.editions ?? [],
    };
  }),
  editorialSystem,
];

export function getManualSystem(id: string): ManualSystem | undefined {
  return manualSystems.find((system) => system.id === id);
}

export function publicManualEditions(system: ManualSystem): ManualEdition[] {
  return system.editions.filter((edition) => edition.status !== 'draft');
}

export function publicManualChapters(edition: ManualEdition): ManualChapter[] {
  return edition.chapters
    .filter((chapter) => chapter.status !== 'draft')
    .sort((a, b) => a.order - b.order);
}

export function publicManualPaths(systems: ManualSystem[] = manualSystems): string[] {
  return [
    '/docs',
    ...systems.flatMap((system) => [
      manualSystemPath(system.id),
      ...publicManualEditions(system).flatMap((edition) => [
        manualEditionPath(system.id, edition.id),
        ...publicManualChapters(edition).map((chapter) =>
          manualChapterPath(system.id, edition.id, chapter.slug),
        ),
      ]),
    ]),
  ];
}
