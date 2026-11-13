import { useState } from 'react';
import { Bot, FileText } from 'lucide-react';
import { isPage, isReport } from '../../lib/structbot';
import type { Finding } from '../../lib/structbot';
import { usePublicResource } from './useStructBot';
import { DateLabel, Empty, Panel, References, ResourceNotice } from './Panel';

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
export function ReportPanel({ revision }: { revision: number }) {
  const [selected, setSelected] = useState('');
  const report = usePublicResource(
    selected ? `/reports/${encodeURIComponent(selected)}` : '/reports/latest',
    isReport,
    revision,
  );
  const history = usePublicResource('/reports?limit=10', isPage(isReport), revision);
  const data = report.data;
  return (
    <Panel
      id="structbot-report"
      title="O que está acontecendo"
      caption="01 / boletim do StructBot"
      terminal
      aside={<FileText size={20} aria-hidden="true" />}
    >
      <div className="sb-report-toolbar">
        <label>
          Publicação
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
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
      {history.error && <p className="sb-footnote">Histórico temporariamente indisponível.</p>}
      <ResourceNotice resource={report} />
      {!data && !report.loading && !report.error && (
        <Empty>
          O primeiro boletim ainda não foi publicado. O inventário e a atividade continuam
          disponíveis nas outras seções.
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
              Este boletim reflete uma coleta anterior.
              {data.source_versions_changed ? ' As fontes mudaram desde a publicação.' : ''}
              {data.sources_stale ? ' Há fontes desatualizadas ou com falha de coleta.' : ''}{' '}
              Consulte o inventário atual abaixo.
            </p>
          )}
          <h3 className="sb-report-title">{data.content.title}</h3>
          <p className="sb-report-summary">{data.content.summary}</p>
          <div className="sb-bulletin">
            <span className="sb-panel-caption">PARA A COMUNIDADE</span>
            <p>{data.content.community_bulletin}</p>
          </div>
          <Findings title="Pontos de atenção" items={data.content.blockers} open />
          <Findings title="Próximas ações sugeridas" items={data.content.next_actions} open />
          <Findings title="Avanços registrados" items={data.content.advances} />
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
    </Panel>
  );
}
