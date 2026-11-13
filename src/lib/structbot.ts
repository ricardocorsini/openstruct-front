/** Public-only StructBot contract. No credentials or administrative routes belong here. */
export const STRUCTBOT_ORIGIN = 'https://api.openstruct.com.br';
export const STRUCTBOT_PUBLIC_PATH = '/structbot-api';
export const REFRESH_MS = 60_000;
export type Page<T> = { items: T[]; total?: number };
export type Repository = {
  full_name: string;
  title: string;
  synced_at: string | null;
  stale: boolean;
  sync_status: string;
  coverage: Record<string, unknown>;
};
export type Overview = {
  generated_at: string;
  repositories: Repository[];
  counts: { kind: string; state: string; count: number }[];
  workstreams: number;
};
export type BotStatus = {
  generated_at: string;
  worker_active: boolean;
  worker_last_seen: string | null;
  pending_repositories: number;
  repositories: Repository[];
};
export type Item = {
  key: string;
  repository: string;
  number: number;
  title: string;
  url: string;
  kind: 'issue' | 'pull_request';
  state: string;
  labels: string[];
  assignees: string[];
  author: string;
  updated_at: string;
  head_sha: string | null;
  details: { draft?: boolean; ci_summary?: string; mergeable?: boolean | null };
};
export type Finding = {
  title: string;
  description: string;
  item_keys: string[];
  evidence_ids: string[];
  priority?: string;
  rationale?: string;
};
export type Report = {
  id: string;
  provider: string;
  model: string | null;
  stale: boolean;
  source_versions_changed: boolean;
  sources_stale: boolean;
  created_at: string;
  published_at: string | null;
  content: {
    title: string;
    summary: string;
    community_bulletin: string;
    advances: Finding[];
    blockers: Finding[];
    next_actions: Finding[];
    limitations: string[];
  };
};
export type BotEvent = {
  id: number;
  repository: string;
  kind: string;
  title: string;
  url: string | null;
  occurred_at: string;
};
export type EventPage = { items: BotEvent[]; next_cursor: number };
export type Workstream = {
  id: string;
  repository: string;
  title: string;
  status: string;
  owner: string | null;
  item_numbers: number[];
  depends_on: string[];
  source_url: string | null;
  note: string;
  updated_at: string;
};
export type Evidence = {
  id: string;
  repository: string;
  item_number: number | null;
  kind: string;
  author: string;
  summary: string;
  source_url: string;
  observed_at: string;
  stale: boolean;
};
export type Recommendation = {
  id: string;
  report_id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  item_keys: string[];
  updated_at: string;
};
export type Release = {
  id: string;
  repository: string;
  tag: string;
  title: string;
  url: string;
  prerelease: boolean;
  published_at: string | null;
};

// Validate the fields consumed by the UI, tolerate additive API fields.
type ObjectValue = Record<string, unknown>;
const object = (v: unknown): v is ObjectValue => !!v && typeof v === 'object' && !Array.isArray(v);
const strings = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string');
const textFields = (v: ObjectValue, ...keys: string[]) =>
  keys.every((k) => typeof v[k] === 'string');
const nullableText = (v: unknown) => v === null || typeof v === 'string';
const boolFields = (v: ObjectValue, ...keys: string[]) =>
  keys.every((k) => typeof v[k] === 'boolean');
const natural = (v: unknown): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const arrayOf = <T>(v: unknown, check: (v: unknown) => v is T): v is T[] =>
  Array.isArray(v) && v.every(check);
const isRepository = (v: unknown): v is Repository =>
  object(v) &&
  textFields(v, 'full_name', 'title', 'sync_status') &&
  nullableText(v.synced_at) &&
  boolFields(v, 'stale') &&
  object(v.coverage);
const isFinding = (v: unknown): v is Finding =>
  object(v) &&
  textFields(v, 'title', 'description') &&
  strings(v.item_keys) &&
  strings(v.evidence_ids) &&
  (v.priority === undefined || typeof v.priority === 'string') &&
  (v.rationale === undefined || typeof v.rationale === 'string');
export const isReport = (v: unknown): v is Report =>
  object(v) &&
  textFields(v, 'id', 'provider', 'created_at') &&
  nullableText(v.model) &&
  nullableText(v.published_at) &&
  boolFields(v, 'stale', 'source_versions_changed', 'sources_stale') &&
  object(v.content) &&
  textFields(v.content, 'title', 'summary', 'community_bulletin') &&
  strings(v.content.limitations) &&
  ['advances', 'blockers', 'next_actions'].every((k) =>
    arrayOf(v.content && (v.content as ObjectValue)[k], isFinding),
  );
export const isItem = (v: unknown): v is Item =>
  object(v) &&
  textFields(v, 'key', 'repository', 'title', 'url', 'author', 'state', 'updated_at') &&
  ['issue', 'pull_request'].includes(String(v.kind)) &&
  natural(v.number) &&
  strings(v.labels) &&
  strings(v.assignees) &&
  nullableText(v.head_sha) &&
  object(v.details);
export const isEvent = (v: unknown): v is BotEvent =>
  object(v) &&
  natural(v.id) &&
  textFields(v, 'repository', 'kind', 'title', 'occurred_at') &&
  nullableText(v.url);
export const isOverview = (v: unknown): v is Overview =>
  object(v) &&
  textFields(v, 'generated_at') &&
  natural(v.workstreams) &&
  arrayOf(v.repositories, isRepository) &&
  Array.isArray(v.counts) &&
  v.counts.every((c) => object(c) && textFields(c, 'kind', 'state') && natural(c.count));
export const isStatus = (v: unknown): v is BotStatus =>
  object(v) &&
  textFields(v, 'generated_at') &&
  boolFields(v, 'worker_active') &&
  nullableText(v.worker_last_seen) &&
  natural(v.pending_repositories) &&
  arrayOf(v.repositories, isRepository);
export const isWorkstream = (v: unknown): v is Workstream =>
  object(v) &&
  textFields(v, 'id', 'repository', 'title', 'status', 'note', 'updated_at') &&
  nullableText(v.owner) &&
  nullableText(v.source_url) &&
  Array.isArray(v.item_numbers) &&
  v.item_numbers.every(natural) &&
  strings(v.depends_on);
export const isEvidence = (v: unknown): v is Evidence =>
  object(v) &&
  textFields(v, 'id', 'repository', 'kind', 'author', 'summary', 'source_url', 'observed_at') &&
  (v.item_number === null || natural(v.item_number)) &&
  boolFields(v, 'stale');
export const isRecommendation = (v: unknown): v is Recommendation =>
  object(v) &&
  textFields(v, 'id', 'report_id', 'title', 'description', 'priority', 'status', 'updated_at') &&
  strings(v.item_keys);
export const isRelease = (v: unknown): v is Release =>
  object(v) &&
  textFields(v, 'id', 'repository', 'tag', 'title', 'url') &&
  nullableText(v.published_at) &&
  boolFields(v, 'prerelease');
export const isPage =
  <T>(check: (v: unknown) => v is T) =>
  (v: unknown): v is Page<T> =>
    object(v) && arrayOf(v.items, check) && (v.total === undefined || natural(v.total));
export const isCountedPage =
  <T>(check: (v: unknown) => v is T) =>
  (v: unknown): v is Page<T> =>
    isPage(check)(v) && natural(v.total);
export const isEventPage = (v: unknown): v is EventPage =>
  object(v) && arrayOf(v.items, isEvent) && natural(v.next_cursor);

export function publicUrl(path: string): string {
  // Only relative public resources, never arbitrary origins or admin routes.
  if (!/^\/[a-z][a-z0-9/-]*(?:\?[^#]*)?$/.test(path) || path.includes('..'))
    throw new Error('Rota pública inválida.');
  return `${STRUCTBOT_PUBLIC_PATH}${path}`;
}
export function queryPath(path: string, query: Record<string, string | number>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query))
    if (value !== '') params.set(key, String(value));
  return `${path}?${params}`;
}
export async function readPublic<T>(
  path: string,
  check: (v: unknown) => v is T,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<T | null> {
  const response = await fetcher(publicUrl(path), {
    signal,
    credentials: 'omit',
    headers: { Accept: 'application/json' },
  });
  if (response.status === 404 && path === '/reports/latest') return null;
  if (!response.ok) throw new Error(`Consulta indisponível (HTTP ${response.status}).`);
  const value: unknown = await response.json();
  if (!check(value))
    throw new Error('Resposta incompatível com o painel. Tente atualizar em instantes.');
  return value;
}
export function safeSourceUrl(value: string | null | undefined): string | undefined {
  try {
    const url = new URL(value || '');
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined;
  } catch {
    return undefined;
  }
}
export function itemSource(key: string): string | undefined {
  const match = /^([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)#([1-9]\d*)$/.exec(key);
  return match ? `https://github.com/${match[1]}/issues/${match[2]}` : undefined;
}
export function countOf(overview: Overview | null, kind: string, state: string): number | null {
  return overview
    ? (overview.counts.find((c) => c.kind === kind && c.state === state)?.count ?? 0)
    : null;
}
export function mergeEvents(previous: BotEvent[], incoming: BotEvent[], limit = 60): BotEvent[] {
  return [...new Map([...previous, ...incoming].map((e) => [e.id, e])).values()]
    .sort((a, b) => b.id - a.id)
    .slice(0, limit);
}
export function botDate(value: string | null | undefined, compact = false): string {
  if (!value || Number.isNaN(Date.parse(value))) return 'Ainda não informado';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Fortaleza',
    day: '2-digit',
    month: '2-digit',
    ...(compact ? {} : { year: 'numeric' }),
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
export const ciLabels: Record<string, string> = {
  passing: 'CI passou',
  failing: 'CI falhou',
  pending: 'CI em execução',
  action_required: 'CI requer ação',
  not_reported: 'CI não informada',
  unknown: 'CI desconhecida',
};
export const stateLabels: Record<string, string> = {
  open: 'Aberta',
  closed: 'Encerrada',
  merged: 'Integrada',
  available: 'Disponível',
  claimed: 'Assumida',
  in_progress: 'Em andamento',
  blocked: 'Bloqueada',
  in_review: 'Em revisão',
  integrated: 'Integrada',
  released: 'Publicada',
  proposed: 'Proposta',
  addressed: 'Atendida',
  obsolete: 'Obsoleta',
};
export const eventLabels: Record<string, string> = {
  'issue.created': 'issue / registrada',
  'issue.updated': 'issue / atualizada',
  'issue.closed': 'issue / encerrada',
  'pull_request.created': 'PR / registrada',
  'pull_request.updated': 'PR / atualizada',
  'pull_request.merged': 'PR / integrada',
  'pull_request.closed': 'PR / encerrada',
  'release.published': 'release / publicada',
};
