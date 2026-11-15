import { useState } from 'react';
import { Bot, ChevronDown, FileText } from 'lucide-react';
import { isPage, isReport, isReportSummary, JOURNAL_REQUEST_OPTIONS } from '../../lib/structbot';
import type { Resource } from './useStructBot';
import type { Report } from '../../lib/structbot';
import type { Finding } from '../../lib/structbot';
import { usePublicResource } from './useStructBot';
import { DateLabel, Empty, References, ResourceNotice } from './Panel';

function Findings({
  title,
  items,
  open = false,
}: {
  title: string;
  items: Finding[];
  open?: boolean;
}) {
  return (
    <details className="sb-findings" open={open}>
      <summary>
        {title}
        <span>{items.length}</span>
      </summary>
      {items.length ? (
        <ul>
          {items.map((item, index) => (
            <li key={`${item.title}-${index}`}>
              <strong>{item.title}</strong>
              {item.priority && (
                <span className={`sb-badge ${item.priority === 'high' ? 'sb-warning' : ''}`}>
                  {item.priority === 'high'
                    ? 'Prioridade alta'
                    : item.priority === 'low'
                      ? 'Prioridade baixa'
                      : 'Prioridade normal'}
                </span>
              )}
              <p>{item.description}</p>
              {item.rationale && <p className="sb-rationale">{item.rationale}</p>}
              <References keys={item.item_keys} />
              {item.evidence_ids.length > 0 && (
                <p className="sb-footnote">
                  Evidências citadas: {item.evidence_ids.join(', ')}. Consulte os registros públicos
                  abaixo.
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <Empty>Nenhum registro nesta publicação.</Empty>
      )}
    </details>
  );
}
export function ReportPanel({ revision, latest }: { revision: number; latest: Resource<Report> }) {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState('');
  const selectedReport = usePublicResource(
    selected
      ? `/reports/${encodeURIComponent(selected)}?include_sources=false`
      : '/reports/latest?include_sources=false',
    isReport,
    revision,
    expanded && Boolean(selected),
    JOURNAL_REQUEST_OPTIONS,
  );
  const history = usePublicResource(
    '/reports?limit=10&metadata_only=true',
    isPage(isReportSummary),
    revision,
    expanded,
    JOURNAL_REQUEST_OPTIONS,
  );
  const report = selected ? selectedReport : latest;
  const data = report.data;
  return (
    <details
      id="structbot-report"
      className="sb-panel sb-terminal sb-analysis"
      onToggle={(event) => setExpanded(event.currentTarget.open)}
    >
      <summary className="sb-panel-bar sb-analysis-toggle">
        <div>
          <span className="sb-panel-caption">
            <FileText size={13} aria-hidden="true" /> ANÁLISE E HISTÓRICO
          </span>
          <h2>Análise detalhada</h2>
          <p className="sb-footnote">Impedimentos, próximos passos e publicações anteriores.</p>
        </div>
        <span className="sb-analysis-control">
          {expanded ? 'Recolher' : 'Ver análise'}
          <ChevronDown size={18} className="sb-analysis-chevron" aria-hidden="true" />
        </span>
      </summary>
      {expanded && (
        <div className="sb-panel-body">
          <div className="sb-report-toolbar">
            <label>
              Publicação
              <select
                aria-label="Publicação"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                <option value="">Mais recente</option>
                {history.data?.items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {new Date(item.published_at || item.created_at).toLocaleString('pt-BR', {
                      timeZone: 'America/Fortaleza',
                    })}{' '}
                    · {item.provider === 'openai' ? 'IA' : 'Resumo automático'}
                  </option>
                ))}
              </select>
            </label>
            <span className="sb-footnote">Últimas 10 publicações</span>
          </div>
          <p className="sb-footnote sb-analysis-context">
            {selected
              ? 'Você está consultando uma publicação específica. O jornal do topo continua na edição mais recente.'
              : 'Esta análise complementa a edição do jornal. Para assumir ou conferir uma tarefa, consulte a central acima.'}
          </p>
          {history.error && <p className="sb-footnote">Histórico temporariamente indisponível.</p>}
          <ResourceNotice resource={report} />
          {!data && !report.loading && !report.error && (
            <Empty>
              Não há uma análise publicada disponível. Consulte a central de tarefas e a atividade
              dos projetos.
            </Empty>
          )}
          {data && (
            <>
              <div className="sb-report-meta">
                <span className="sb-badge">
                  <Bot size={13} />{' '}
                  {data.provider === 'openai' ? 'Análise por IA' : 'Resumo automático'}
                  {data.provider === 'openai' && data.model ? ` · ${data.model}` : ''}
                </span>
                <DateLabel value={data.published_at || data.created_at} />
              </div>
              {data.stale && (
                <p className="sb-notice sb-warning">
                  Esta análise reflete uma coleta anterior.
                  {data.source_versions_changed ? ' As fontes mudaram desde a publicação.' : ''}
                  {data.sources_stale
                    ? ' Há fontes desatualizadas ou com falha de coleta.'
                    : ''}{' '}
                  Confira a situação atual na central de tarefas acima.
                </p>
              )}
              {selected && <h3 className="sb-report-title">{data.content.title}</h3>}
              <div className="sb-analysis-findings">
                <Findings title="Pontos de atenção" items={data.content.blockers} open />
                <Findings title="Próximas ações sugeridas" items={data.content.next_actions} open />
              </div>
              {data.content.limitations.length > 0 && (
                <details className="sb-findings sb-limitations">
                  <summary>Escopo desta análise</summary>
                  <ul>
                    {data.content.limitations.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </div>
      )}
    </details>
  );
}
