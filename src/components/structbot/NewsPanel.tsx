import { Newspaper, ArrowUpRight } from 'lucide-react';
import type { Report } from '../../lib/structbot';
import type { Resource } from './useStructBot';
import { DateLabel, Empty, References, ResourceNotice, SourceLink } from './Panel';

const categoryLabels: Record<string, string> = {
  advance: 'O que avançou',
  discussion: 'Em discussão',
  review: 'Em revisão',
  help: 'Onde contribuir',
  release: 'Nova versão',
};
export function NewsPanel({ report }: { report: Resource<Report> }) {
  const data = report.data;
  const news = data?.content.news;
  return (
    <section className="sb-news" aria-labelledby="structbot-news-title" id="structbot-news">
      <div className="sb-news-masthead">
        <div>
          <Newspaper size={19} aria-hidden="true" />
          <h2 id="structbot-news-title">Últimas notícias do OpenStruct</h2>
        </div>
        <span>
          {data ? (
            <DateLabel value={data.published_at || data.created_at} />
          ) : (
            'A próxima edição vem aí'
          )}
        </span>
      </div>
      <ResourceNotice resource={report} />
      {!data && !report.loading && !report.error && (
        <Empty>
          O jornal aparecerá aqui quando o primeiro boletim for publicado. Confira o inventário e as
          conversas abaixo.
        </Empty>
      )}
      {data && (
        <div className="sb-news-content">
          <div className="sb-news-intro">
            <span className="sb-panel-caption">
              {data.provider === 'openai' ? 'EDIÇÃO COM ANÁLISE POR IA' : 'EDIÇÃO AUTOMÁTICA'}
              {data.stale ? ' · RETRATO DE UMA COLETA ANTERIOR' : ''}
            </span>
            <h3>{news?.headline || data.content.title}</h3>
            <p>{news?.lead || data.content.community_bulletin || data.content.summary}</p>
          </div>
          {data.stale && (
            <p className="sb-news-stale">
              Houve mudanças ou falhas nas fontes desde esta edição. As tabelas abaixo mostram o
              inventário atual disponível.
            </p>
          )}
          {news && news.stories.length > 0 && (
            <div className="sb-news-stories">
              {news.stories.map((story, index) => (
                <article key={`${index}-${story.headline}`}>
                  <span className="sb-panel-caption">
                    {categoryLabels[story.category] || 'No ecossistema'}
                  </span>
                  <h4>{story.headline}</h4>
                  <p>{story.body}</p>
                  {story.contributors.length > 0 && (
                    <div className="sb-news-contributors">
                      {story.contributors.map((login) => (
                        <SourceLink
                          key={login}
                          href={`https://github.com/${encodeURIComponent(login)}`}
                        >
                          @{login}
                        </SourceLink>
                      ))}
                    </div>
                  )}
                  <References
                    keys={[...new Set([...story.item_keys, ...story.conversation_keys])]}
                  />
                  {story.release_urls.map((url) => (
                    <SourceLink key={url} href={url} className="sb-footnote">
                      Consultar release
                    </SourceLink>
                  ))}
                  {story.evidence_ids.length > 0 && (
                    <p className="sb-footnote">Evidências: {story.evidence_ids.join(', ')}</p>
                  )}
                </article>
              ))}
            </div>
          )}
          <div className="sb-news-closing">
            <p>
              {news?.call_to_action || 'Leia as conversas e combine sua contribuição na issue.'}
            </p>
            <a href="#structbot-conversations">
              Acompanhar as conversas <ArrowUpRight size={15} />
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
