import { useCallback, useEffect, useRef, useState } from 'react';
import { CircleDot, GitPullRequest, LogIn, ListTodo, Search, X } from 'lucide-react';
import { isConversation } from '../../lib/structbot-context';
import { ciLabels, isCountedPage, queryPath } from '../../lib/structbot';
import type { Repository } from '../../lib/structbot';
import {
  actionLabels,
  availableActions,
  ContributorError,
  isTaskHistory,
  isTaskPage,
  LOGIN_URL,
  logout,
  priorityLabels,
  readSession,
  sendTaskAction,
  taskStatusLabels,
} from '../../lib/structbot-tasks';
import type { ContributorSession, Task, TaskAction } from '../../lib/structbot-tasks';
import { usePublicResource } from './useStructBot';
import { DateLabel, Empty, Pager, Panel, ResourceNotice, SourceLink } from './Panel';

const emptyFilters = {
  repository: '',
  kind: '',
  status: '',
  owner: '',
  q: '',
  shortcut: '',
  offset: 0,
};
const errorText = (error: unknown) =>
  error instanceof ContributorError
    ? error.message
    : 'A conexão foi interrompida. Confira a tabela atualizada antes de tentar novamente.';
const actionLabel = (action: TaskAction, task: Task) =>
  task.kind === 'pull_request' && action === 'claim'
    ? 'Assumir revisão'
    : task.kind === 'pull_request' && action === 'submit'
      ? 'Enviar parecer'
      : actionLabels[action];

function useContributor() {
  const [session, setSession] = useState<ContributorSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((n) => n + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    readSession(AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]))
      .then((value) => {
        setSession(value);
        setError(null);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setSession(null);
          setError('Não foi possível consultar o login. A leitura da tabela continua pública.');
        }
      });
    return () => controller.abort();
  }, [tick]);
  useEffect(() => {
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [refresh]);
  return { session, error, refresh };
}

export function TasksPanel({
  revision,
  repositories,
  refresh,
}: {
  revision: number;
  repositories: Repository[];
  refresh: () => void;
}) {
  const identity = useContributor();
  const [filters, setFilters] = useState(emptyFilters);
  const [draft, setDraft] = useState('');
  const [ownerDraft, setOwnerDraft] = useState('');
  const [selected, setSelected] = useState<Task | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(() =>
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('login') === 'failed'
      ? { text: 'O login não foi concluído. Tente entrar novamente com GitHub.', error: true }
      : null,
  );
  const limit = 20;
  const resource = usePublicResource(
    queryPath('/tasks', { ...filters, limit }),
    isTaskPage,
    revision,
  );
  const update = (values: Partial<typeof filters>) =>
    setFilters((old) => ({ ...old, ...values, offset: 0 }));
  const reset = () => {
    setFilters(emptyFilters);
    setDraft('');
    setOwnerDraft('');
  };
  const act = async (
    task: Task,
    action: TaskAction,
    fields: {
      note?: string;
      pull_request_url?: string;
      assignee_login?: string;
      priority?: string | null;
    },
  ) => {
    if (!identity.session || pending) return;
    setPending(task.key);
    setNotice(null);
    try {
      const result = await sendTaskAction(task, identity.session, action, fields);
      setSelected(null);
      setNotice({
        text: `${actionLabel(action, task)}: registro confirmado. Situação: ${taskStatusLabels[result.status]}.`,
        error: false,
      });
    } catch (error) {
      setNotice({ text: errorText(error), error: true });
      if (error instanceof ContributorError && [401, 403].includes(error.status))
        identity.refresh();
      setSelected(null);
    } finally {
      setPending(null);
      refresh();
    }
  };
  const exit = async () => {
    if (!identity.session) return;
    try {
      await logout(identity.session);
      identity.refresh();
    } catch (error) {
      setNotice({ text: errorText(error), error: true });
    }
  };
  const activeFilters = Object.entries(filters).some(
    ([key, value]) => key !== 'offset' && value !== '',
  );
  return (
    <Panel
      id="structbot-tasks"
      title="Central de tarefas"
      caption="ESCOLHA ONDE CONTRIBUIR"
      aside={<ListTodo size={21} aria-hidden="true" />}
    >
      <div className="sb-task-toolbar">
        <div>
          <p>Assuma uma tarefa, acompanhe a entrega e encontre o próximo passo.</p>
          <p className="sb-footnote">
            {resource.data
              ? `${resource.data.total} ${resource.data.total === 1 ? 'tarefa' : 'tarefas'} · trabalho ativo primeiro, por prioridade`
              : 'Todos os sistemas, issues e PRs, incluindo encerrados'}
          </p>
        </div>
        <div className="sb-contributor">
          {identity.session?.user ? (
            <>
              <span>
                Conectado como <strong>@{identity.session.user.login}</strong>
              </span>
              <button className="sb-button" onClick={() => void exit()}>
                Sair
              </button>
            </>
          ) : identity.session?.enabled ? (
            <a className="sb-button sb-primary" href={LOGIN_URL}>
              <LogIn size={16} /> Entrar com GitHub
            </a>
          ) : (
            <span className="sb-footnote">
              {identity.session
                ? 'Reservas aguardando ativação do login GitHub'
                : 'Consultando login…'}
            </span>
          )}
        </div>
      </div>
      {identity.error && (
        <p className="sb-notice sb-warning" role="status">
          {identity.error} <button onClick={identity.refresh}>Tentar novamente</button>
        </p>
      )}
      {notice && (
        <p
          className={`sb-notice ${notice.error ? 'sb-warning' : 'sb-good'}`}
          role="status"
          aria-live="polite"
        >
          {notice.text}
        </p>
      )}
      <div className="sb-task-shortcuts" role="group" aria-label="Atalhos da central de tarefas">
        {[
          ['available', 'Disponíveis para contribuir'],
          ['review', 'Precisam de revisão'],
          ['blocked', 'Bloqueadas'],
        ].map(([value, label]) => (
          <button
            key={value}
            aria-pressed={filters.shortcut === value}
            onClick={() => {
              reset();
              setFilters({ ...emptyFilters, shortcut: filters.shortcut === value ? '' : value });
            }}
          >
            {label}
          </button>
        ))}
        <button
          aria-pressed={filters.owner === 'unassigned'}
          onClick={() => {
            reset();
            setFilters({
              ...emptyFilters,
              owner: filters.owner === 'unassigned' ? '' : 'unassigned',
            });
          }}
        >
          Sem responsável
        </button>
        {identity.session?.user && (
          <button
            aria-pressed={filters.owner === identity.session.user.login}
            onClick={() => {
              reset();
              setFilters({ ...emptyFilters, owner: identity.session!.user!.login });
              setOwnerDraft(identity.session!.user!.login);
            }}
          >
            Minhas tarefas
          </button>
        )}
      </div>
      <form
        className="sb-task-filters"
        onSubmit={(event) => {
          event.preventDefault();
          update({ q: draft.trim(), owner: ownerDraft.trim().replace(/^@/, '') });
        }}
      >
        <label>
          Sistema
          <select
            value={filters.repository}
            onChange={(event) => update({ repository: event.target.value })}
          >
            <option value="">Todos os sistemas</option>
            {repositories.map((repo) => (
              <option key={repo.full_name} value={repo.full_name}>
                {repo.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tipo
          <select value={filters.kind} onChange={(event) => update({ kind: event.target.value })}>
            <option value="">Issues e PRs</option>
            <option value="issue">Issues</option>
            <option value="pull_request">Pull requests</option>
          </select>
        </label>
        <label>
          Status
          <select
            value={filters.status}
            onChange={(event) => update({ status: event.target.value })}
          >
            <option value="">Todos os status</option>
            {Object.entries(taskStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Responsável
          <input
            value={ownerDraft}
            maxLength={40}
            onChange={(event) => setOwnerDraft(event.target.value)}
            placeholder="@usuário GitHub"
          />
        </label>
        <label className="sb-task-search">
          Tarefa
          <input
            type="search"
            value={draft}
            maxLength={200}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Título ou #número"
          />
        </label>
        <button className="sb-button" type="submit">
          <Search size={15} /> Buscar
        </button>
        <button
          className="sb-button"
          type="button"
          onClick={reset}
          disabled={!activeFilters && !draft && !ownerDraft}
        >
          Limpar filtros
        </button>
      </form>
      <p className="sb-footnote">
        {activeFilters
          ? `Filtros aplicados${filters.owner ? ` · responsável: ${filters.owner === 'unassigned' ? 'sem responsável' : '@' + filters.owner}` : ''}. Use “Limpar filtros” para ver tudo.`
          : 'Sem filtros: todos os sistemas e estados. Os registros são paginados.'}
      </p>
      <ResourceNotice resource={resource} />
      {resource.data?.refresh_requested && (
        <p className="sb-footnote" role="status">
          Solicitada uma nova coleta do GitHub. A tabela será atualizada quando ela terminar.
        </p>
      )}
      {resource.data &&
        (resource.data.items.length ? (
          <div
            className="sb-table-wrap"
            tabIndex={0}
            role="region"
            aria-label="Central de tarefas, role horizontalmente se necessário"
          >
            <table className="sb-table sb-task-table">
              <caption className="sr-only">
                Tarefas do OpenStruct por prioridade. Sem filtros, inclui issues e PRs abertos e
                encerrados.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Prioridade</th>
                  <th scope="col">Sistema</th>
                  <th scope="col">Tarefa</th>
                  <th scope="col">Status</th>
                  <th scope="col">Responsável</th>
                  <th scope="col">Atualização</th>
                  <th scope="col">Ações</th>
                </tr>
              </thead>
              <tbody>
                {resource.data.items.map((task) => {
                  const actions = availableActions(task, identity.session);
                  const primary = (['claim', 'resume', 'submit'] as const).find((action) =>
                    actions.includes(action),
                  );
                  return (
                    <tr
                      key={task.key}
                      className={
                        ['completed', 'closed'].includes(task.status) ? 'sb-task-terminal' : ''
                      }
                    >
                      <td>
                        <span className={`sb-priority sb-priority-${task.priority.level}`}>
                          {priorityLabels[task.priority.level]}
                        </span>
                        <details className="sb-priority-reason">
                          <summary>Motivo</summary>
                          <p>{task.priority.rationale}</p>
                          <small>
                            {task.priority.origin === 'maintainer'
                              ? 'Definida pelo mantenedor'
                              : task.priority.origin === 'openai'
                                ? 'Sugestão da IA'
                                : 'Avaliação pendente'}
                            {task.priority.stale ? ' · fontes alteradas' : ''}
                          </small>
                        </details>
                      </td>
                      <td>
                        <span className="sb-task-system">{task.system}</span>
                      </td>
                      <td>
                        <span className="sb-task-kind">
                          {task.kind === 'issue' ? (
                            <CircleDot size={14} />
                          ) : (
                            <GitPullRequest size={14} />
                          )}
                          {task.kind === 'issue' ? 'Issue' : 'PR'} #{task.number}
                        </span>
                        <SourceLink className="sb-item-title" href={task.url}>
                          {task.title}
                        </SourceLink>
                        {task.draft && <span className="sb-badge">Rascunho</span>}
                        {task.delivery && (
                          <small>
                            Entrega:{' '}
                            <SourceLink href={task.delivery.url}>
                              {task.delivery.key.split('/').at(-1)}
                            </SourceLink>
                          </small>
                        )}
                        {task.related.length > 0 && (
                          <small>{task.related.length} referência(s) relacionada(s)</small>
                        )}
                      </td>
                      <td>
                        <span
                          className={`sb-badge ${task.status === 'blocked' ? 'sb-warning' : task.status === 'completed' ? 'sb-good' : ''}`}
                        >
                          {taskStatusLabels[task.status]}
                        </span>
                        {task.kind === 'pull_request' && task.github_state === 'closed' && (
                          <small>Fechado sem integração</small>
                        )}
                        {task.kind === 'pull_request' && task.github_state === 'merged' && (
                          <small>Integrado no GitHub</small>
                        )}
                        {task.completion_source === 'maintainer' &&
                          task.github_state === 'open' && (
                            <small>Concluída no painel · GitHub aberto</small>
                          )}
                        {task.source_stale && (
                          <small className="sb-task-warning">Coleta desatualizada</small>
                        )}
                        {task.reservation_stale && (
                          <small className="sb-task-warning">Reserva sem atualização recente</small>
                        )}
                      </td>
                      <td>
                        {task.owner ? (
                          <>
                            <SourceLink href={`https://github.com/${task.owner.login}`}>
                              @{task.owner.login}
                            </SourceLink>
                            <small>
                              {task.role === 'review'
                                ? 'Revisão assumida no painel'
                                : 'Assumida no painel'}
                            </small>
                          </>
                        ) : (
                          <span>
                            {task.kind === 'pull_request'
                              ? 'Revisor não definido'
                              : task.github_assignees.length
                                ? task.github_assignees.map((login) => `@${login}`).join(', ')
                                : 'Sem responsável'}
                          </span>
                        )}
                        {task.kind === 'pull_request' && (
                          <small>Autor: {task.author ? `@${task.author}` : 'não informado'}</small>
                        )}
                        {task.owner && task.github_assignees.length > 0 && (
                          <small>
                            GitHub: {task.github_assignees.map((login) => `@${login}`).join(', ')}
                          </small>
                        )}
                      </td>
                      <td>
                        <DateLabel value={task.updated_at} compact />
                      </td>
                      <td>
                        <div className="sb-task-actions">
                          {primary && (
                            <button
                              className="sb-button sb-primary"
                              disabled={pending !== null}
                              onClick={() =>
                                primary === 'claim' || primary === 'resume'
                                  ? void act(task, primary, {})
                                  : setSelected(task)
                              }
                            >
                              {pending === task.key ? 'Salvando…' : actionLabel(primary, task)}
                            </button>
                          )}
                          <button
                            className="sb-button"
                            disabled={pending !== null}
                            onClick={() => setSelected(task)}
                          >
                            Detalhes{actions.length > 0 && !primary ? ' / ações' : ''}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>
            Nenhuma tarefa encontrada. Limpe os filtros para consultar todo o inventário.
          </Empty>
        ))}
      {resource.data && (
        <Pager
          offset={filters.offset}
          limit={limit}
          total={resource.data.total}
          length={resource.data.items.length}
          loading={resource.loading}
          onChange={(offset) => setFilters((old) => ({ ...old, offset }))}
        />
      )}
      <p className="sb-footnote">
        Reservas são confirmadas pelo servidor. Comentários não reservam tarefas. Enviar uma entrega
        coloca o trabalho em revisão; a IA não aprova nem conclui tarefas.
      </p>
      {selected && (
        <TaskDetails
          task={selected}
          session={identity.session}
          revision={revision}
          busy={pending !== null}
          close={() => setSelected(null)}
          act={act}
        />
      )}
    </Panel>
  );
}

function TaskDetails({
  task,
  session,
  revision,
  busy,
  close,
  act,
}: {
  task: Task;
  session: ContributorSession | null;
  revision: number;
  busy: boolean;
  close: () => void;
  act: (
    task: Task,
    action: TaskAction,
    fields: {
      note?: string;
      pull_request_url?: string;
      assignee_login?: string;
      priority?: string | null;
    },
  ) => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const actions = availableActions(task, session);
  const [action, setAction] = useState<TaskAction>(
    actions.includes('submit') ? 'submit' : actions[0] || 'claim',
  );
  const [note, setNote] = useState('');
  const [pr, setPr] = useState(task.delivery?.url || '');
  const [assignee, setAssignee] = useState('');
  const [priority, setPriority] = useState(
    task.priority.origin === 'maintainer' ? task.priority.level : '',
  );
  const [offset, setOffset] = useState(0);
  const conversation = usePublicResource(
    `/conversations/${task.repository}/${task.number}`,
    isConversation,
    revision,
  );
  const history = usePublicResource(
    queryPath(`/tasks/${task.repository}/${task.number}/history`, { offset, limit: 10 }),
    isCountedPage(isTaskHistory),
    revision,
  );
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  const minNote =
    ['block', 'request_changes', 'complete', 'reopen', 'reassign', 'priority'].includes(action) ||
    (action === 'submit' && task.kind === 'pull_request')
      ? 10
      : 0;
  return (
    <dialog
      ref={dialog}
      className="sb-task-dialog"
      aria-labelledby="sb-task-detail-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) close();
      }}
    >
      <div className="sb-task-dialog-heading">
        <div>
          <span className="sb-panel-caption">
            {task.system} · {task.kind === 'issue' ? 'ISSUE' : 'PR'} #{task.number}
          </span>
          <h2 id="sb-task-detail-title">{task.title}</h2>
        </div>
        <button className="sb-button" onClick={close} disabled={busy} aria-label="Fechar detalhes">
          <X size={18} />
        </button>
      </div>
      <p>
        <SourceLink href={task.url}>Abrir conversa no GitHub</SourceLink>
      </p>
      <p>
        <strong>{taskStatusLabels[task.status]}</strong> ·{' '}
        {task.owner ? `@${task.owner.login}` : 'Sem reserva no painel'}
      </p>
      <p className="sb-footnote">
        Prioridade {priorityLabels[task.priority.level]}: {task.priority.rationale}
      </p>
      {task.kind === 'pull_request' && (
        <p className="sb-footnote">
          Autor: @{task.author || 'não informado'} ·{' '}
          {ciLabels[task.ci_summary || 'unknown'] || 'CI desconhecida'}. A reserva deste item é para
          revisão.
        </p>
      )}
      {task.delivery && (
        <p>
          Entrega registrada: <SourceLink href={task.delivery.url}>{task.delivery.key}</SourceLink>
        </p>
      )}
      {task.related.length > 0 && (
        <div className="sb-task-related">
          <h3>Referências relacionadas</h3>
          <p className="sb-footnote">
            Uma referência no texto não comprova que o PR resolve integralmente a issue.
          </p>
          {task.related.map((item) => (
            <p key={item.key}>
              <SourceLink href={item.url}>
                {item.key} · {item.title}
              </SourceLink>{' '}
              ·{' '}
              {item.state === 'merged'
                ? 'Integrado'
                : item.state === 'open'
                  ? 'Aberto'
                  : 'Encerrado'}
            </p>
          ))}
        </div>
      )}
      {actions.length > 0 && (
        <form
          className="sb-task-action-form"
          onSubmit={(event) => {
            event.preventDefault();
            void act(task, action, {
              note,
              ...(action === 'submit' && task.kind === 'issue' ? { pull_request_url: pr } : {}),
              ...(action === 'reassign' ? { assignee_login: assignee.replace(/^@/, '') } : {}),
              ...(action === 'priority' ? { priority: priority || null } : {}),
            });
          }}
        >
          <h3>Atualizar trabalho</h3>
          <fieldset disabled={busy}>
            <label>
              Ação
              <select
                value={action}
                onChange={(event) => setAction(event.target.value as TaskAction)}
              >
                {actions.map((value) => (
                  <option key={value} value={value}>
                    {actionLabel(value, task)}
                  </option>
                ))}
              </select>
            </label>
            {action === 'submit' && task.kind === 'issue' && (
              <label>
                Link do pull request
                <input
                  type="url"
                  value={pr}
                  onChange={(event) => setPr(event.target.value)}
                  required
                  maxLength={2000}
                  placeholder="https://github.com/organização/projeto/pull/123"
                />
                <small>
                  O PR precisa estar coletado pelo StructBot e ser de sua autoria. Mantenedores
                  podem registrar entregas de terceiros.
                </small>
              </label>
            )}
            {action === 'reassign' && (
              <label>
                Usuário GitHub
                <input
                  value={assignee}
                  onChange={(event) => setAssignee(event.target.value)}
                  required
                  maxLength={40}
                  placeholder="@usuário"
                />
                <small>A pessoa precisa ter entrado no painel pelo menos uma vez.</small>
              </label>
            )}
            {action === 'priority' && (
              <label>
                Prioridade
                <select value={priority} onChange={(event) => setPriority(event.target.value)}>
                  <option value="">Usar avaliação da IA</option>
                  <option value="high">Alta</option>
                  <option value="normal">Média</option>
                  <option value="low">Baixa</option>
                </select>
              </label>
            )}
            <label>
              {minNote ? 'Motivo / resultado' : 'Observação (opcional)'}
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                required={minNote > 0}
                minLength={minNote}
                maxLength={2000}
                rows={3}
              />
            </label>
            <p className="sb-footnote">
              Este registro será público.{' '}
              {action === 'release'
                ? 'A reserva será liberada; atribuições existentes no GitHub continuam visíveis.'
                : action === 'submit'
                  ? 'A entrega aguardará revisão e não encerrará a issue no GitHub.'
                  : 'A ação será registrada com seu usuário GitHub.'}
            </p>
            <button type="submit" className="sb-button sb-primary">
              {busy ? 'Salvando…' : actionLabel(action, task)}
            </button>
          </fieldset>
        </form>
      )}
      {!session?.user && (
        <p className="sb-notice">
          {session?.enabled ? (
            <a href={LOGIN_URL}>Entre com GitHub para assumir ou alterar seu trabalho.</a>
          ) : (
            'O painel está disponível para consulta. Reservas dependem da ativação do login GitHub.'
          )}
        </p>
      )}
      <h3>Contexto da conversa</h3>
      <ResourceNotice resource={conversation} />
      {conversation.data?.analysis ? (
        <>
          <p>{conversation.data.analysis.content.summary}</p>
          {conversation.data.analysis.stale && (
            <p className="sb-footnote">
              Síntese de uma versão anterior. Reservas e status são os registros explícitos do
              painel.
            </p>
          )}
          {conversation.data.analysis.content.corrections.map((correction, index) => (
            <p key={index}>Ajuste discutido: {correction.description}</p>
          ))}
          {conversation.data.analysis.content.open_questions.map((question, index) => (
            <p key={index}>Questão aberta: {question.summary}</p>
          ))}
        </>
      ) : (
        conversation.data && (
          <Empty>
            A síntese da IA ainda não está disponível. Isso não impede reservas de tarefas
            disponíveis.
          </Empty>
        )
      )}
      <h3>Histórico no painel</h3>
      <ResourceNotice resource={history} />
      {history.data &&
        (history.data.items.length ? (
          <ol className="sb-task-history">
            {history.data.items.map((entry) => (
              <li key={entry.id}>
                <div>
                  <strong>
                    {actionLabels[entry.action as TaskAction] ||
                      (entry.action === 'github_sync' ? 'Atualização do GitHub' : entry.action)}
                  </strong>{' '}
                  · {entry.actor ? `@${entry.actor.login}` : 'GitHub'} ·{' '}
                  <DateLabel value={entry.created_at} compact />
                </div>
                {entry.data.note && <p>{entry.data.note}</p>}
                <small>
                  {taskStatusLabels[entry.data.status as keyof typeof taskStatusLabels] ||
                    entry.data.status}
                </small>
              </li>
            ))}
          </ol>
        ) : (
          <Empty>Ainda não houve ações nesta tarefa pelo painel.</Empty>
        ))}
      {history.data && (
        <Pager
          offset={offset}
          limit={10}
          total={history.data.total}
          length={history.data.items.length}
          loading={history.loading}
          onChange={setOffset}
        />
      )}
    </dialog>
  );
}
