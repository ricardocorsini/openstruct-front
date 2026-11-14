import { STRUCTBOT_ORIGIN } from './structbot.ts';

export type Contributor = { id: number; login: string; avatar_url: string };
export type TaskStatus =
  | 'available'
  | 'assigned'
  | 'in_progress'
  | 'in_review'
  | 'blocked'
  | 'changes_requested'
  | 'completed'
  | 'closed';
export type Priority = 'high' | 'normal' | 'low' | 'unassessed';
export type Task = {
  key: string;
  repository: string;
  system: string;
  number: number;
  title: string;
  url: string;
  kind: 'issue' | 'pull_request';
  github_state: string;
  github_assignees: string[];
  author: string | null;
  draft: boolean;
  ci_summary: string | null;
  status: TaskStatus;
  status_source: string | null;
  owner: Contributor | null;
  role: 'review' | 'implementation';
  version: number;
  priority: { level: Priority; rationale: string; origin: string | null; stale: boolean };
  delivery: { key: string; url: string; state: string } | null;
  related: {
    key: string;
    title: string;
    url: string;
    state: string;
    kind: string;
    relationship: string;
  }[];
  updated_at: string;
  observed_at: string;
  source_stale: boolean;
  reservation_stale: boolean;
  completion_source: string | null;
};
export type TaskPage = {
  items: Task[];
  total: number;
  generated_at: string;
  refresh_requested: boolean;
};
export type ContributorSession = {
  enabled: boolean;
  user: Contributor | null;
  csrf_token: string | null;
  maintainer_repositories: string[];
};
export type TaskAction =
  | 'claim'
  | 'release'
  | 'submit'
  | 'block'
  | 'resume'
  | 'request_changes'
  | 'complete'
  | 'reopen'
  | 'reassign'
  | 'priority';
export type TaskHistory = {
  id: string;
  action: string;
  actor: Contributor | null;
  created_at: string;
  data: {
    status: string;
    note: string;
    version: number;
    priority: string | null;
    priority_reason: string | null;
    completion_source: string | null;
  };
};

type Obj = Record<string, unknown>;
const obj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: Obj, ...keys: string[]) => keys.every((k) => typeof v[k] === 'string');
const nullableText = (v: unknown) => v === null || typeof v === 'string';
const strings = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string');
const natural = (v: unknown) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const isContributor = (v: unknown): v is Contributor =>
  obj(v) && natural(v.id) && text(v, 'login', 'avatar_url');
export const taskStatusLabels: Record<TaskStatus, string> = {
  available: 'Disponível',
  assigned: 'Atribuída no GitHub',
  in_progress: 'Em andamento',
  in_review: 'Aguardando revisão',
  blocked: 'Bloqueada',
  changes_requested: 'Ajustes solicitados',
  completed: 'Concluída',
  closed: 'Encerrada',
};
export const priorityLabels: Record<Priority, string> = {
  high: 'Alta',
  normal: 'Média',
  low: 'Baixa',
  unassessed: 'A avaliar',
};
export const actionLabels: Record<TaskAction, string> = {
  claim: 'Assumir tarefa',
  release: 'Liberar tarefa',
  submit: 'Enviar entrega / PR',
  block: 'Informar bloqueio',
  resume: 'Retomar trabalho',
  request_changes: 'Solicitar ajustes',
  complete: 'Concluir entrega',
  reopen: 'Reabrir no painel',
  reassign: 'Reatribuir tarefa',
  priority: 'Definir prioridade',
};
export const isTask = (v: unknown): v is Task =>
  obj(v) &&
  text(
    v,
    'key',
    'repository',
    'system',
    'title',
    'url',
    'kind',
    'role',
    'updated_at',
    'observed_at',
  ) &&
  natural(v.number) &&
  natural(v.version) &&
  ['issue', 'pull_request'].includes(String(v.kind)) &&
  ['implementation', 'review'].includes(String(v.role)) &&
  ['open', 'closed', 'merged'].includes(String(v.github_state)) &&
  Object.hasOwn(taskStatusLabels, String(v.status)) &&
  strings(v.github_assignees) &&
  nullableText(v.author) &&
  nullableText(v.status_source) &&
  nullableText(v.ci_summary) &&
  nullableText(v.completion_source) &&
  [v.draft, v.source_stale, v.reservation_stale].every((x) => typeof x === 'boolean') &&
  (v.owner === null || isContributor(v.owner)) &&
  obj(v.priority) &&
  text(v.priority, 'rationale') &&
  Object.hasOwn(priorityLabels, String(v.priority.level)) &&
  nullableText(v.priority.origin) &&
  typeof v.priority.stale === 'boolean' &&
  (v.delivery === null || (obj(v.delivery) && text(v.delivery, 'key', 'url', 'state'))) &&
  Array.isArray(v.related) &&
  v.related.every((r) => obj(r) && text(r, 'key', 'title', 'url', 'state', 'kind', 'relationship'));
export const isTaskPage = (v: unknown): v is TaskPage =>
  obj(v) &&
  Array.isArray(v.items) &&
  v.items.every(isTask) &&
  natural(v.total) &&
  text(v, 'generated_at') &&
  typeof v.refresh_requested === 'boolean';
export const isSession = (v: unknown): v is ContributorSession =>
  obj(v) &&
  typeof v.enabled === 'boolean' &&
  (v.user === null || isContributor(v.user)) &&
  nullableText(v.csrf_token) &&
  strings(v.maintainer_repositories) &&
  (v.user === null
    ? v.csrf_token === null
    : typeof v.csrf_token === 'string' && v.csrf_token.length >= 32);
export const isTaskHistory = (v: unknown): v is TaskHistory =>
  obj(v) &&
  text(v, 'id', 'action', 'created_at') &&
  (v.actor === null || isContributor(v.actor)) &&
  obj(v.data) &&
  text(v.data, 'status', 'note') &&
  natural(v.data.version);

export const LOGIN_URL = `${STRUCTBOT_ORIGIN}/api/v1/auth/github/start`;
const SESSION_URL = `${STRUCTBOT_ORIGIN}/api/v1/auth/session`;
const LOGOUT_URL = `${STRUCTBOT_ORIGIN}/api/v1/auth/logout`;
export class ContributorError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
async function checkedResponse<T>(response: Response, check: (v: unknown) => v is T): Promise<T> {
  if (!response.ok) {
    let detail: unknown;
    try {
      detail = (await response.json()).detail;
    } catch {
      /* The reverse proxy may return HTML. */
    }
    const fallback =
      response.status === 401
        ? 'Sua sessão terminou. Entre novamente com GitHub.'
        : response.status === 409
          ? 'A tarefa mudou. Confira a tabela atualizada.'
          : 'Não foi possível salvar. Confira a tabela antes de tentar novamente.';
    throw new ContributorError(typeof detail === 'string' ? detail : fallback, response.status);
  }
  const data: unknown = await response.json();
  if (!check(data))
    throw new ContributorError('Resposta incompatível com a central de tarefas.', 502);
  return data;
}
export async function readSession(signal: AbortSignal, fetcher: typeof fetch = fetch) {
  return checkedResponse(
    await fetcher(SESSION_URL, {
      signal,
      credentials: 'include',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    }),
    isSession,
  );
}
export async function sendTaskAction(
  task: Task,
  session: ContributorSession,
  action: TaskAction,
  fields: {
    note?: string;
    pull_request_url?: string;
    assignee_login?: string;
    priority?: string | null;
  },
  fetcher: typeof fetch = fetch,
): Promise<Task> {
  if (!session.user || !session.csrf_token)
    throw new ContributorError('Entre com GitHub para alterar tarefas.', 401);
  if (
    !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(task.repository) ||
    !Number.isSafeInteger(task.number) ||
    task.number < 1
  )
    throw new Error('Identificador de tarefa inválido.');
  // Never retry mutations: a network interruption can happen after the reservation was saved.
  const response = await fetcher(
    `${STRUCTBOT_ORIGIN}/api/v1/tasks/${task.repository}/${task.number}/actions`,
    {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      signal: AbortSignal.timeout(20_000),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-CSRF-Token': session.csrf_token,
      },
      body: JSON.stringify({ ...fields, action, expected_version: task.version }),
    },
  );
  return checkedResponse(response, isTask);
}
export async function logout(session: ContributorSession, fetcher: typeof fetch = fetch) {
  const response = await fetcher(LOGOUT_URL, {
    method: 'POST',
    credentials: 'include',
    signal: AbortSignal.timeout(15_000),
    headers: { 'X-CSRF-Token': session.csrf_token || '' },
  });
  if (!response.ok)
    throw new ContributorError('Não foi possível encerrar a sessão.', response.status);
}
export function availableActions(task: Task, session: ContributorSession | null): TaskAction[] {
  if (!session?.enabled || !session.user) return [];
  const maintainer = session.maintainer_repositories.includes(task.repository);
  const terminal = task.status === 'completed' || task.status === 'closed';
  if (task.github_state !== 'open') return maintainer ? ['priority'] : [];
  const owns = task.owner?.id === session.user.id;
  const actions: TaskAction[] = [];
  if (
    !task.owner &&
    !terminal &&
    !task.source_stale &&
    (task.kind !== 'pull_request' ||
      task.author?.toLowerCase() !== session.user.login.toLowerCase()) &&
    (task.kind !== 'issue' ||
      !task.github_assignees.length ||
      task.github_assignees.some((a) => a.toLowerCase() === session.user!.login.toLowerCase()))
  )
    actions.push('claim');
  if (task.owner && !terminal && (owns || maintainer)) {
    if (['in_progress', 'changes_requested', 'blocked'].includes(task.status) && !task.source_stale)
      actions.push('submit');
    if (['in_progress', 'changes_requested', 'in_review'].includes(task.status))
      actions.push('block');
    if (['blocked', 'changes_requested'].includes(task.status)) actions.push('resume');
    actions.push('release');
  }
  if (maintainer) {
    if (task.status === 'in_review' && task.owner) {
      actions.push('request_changes');
      if (!task.source_stale) actions.push('complete');
    }
    if (task.status === 'completed') actions.push('reopen');
    if (!terminal) actions.push('reassign');
    actions.push('priority');
  }
  return actions;
}
