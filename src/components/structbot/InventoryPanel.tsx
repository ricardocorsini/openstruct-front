import { useState } from 'react';
import { Search, CircleDot, GitPullRequest } from 'lucide-react';
import { ciLabels, isCountedPage, isItem, queryPath, stateLabels } from '../../lib/structbot';
import type { Repository } from '../../lib/structbot';
import { usePublicResource } from './useStructBot';
import { DateLabel, Empty, Pager, Panel, ResourceNotice, SourceLink } from './Panel';

export function InventoryPanel({
  revision,
  repositories,
}: {
  revision: number;
  repositories: Repository[];
}) {
  const [filters, setFilters] = useState({
    kind: 'issue',
    state: 'open',
    repository: '',
    q: '',
    label: '',
    offset: 0,
  });
  const [draft, setDraft] = useState('');
  const [labelDraft, setLabelDraft] = useState('');
  const update = (values: Partial<typeof filters>) =>
    setFilters((old) => ({ ...old, ...values, offset: 0 }));
  const limit = 15;
  const resource = usePublicResource(
    queryPath('/items', { ...filters, limit }),
    isCountedPage(isItem),
    revision,
  );
  const data = resource.data;
  return (
    <Panel
      id="structbot-inventory"
      title="Na bancada de desenvolvimento"
      caption="03 / issues & pull requests"
      aside={
        <span className="sb-badge">{data ? `${data.total} resultados` : 'Inventário público'}</span>
      }
    >
      <div className="sb-tabs" role="group" aria-label="Tipo de contribuição">
        <button
          aria-pressed={filters.kind === 'issue'}
          onClick={() => update({ kind: 'issue', state: 'open' })}
        >
          <CircleDot size={16} /> Issues
        </button>
        <button
          aria-pressed={filters.kind === 'pull_request'}
          onClick={() => update({ kind: 'pull_request', state: 'open' })}
        >
          <GitPullRequest size={16} /> Pull requests
        </button>
      </div>
      <form
        className="sb-filters"
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: draft.trim(), label: labelDraft.trim() });
        }}
      >
        <label>
          Projeto
          <select
            value={filters.repository}
            onChange={(e) => update({ repository: e.target.value })}
          >
            <option value="">Todos os projetos</option>
            {repositories.map((r) => (
              <option key={r.full_name} value={r.full_name}>
                {r.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Situação
          <select value={filters.state} onChange={(e) => update({ state: e.target.value })}>
            <option value="open">Abertas</option>
            {filters.kind === 'pull_request' && <option value="merged">Integradas</option>}
            <option value="closed">
              {filters.kind === 'pull_request' ? 'Fechadas sem merge' : 'Encerradas'}
            </option>
            <option value="">Todas</option>
          </select>
        </label>
        <label className="sb-search">
          Buscar no título
          <input
            type="search"
            value={draft}
            maxLength={200}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ex.: detalhamento, revisão…"
          />
        </label>
        <label>
          Etiqueta
          <input
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            placeholder="Ex.: good first issue"
            maxLength={100}
          />
        </label>
        <button type="submit" className="sb-button">
          <Search size={16} /> Buscar
        </button>
      </form>
      {(filters.q || filters.label) && (
        <p className="sb-footnote">
          Filtro aplicado: {filters.q && `“${filters.q}”`}
          {filters.q && filters.label ? ' · ' : ''}
          {filters.label && `etiqueta “${filters.label}”`}
        </p>
      )}
      <ResourceNotice resource={resource} />
      {data &&
        (data.items.length ? (
          <div
            className="sb-table-wrap"
            tabIndex={0}
            role="region"
            aria-label="Tabela de contribuições, role horizontalmente se necessário"
          >
            <table className="sb-table">
              <thead>
                <tr>
                  <th scope="col">Contribuição</th>
                  <th scope="col">Situação</th>
                  <th scope="col">{filters.kind === 'issue' ? 'Atribuição' : 'Verificações'}</th>
                  <th scope="col">Atualização</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.key}>
                    <td>
                      <span className="sb-repo-label">
                        {item.repository.split('/').at(-1)} · #{item.number}
                      </span>
                      <SourceLink href={item.url} className="sb-item-title">
                        {item.title}
                      </SourceLink>
                      <div className="sb-labels">
                        {item.labels.map((label) => (
                          <span key={label}>{label}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={`sb-badge ${item.state === 'merged' ? 'sb-good' : ''}`}>
                        {stateLabels[item.state] || item.state}
                      </span>
                      {item.details.draft && <span className="sb-badge">Rascunho</span>}
                    </td>
                    <td>
                      {item.kind === 'issue' ? (
                        <>
                          <span>
                            {item.assignees.length
                              ? item.assignees.map((a) => `@${a}`).join(', ')
                              : 'Sem responsável atribuído'}
                          </span>
                          {item.assignees.length > 0 && (
                            <small>Atribuição não confirma trabalho iniciado.</small>
                          )}
                        </>
                      ) : (
                        <>
                          <span
                            className={`sb-badge ${item.details.ci_summary === 'passing' ? 'sb-good' : item.details.ci_summary === 'failing' || item.details.ci_summary === 'action_required' ? 'sb-warning' : ''}`}
                          >
                            {ciLabels[item.details.ci_summary || 'unknown'] || 'CI desconhecida'}
                          </span>
                          {item.state === 'open' && (
                            <small>
                              {item.details.mergeable === false
                                ? 'Conflito informado pelo GitHub'
                                : item.details.mergeable === true
                                  ? 'Sem conflito na coleta'
                                  : 'Conflitos ainda não confirmados'}
                            </small>
                          )}
                          {item.head_sha && <small>Commit {item.head_sha.slice(0, 7)}</small>}
                        </>
                      )}
                    </td>
                    <td>
                      <DateLabel value={item.updated_at} compact />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>Nenhuma contribuição encontrada com esses filtros.</Empty>
        ))}
      {data && (
        <Pager
          offset={filters.offset}
          limit={limit}
          total={data.total}
          length={data.items.length}
          loading={resource.loading}
          onChange={(offset) => setFilters((old) => ({ ...old, offset }))}
        />
      )}
      <p className="sb-footnote">
        Situações observadas na última coleta. Uma PR integrada não confirma publicação em
        instalador ou deploy.
      </p>
    </Panel>
  );
}
