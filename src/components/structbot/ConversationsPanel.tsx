import { useState } from 'react';
import { MessagesSquare, Users } from 'lucide-react';
import { isCountedPage, queryPath } from '../../lib/structbot';
import {
  certaintyLabels,
  collectionLabels,
  interpretationLabels,
  isConversation,
  roleLabels,
} from '../../lib/structbot-context';
import type {
  Citation,
  Conversation,
  ConversationAnalysis,
  Discussion,
} from '../../lib/structbot-context';
import { usePublicResource } from './useStructBot';
import { DateLabel, Empty, Pager, Panel, ResourceNotice, SourceLink } from './Panel';
import type { Repository } from '../../lib/structbot';

function Citations({ entries, analysis }: { entries: Citation[]; analysis: ConversationAnalysis }) {
  return (
    <details className="sb-conversation-citations">
      <summary>Ver fontes ({entries.length})</summary>
      {entries.map((citation, index) => {
        const source = analysis.sources[citation.message_id];
        return (
          <blockquote key={`${citation.message_id}-${index}`}>
            <p>{citation.quote}</p>
            <SourceLink href={source?.url}>
              {source?.author ? `@${source.author}` : 'Fonte no GitHub'}
              {source?.created_at
                ? ` · ${new Date(source.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Fortaleza' })}`
                : ''}
            </SourceLink>
          </blockquote>
        );
      })}
    </details>
  );
}
function Discussions({
  title,
  entries,
  analysis,
}: {
  title: string;
  entries: Discussion[];
  analysis: ConversationAnalysis;
}) {
  if (!entries.length) return null;
  return (
    <div className="sb-conversation-topics">
      <h4>{title}</h4>
      {entries.map((entry, index) => (
        <div key={index}>
          <div className="sb-row">
            <strong>{entry.topic}</strong>
            <span className="sb-badge">{interpretationLabels[entry.state] || entry.state}</span>
          </div>
          <p>{entry.summary}</p>
          <Citations entries={entry.evidence} analysis={analysis} />
        </div>
      ))}
    </div>
  );
}
export function ConversationCard({ item }: { item: Conversation }) {
  const analysis = item.analysis;
  return (
    <article key={item.item_key} className="sb-conversation-card">
      <div className="sb-row">
        <span className="sb-repo-label">
          {item.repository.split('/').at(-1)} · #{item.number}
        </span>
        <span className={`sb-badge ${analysis?.stale ? 'sb-warning' : ''}`}>
          {collectionLabels[item.analysis_state] || item.analysis_state}
        </span>
      </div>
      <h3>
        <SourceLink href={item.url}>{item.title}</SourceLink>
      </h3>
      <div className="sb-conversation-meta">
        <span>{item.collection.message_count} mensagens coletadas</span>
        <DateLabel value={item.collection.collected_at} compact />
      </div>
      {analysis ? (
        <>
          <div className="sb-row">
            <span className="sb-badge">
              {interpretationLabels[analysis.content.state] || analysis.content.state}
            </span>
            <span className="sb-badge">
              {certaintyLabels[analysis.content.certainty] || analysis.content.certainty}
            </span>
          </div>
          <p className="sb-conversation-summary">{analysis.content.summary}</p>
          {analysis.stale && (
            <p className="sb-footnote sb-warning">
              Há fontes alteradas, antigas ou incompletas nesta interpretação. Confira a conversa no
              GitHub.
            </p>
          )}
          {analysis.origin === 'maintainer' && (
            <p className="sb-footnote">
              Correção de {analysis.author}: {analysis.reason}
            </p>
          )}
          {analysis.content.participants.length > 0 ? (
            <ul className="sb-participants">
              {analysis.content.participants.map((person, index) => (
                <li key={`${person.login}-${person.role}-${index}`}>
                  <div className="sb-row">
                    <SourceLink href={`https://github.com/${encodeURIComponent(person.login)}`}>
                      <Users size={13} /> @{person.login}
                    </SourceLink>
                    <span>{roleLabels[person.role] || person.role}</span>
                  </div>
                  <p>{person.scope}</p>
                  <div className="sb-row">
                    <span className="sb-badge">
                      {interpretationLabels[person.state] || person.state}
                    </span>
                    <span className="sb-footnote">
                      {certaintyLabels[person.certainty] || person.certainty}
                    </span>
                  </div>
                  <Citations entries={person.evidence} analysis={analysis} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="sb-footnote">Nenhum responsável identificado nesta interpretação.</p>
          )}
          <Discussions
            title="Discussões e decisões"
            entries={analysis.content.discussions}
            analysis={analysis}
          />
          {analysis.content.corrections.length > 0 && (
            <div className="sb-conversation-topics">
              <h4>Correções e ajustes</h4>
              {analysis.content.corrections.map((entry, index) => (
                <div key={index}>
                  <span className="sb-badge">
                    {interpretationLabels[entry.state] || entry.state}
                  </span>
                  <p>{entry.description}</p>
                  <Citations entries={entry.evidence} analysis={analysis} />
                </div>
              ))}
            </div>
          )}
          <Discussions
            title="Questões em aberto"
            entries={analysis.content.open_questions}
            analysis={analysis}
          />
          <details className="sb-conversation-citations">
            <summary>Escopo da interpretação</summary>
            <Citations entries={analysis.content.evidence} analysis={analysis} />
            {analysis.content.limitations.map((line, index) => (
              <p key={index}>{line}</p>
            ))}
            <span className="sb-footnote">
              {analysis.origin === 'maintainer'
                ? 'Revisão do mantenedor'
                : `Análise por IA${analysis.model ? ` · ${analysis.model}` : ''}`}{' '}
              · <DateLabel value={analysis.created_at} compact />
            </span>
          </details>
        </>
      ) : (
        <Empty>
          {item.analysis_state === 'disabled'
            ? 'A conversa poderá ser interpretada quando a IA estiver habilitada no backend.'
            : item.analysis_state === 'context_too_large'
              ? 'O conteúdo completo excede o limite configurado. A conversa não foi interpretada parcialmente.'
              : item.analysis_state === 'collection_incomplete'
                ? 'A coleta dos comentários precisa ser concluída antes da interpretação.'
                : 'A interpretação desta conversa está na fila de acompanhamento.'}
        </Empty>
      )}
      <p className="sb-official-assignees">
        Atribuição no GitHub:{' '}
        {item.assignees.length
          ? item.assignees.map((login) => `@${login}`).join(', ')
          : 'sem responsável atribuído'}
      </p>
    </article>
  );
}

export function ConversationsPanel({
  revision,
  repositories,
}: {
  revision: number;
  repositories: Repository[];
}) {
  const [filters, setFilters] = useState({ repository: '', state: 'open', offset: 0 });
  const limit = 6;
  const resource = usePublicResource(
    queryPath('/conversations', { ...filters, limit }),
    isCountedPage(isConversation),
    revision,
  );
  const data = resource.data;
  return (
    <Panel
      id="structbot-conversations"
      title="Conversas e responsáveis"
      caption="INTERPRETAÇÃO DO DESENVOLVIMENTO"
      aside={<MessagesSquare size={20} aria-hidden="true" />}
    >
      <p className="sb-conversation-intro">
        Quem assumiu cada parte, o que está em discussão e quais ajustes foram combinados — com as
        mensagens que sustentam esse entendimento.
      </p>
      <div className="sb-conversation-filters">
        <label>
          Projeto
          <select
            value={filters.repository}
            onChange={(e) => setFilters({ ...filters, repository: e.target.value, offset: 0 })}
          >
            <option value="">Todos os projetos</option>
            {repositories.map((repo) => (
              <option key={repo.full_name} value={repo.full_name}>
                {repo.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Contribuições
          <select
            value={filters.state}
            onChange={(e) => setFilters({ ...filters, state: e.target.value, offset: 0 })}
          >
            <option value="open">Abertas</option>
            <option value="closed">Encerradas</option>
            <option value="merged">PRs integradas</option>
            <option value="all">Todas</option>
          </select>
        </label>
      </div>
      <ResourceNotice resource={resource} />
      {data &&
        (data.items.length ? (
          <div className="sb-conversations-grid">
            {data.items.map((item) => (
              <ConversationCard key={item.item_key} item={item} />
            ))}
          </div>
        ) : (
          <Empty>Nenhuma conversa encontrada com esses filtros.</Empty>
        ))}
      {data && (
        <Pager
          offset={filters.offset}
          limit={limit}
          total={data.total}
          length={data.items.length}
          loading={resource.loading}
          onChange={(offset) => setFilters({ ...filters, offset })}
        />
      )}
    </Panel>
  );
}
