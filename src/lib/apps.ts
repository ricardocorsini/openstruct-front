import { isCurrentApp, validateAppRegistry } from './app-registry.ts';
import type { AppEntry, CurrentApp, PlannedApp, AppPresentation } from './app-registry.ts';

const geostructSource = '6fe17367ba9bf85d8ddccc42cbba23631ae58253';
const geostructSourceUrl = `https://github.com/ricardocorsini/geo-struct/blob/${geostructSource}`;
const geostructReleaseUrl =
  'https://github.com/ricardocorsini/openstruct-catalog/releases/tag/geostruct-v0.2.0';
const geostructAssets =
  'https://github.com/ricardocorsini/openstruct-catalog/releases/download/geostruct-v0.2.0';
const kstructSource = 'ddcb851bf2cbcc51bdb1b303f91174a74b53288d';
const kstructSourceUrl = `https://github.com/ricardocorsini/k-struct/blob/${kstructSource}`;

/** Reviewed public evidence, not a live feed. See docs/CATALOGO-EDITORIAL.md. */
export const apps: AppEntry[] = [
  {
    id: 'consolostruct',
    name: 'ConsoloStruct',
    category: 'Concreto armado',
    description:
      'Cálculo de consolos curtos e muito curtos, memória de ELU e detalhamento com quadro de aço.',
    color: 'orange',
    symbol: 'corbel',
    number: '01',
    route: '/apps/consolostruct',
    previewAnchor: '#demonstracao',
    image: '/assets/consolostruct-atlas.webp',
    imageAlt: 'Atlas em gravura sustentando uma peça de pedra, ilustração do ConsoloStruct',
    stage: 'current',
    maturity: 'development',
    repository: {
      url: 'https://github.com/ricardocorsini/consolo-struct',
      branch: 'master',
      visibility: 'public',
    },
    documentation: {
      url: 'https://github.com/ricardocorsini/consolo-struct/blob/1ca7d3f057ac43de432d07ca474eb1f95bbb4e6c/docs/GUIA-DE-USO.md',
      ref: '1ca7d3f057ac43de432d07ca474eb1f95bbb4e6c',
    },
    license: {
      spdx: 'MIT',
      url: 'https://github.com/ricardocorsini/consolo-struct/blob/1ca7d3f057ac43de432d07ca474eb1f95bbb4e6c/LICENSE',
      ref: '1ca7d3f057ac43de432d07ca474eb1f95bbb4e6c',
    },
    code: {
      version: '0.6.0',
      url: 'https://github.com/ricardocorsini/consolo-struct/blob/479fcadcce28e967df26a9defa6f32ea8924792f/package.json',
      ref: '479fcadcce28e967df26a9defa6f32ea8924792f',
    },
    engine: {
      version: '0.3.0',
      policy: 'LC-ELU-2026.1',
      url: 'https://github.com/ricardocorsini/consolo-struct/blob/1ca7d3f057ac43de432d07ca474eb1f95bbb4e6c/docs/CRITERIOS-DE-CALCULO.md',
      ref: '1ca7d3f057ac43de432d07ca474eb1f95bbb4e6c',
    },
    distribution: {
      version: '0.6.0',
      sourceTag: 'v0.6.0',
      sourceCommit: '1ca7d3f057ac43de432d07ca474eb1f95bbb4e6c',
      channel: 'stable',
      publishedAt: '2026-11-06T21:32:23Z',
      releaseUrl: 'https://github.com/ricardocorsini/consolo-struct/releases/tag/v0.6.0',
      platforms: [
        {
          os: 'windows',
          arch: 'x86_64',
          format: 'exe',
          url: 'https://github.com/ricardocorsini/consolo-struct/releases/download/v0.6.0/consolostruct-0.6.0-windows-x86_64.exe',
        },
        {
          os: 'linux',
          arch: 'x86_64',
          format: 'AppImage',
          url: 'https://github.com/ricardocorsini/consolo-struct/releases/download/v0.6.0/consolostruct-0.6.0-linux-x86_64.AppImage',
        },
      ],
    },
    editorial: {
      reviewedAt: '2026-11-07',
      sources: [
        {
          kind: 'description',
          url: 'https://github.com/ricardocorsini/consolo-struct/blob/1ca7d3f057ac43de432d07ca474eb1f95bbb4e6c/README.md',
          ref: '1ca7d3f057ac43de432d07ca474eb1f95bbb4e6c',
        },
        {
          kind: 'distribution',
          url: 'https://github.com/ricardocorsini/openstruct-catalog/blob/bbddcf9a37a1f63658a34dae24dd5afb1d56cf31/catalog.signed.json',
          ref: 'bbddcf9a37a1f63658a34dae24dd5afb1d56cf31',
        },
      ],
    },
  },
  {
    id: 'molastruct',
    name: 'MolaStruct',
    category: 'Fundações',
    description:
      'Rigidez de sapatas e blocos sobre estacas, com perfil SPT, matriz 6×6 e memória de cálculo.',
    color: 'cobalt',
    symbol: 'footing',
    number: '02',
    route: '/apps/molastruct',
    previewAnchor: '#visao-geral',
    image: '/assets/molastruct-gaia.webp',
    imageAlt:
      'Figura da Terra em gravura sustentando uma mola e uma base de fundação sobre fundo cobalto',
    stage: 'current',
    maturity: 'experimental',
    repository: {
      url: 'https://github.com/ricardocorsini/mola-struct',
      branch: 'master',
      visibility: 'public',
    },
    documentation: {
      url: 'https://github.com/ricardocorsini/mola-struct/blob/5d22f0626f8feb709a8b3b8301babd9985667d01/README.md',
      ref: '5d22f0626f8feb709a8b3b8301babd9985667d01',
    },
    license: {
      spdx: 'MIT',
      url: 'https://github.com/ricardocorsini/mola-struct/blob/5d22f0626f8feb709a8b3b8301babd9985667d01/LICENSE',
      ref: '5d22f0626f8feb709a8b3b8301babd9985667d01',
    },
    code: {
      version: '0.7.0',
      url: 'https://github.com/ricardocorsini/mola-struct/blob/aeda58309ddadcd53cac16aa1625473391d8efad/package.json',
      ref: 'aeda58309ddadcd53cac16aa1625473391d8efad',
    },
    distribution: {
      version: '0.5.1',
      sourceTag: 'v0.5.1',
      sourceCommit: '5d22f0626f8feb709a8b3b8301babd9985667d01',
      channel: 'stable',
      publishedAt: '2026-11-06T20:19:19Z',
      releaseUrl: 'https://github.com/ricardocorsini/mola-struct/releases/tag/v0.5.1',
      platforms: [
        {
          os: 'windows',
          arch: 'x86_64',
          format: 'exe',
          url: 'https://github.com/ricardocorsini/mola-struct/releases/download/v0.5.1/molastruct-0.5.1-windows-x86_64.exe',
        },
        {
          os: 'linux',
          arch: 'x86_64',
          format: 'AppImage',
          url: 'https://github.com/ricardocorsini/mola-struct/releases/download/v0.5.1/molastruct-0.5.1-linux-x86_64.AppImage',
        },
      ],
    },
    editorial: {
      reviewedAt: '2026-11-07',
      sources: [
        {
          kind: 'description',
          url: 'https://github.com/ricardocorsini/mola-struct/blob/5d22f0626f8feb709a8b3b8301babd9985667d01/README.md',
          ref: '5d22f0626f8feb709a8b3b8301babd9985667d01',
        },
        {
          kind: 'distribution',
          url: 'https://github.com/ricardocorsini/openstruct-catalog/blob/bbddcf9a37a1f63658a34dae24dd5afb1d56cf31/catalog.signed.json',
          ref: 'bbddcf9a37a1f63658a34dae24dd5afb1d56cf31',
        },
      ],
    },
  },
  {
    id: 'armadurastruct',
    name: 'ArmaduraStruct',
    category: 'Detalhamento',
    description:
      'Da fôrma ao aço. Um ambiente CAD para desenhar armaduras e gerar o quadro de aço.',
    color: 'amber',
    symbol: 'frame',
    number: '03',
    route: '/apps/armadurastruct',
    previewAnchor: '#editor',
    image: '/assets/armadurastruct-hephaestus.webp',
    imageAlt: 'Hefesto em gravura trabalhando uma armadura de aço sobre fundo âmbar',
    stage: 'current',
    maturity: 'development',
    repository: {
      url: 'https://github.com/ricardocorsini/armadura-struct',
      branch: 'master',
      visibility: 'public',
    },
    documentation: {
      url: 'https://github.com/ricardocorsini/armadura-struct/blob/c25baa3b6b914670eccc58e40c87e06732d9019b/docs/GUIA.md',
      ref: 'c25baa3b6b914670eccc58e40c87e06732d9019b',
    },
    license: {
      spdx: 'GPL-3.0-or-later',
      url: 'https://github.com/ricardocorsini/armadura-struct/blob/c25baa3b6b914670eccc58e40c87e06732d9019b/LICENSE',
      ref: 'c25baa3b6b914670eccc58e40c87e06732d9019b',
    },
    code: {
      version: '0.2.0',
      url: 'https://github.com/ricardocorsini/armadura-struct/blob/2b19db198eba2ad4174b366df457521d3dc45808/package.json',
      ref: '2b19db198eba2ad4174b366df457521d3dc45808',
    },
    distribution: {
      version: '0.2.0',
      sourceTag: 'v0.2.0',
      sourceCommit: 'c25baa3b6b914670eccc58e40c87e06732d9019b',
      channel: 'stable',
      publishedAt: '2026-11-06T22:43:29Z',
      releaseUrl:
        'https://github.com/ricardocorsini/openstruct-catalog/releases/tag/armadurastruct-v0.2.0',
      platforms: [
        {
          os: 'windows',
          arch: 'x86_64',
          format: 'exe',
          url: 'https://github.com/ricardocorsini/openstruct-catalog/releases/download/armadurastruct-v0.2.0/armadurastruct-0.2.0-windows-x86_64.exe',
        },
        {
          os: 'linux',
          arch: 'x86_64',
          format: 'AppImage',
          url: 'https://github.com/ricardocorsini/openstruct-catalog/releases/download/armadurastruct-v0.2.0/armadurastruct-0.2.0-linux-x86_64.AppImage',
        },
      ],
    },
    editorial: {
      reviewedAt: '2026-11-07',
      sources: [
        {
          kind: 'description',
          url: 'https://github.com/ricardocorsini/armadura-struct/blob/c25baa3b6b914670eccc58e40c87e06732d9019b/README.md',
          ref: 'c25baa3b6b914670eccc58e40c87e06732d9019b',
        },
        {
          kind: 'distribution',
          url: 'https://github.com/ricardocorsini/openstruct-catalog/blob/bbddcf9a37a1f63658a34dae24dd5afb1d56cf31/catalog.signed.json',
          ref: 'bbddcf9a37a1f63658a34dae24dd5afb1d56cf31',
        },
      ],
    },
  },
  {
    id: 'geosptstruct',
    name: 'GeoSPT',
    category: 'Fundações',
    description:
      'Da sondagem à capacidade de carga de estacas, com Décourt–Quaresma, Aoki–Velloso e memoriais de cálculo.',
    color: 'mineral',
    symbol: 'pile',
    number: '04',
    route: '/apps/geosptstruct',
    previewAnchor: '#interface',
    image: '/assets/geosptstruct-athena.webp',
    imageAlt:
      'Atena em perfil diante de uma estaca cilíndrica de concreto em três camadas de solo, sobre fundo verde mineral',
    stage: 'current',
    maturity: 'development',
    repository: {
      url: 'https://github.com/itanervale/GEOSPT-STRUCT',
      branch: 'main',
      visibility: 'public',
    },
    documentation: {
      url: 'https://github.com/itanervale/GEOSPT-STRUCT/blob/5f5cded75e94dbce2bea90eb685deef74d1dfd1f/README.md',
      ref: '5f5cded75e94dbce2bea90eb685deef74d1dfd1f',
    },
    license: {
      spdx: null,
      url: 'https://github.com/itanervale/GEOSPT-STRUCT/blob/5f5cded75e94dbce2bea90eb685deef74d1dfd1f/README.md',
      ref: '5f5cded75e94dbce2bea90eb685deef74d1dfd1f',
    },
    code: {
      version: '2.0.7',
      url: 'https://github.com/itanervale/GEOSPT-STRUCT/blob/5f5cded75e94dbce2bea90eb685deef74d1dfd1f/package.json',
      ref: '5f5cded75e94dbce2bea90eb685deef74d1dfd1f',
    },
    distribution: {
      version: '2.0.7',
      sourceTag: 'v2.0.7',
      sourceCommit: '5f5cded75e94dbce2bea90eb685deef74d1dfd1f',
      channel: 'stable',
      publishedAt: '2026-11-10T16:56:48Z',
      releaseUrl:
        'https://github.com/ricardocorsini/openstruct-catalog/releases/tag/geosptstruct-v2.0.7',
      platforms: [
        {
          os: 'windows',
          arch: 'x86_64',
          format: 'exe',
          url: 'https://github.com/ricardocorsini/openstruct-catalog/releases/download/geosptstruct-v2.0.7/geosptstruct-2.0.7-windows-x86_64.exe',
        },
        {
          os: 'linux',
          arch: 'x86_64',
          format: 'AppImage',
          url: 'https://github.com/ricardocorsini/openstruct-catalog/releases/download/geosptstruct-v2.0.7/geosptstruct-2.0.7-linux-x86_64.AppImage',
        },
      ],
    },
    editorial: {
      reviewedAt: '2026-11-10',
      sources: [
        {
          kind: 'description',
          url: 'https://github.com/itanervale/GEOSPT-STRUCT/blob/5f5cded75e94dbce2bea90eb685deef74d1dfd1f/README.md',
          ref: '5f5cded75e94dbce2bea90eb685deef74d1dfd1f',
        },
        {
          kind: 'distribution',
          url: 'https://github.com/ricardocorsini/openstruct-catalog/blob/f3e95a4f5a65a8944fe03ba70df1fd6cde393486/catalog.signed.json',
          ref: 'f3e95a4f5a65a8944fe03ba70df1fd6cde393486',
        },
      ],
    },
  },
  {
    id: 'geostruct',
    name: 'GeoStruct',
    category: 'Geotecnia',
    description:
      'Modelagem geotécnica 2D e análise de estabilidade de taludes com Fellenius e Bishop Simplificado.',
    color: 'mineral',
    symbol: 'slope',
    number: '05',
    route: '/apps/geostruct',
    previewAnchor: '#projeto-padrao',
    image: '/assets/geostruct-hercules-v2.webp',
    imageAlt: 'Hércules em gravura sustentando uma massa de solo em camadas',
    stage: 'current',
    maturity: 'development',
    repository: {
      url: 'https://github.com/ricardocorsini/geo-struct',
      branch: 'master',
      visibility: 'public',
    },
    documentation: {
      url: `${geostructSourceUrl}/docs/GUIA-DE-USO.md`,
      ref: geostructSource,
    },
    license: {
      spdx: 'MIT',
      url: `${geostructSourceUrl}/LICENSE`,
      ref: geostructSource,
    },
    code: {
      version: '0.2.0',
      url: 'https://github.com/ricardocorsini/geo-struct/blob/de00f77b6ca924cc724c6bce818198bd08ee3aa1/package.json',
      ref: 'de00f77b6ca924cc724c6bce818198bd08ee3aa1',
    },
    distribution: {
      version: '0.2.0',
      sourceTag: 'v0.2.0',
      sourceCommit: geostructSource,
      channel: 'stable',
      publishedAt: '2026-11-18T09:59:07Z',
      releaseUrl: geostructReleaseUrl,
      platforms: [
        {
          os: 'windows',
          arch: 'x86_64',
          format: 'exe',
          url: `${geostructAssets}/geostruct-0.2.0-windows-x86_64.exe`,
        },
        {
          os: 'linux',
          arch: 'x86_64',
          format: 'AppImage',
          url: `${geostructAssets}/geostruct-0.2.0-linux-x86_64.AppImage`,
        },
      ],
    },
    editorial: {
      reviewedAt: '2026-11-18',
      sources: [
        {
          kind: 'description',
          url: `${geostructSourceUrl}/README.md`,
          ref: geostructSource,
        },
        {
          kind: 'distribution',
          url: 'https://github.com/ricardocorsini/openstruct-catalog/blob/98c6d39259e4cd04d9d2af4df5ee0113a482b31b/catalog.signed.json',
          ref: '98c6d39259e4cd04d9d2af4df5ee0113a482b31b',
        },
      ],
    },
  },
  {
    id: 'kstruct',
    name: 'KStruct',
    category: 'Análise estrutural',
    description: 'Modelagem e análise estática linear de pórticos planos e espaciais com OOFEM.',
    color: 'cobalt',
    symbol: 'frame',
    number: '06',
    route: '/apps/kstruct',
    previewAnchor: '#viga-de-referencia',
    image: '/assets/kstruct-dedalo.webp',
    imageAlt: 'Dédalo em gravura apoiado numa coluna grega, ilustração do KStruct',
    stage: 'current',
    maturity: 'experimental',
    repository: {
      url: 'https://github.com/ricardocorsini/k-struct',
      branch: 'master',
      visibility: 'public',
    },
    documentation: { url: `${kstructSourceUrl}/README.md`, ref: kstructSource },
    license: { spdx: 'MIT', url: `${kstructSourceUrl}/LICENSE`, ref: kstructSource },
    code: { version: '0.3.0', url: `${kstructSourceUrl}/package.json`, ref: kstructSource },
    editorial: {
      reviewedAt: '2026-11-23',
      sources: [{ kind: 'description', url: `${kstructSourceUrl}/README.md`, ref: kstructSource }],
    },
  },
  {
    id: 'anchorstruct',
    name: 'AnchorStruct',
    category: 'Ligações e ancoragens',
    description: 'Cálculo de chumbadores.',
    color: 'steel',
    symbol: 'anchor',
    number: '07',
    stage: 'planned',
    maturity: 'planned',
    planningStatus: 'not-started',
    page: {
      route: '/apps/anchorstruct',
      image: '/assets/app-em-breve.svg',
      imageAlt: 'Em breve — desenvolvimento não iniciado',
    },
    editorial: {
      reviewedAt: '2026-11-12',
      sources: [
        {
          kind: 'planning',
          url: 'https://github.com/ricardocorsini/openstruct-front/blob/0cc70a701fa89caf4478eef89a0a5de552c372b1/docs/PRODUTOS-PLANEJADOS.md',
          ref: '0cc70a701fa89caf4478eef89a0a5de552c372b1',
        },
      ],
    },
  },
  {
    id: 'slopestruct',
    name: 'SlopeStruct',
    category: 'Geotecnia',
    description: 'Estabilidade de taludes e contenções.',
    color: 'steel',
    symbol: 'slope',
    number: '08',
    stage: 'planned',
    maturity: 'planned',
    planningStatus: 'not-started',
    page: {
      route: '/apps/slopestruct',
      image: '/assets/app-em-breve.svg',
      imageAlt: 'Em breve — desenvolvimento não iniciado',
    },
    editorial: {
      reviewedAt: '2026-11-12',
      sources: [
        {
          kind: 'planning',
          url: 'https://github.com/ricardocorsini/openstruct-front/blob/0cc70a701fa89caf4478eef89a0a5de552c372b1/docs/PRODUTOS-PLANEJADOS.md',
          ref: '0cc70a701fa89caf4478eef89a0a5de552c372b1',
        },
      ],
    },
  },
];

validateAppRegistry(apps);

export const currentApps = apps.filter(isCurrentApp);
export const currentAppNames = new Intl.ListFormat('pt-BR').format(
  currentApps.map((app) => app.name),
);

export function getCurrentApp(id: string): CurrentApp {
  const app = currentApps.find((entry) => entry.id === id);
  if (!app) throw new Error(`Aplicativo atual não cadastrado: ${id}.`);
  return app;
}

export function getPlannedApp(id: string): PlannedApp & { page: AppPresentation } {
  const app = apps.find((entry) => entry.id === id);
  if (!app || app.stage !== 'planned' || !app.page) {
    throw new Error(`Aplicativo planejado sem página de apresentação: ${id}.`);
  }
  return { ...app, page: app.page };
}
