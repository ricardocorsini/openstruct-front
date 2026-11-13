import { useState } from 'react';
import { ExternalLink, GitBranch, Radio } from 'lucide-react';
import {
  isCountedPage,
  isEvidence,
  isPage,
  isRecommendation,
  isRelease,
  isWorkstream,
  queryPath,
  stateLabels,
} from '../../lib/structbot';
import type { Repository } from '../../lib/structbot';
import { usePublicResource } from './useStructBot';
import { DateLabel, Empty, Pager, Panel, References, ResourceNotice, SourceLink } from './Panel';

export function WorkstreamsPanel({ revision }: { revision: number }) {
  const [offset, setOffset] = useState(0);
  const resource = usePublicResource(
    queryPath('/workstreams', { limit: 6, offset }),
    isCountedPage(isWorkstream),
    revision,
  );
  const data = resource.data;
  return (
    <Panel
      id="structbot-workstreams"
      title="Frentes registradas pelo mantenedor"
      caption="04 / frentes de trabalho"
      aside={<GitBranch size={19} />}
    >
      <ResourceNotice resource={resource} />
      {data &&
        (data.items.length ? (
          <ul className="sb-card-list">
            {data.items.map((item) => (
              <li key={item.id}>
                <div className="sb-row">
                  <span className="sb-repo-label">{item.repository.split('/').at(-1)}</span>
                  <span className={`sb-badge ${item.status === 'blocked' ? 'sb-warning' : ''}`}>
                    {stateLabels[item.status] || item.status}
                  </span>
                </div>
                <SourceLink href={item.source_url} className="sb-item-title">
                  {item.title}
                </SourceLink>
                <p>{item.note}</p>
                <div className="sb-row">
                  <span>
                    {item.owner ? `Responsável: ${item.owner}` : 'Sem responsável registrado'}
                  </span>
                  <DateLabel value={item.updated_at} compact />
                </div>
                <References keys={item.item_numbers.map((n) => `${item.repository}#${n}`)} />
                {item.depends_on?.length > 0 && (
                  <p className="sb-footnote">
                    Dependências registradas: {item.depends_on.join(', ')}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Empty>
            Nenhuma frente pública registrada ainda. Combine a contribuição na issue antes de
            começar.
          </Empty>
        ))}
      {data && (
        <Pager
          offset={offset}
          limit={6}
          total={data.total}
          length={data.items.length}
          loading={resource.loading}
          onChange={setOffset}
        />
      )}
    </Panel>
  );
}
export function RecommendationsPanel({ revision }: { revision: number }) {
  const [offset, setOffset] = useState(0);
  const resource = usePublicResource(
    queryPath('/recommendations', { limit: 6, offset }),
    isPage(isRecommendation),
    revision,
  );
  const data = resource.data;
  return (
    <Panel
      id="structbot-recommendations"
      title="Próximos passos"
      caption="05 / recomendações acompanhadas"
    >
      <ResourceNotice resource={resource} />
      {data &&
        (data.items.length ? (
          <ul className="sb-card-list">
            {data.items.map((item) => (
              <li key={item.id}>
                <div className="sb-row">
                  <span className={`sb-badge ${item.priority === 'high' ? 'sb-warning' : ''}`}>
                    {item.priority === 'high'
                      ? 'Prioridade alta'
                      : item.priority === 'low'
                        ? 'Prioridade baixa'
                        : 'Prioridade normal'}
                  </span>
                  <span className="sb-badge">{stateLabels[item.status] || item.status}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <References keys={item.item_keys} />
                <span className="sb-footnote">
                  Registro atualizado em <DateLabel value={item.updated_at} compact />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>
            As recomendações aparecerão aqui quando houver um boletim publicado com próximos passos.
          </Empty>
        ))}
      {data && (
        <Pager
          offset={offset}
          limit={6}
          length={data.items.length}
          loading={resource.loading}
          onChange={setOffset}
        />
      )}
      <p className="sb-footnote">
        Sugestões registradas em boletins; confirme o estado da contribuição antes de agir.
      </p>
    </Panel>
  );
}
export function ReleasesPanel({ revision }: { revision: number }) {
  const [offset, setOffset] = useState(0);
  const resource = usePublicResource(
    queryPath('/releases', { limit: 6, offset }),
    isCountedPage(isRelease),
    revision,
  );
  const data = resource.data;
  return (
    <Panel
      id="structbot-releases"
      title="Versões publicadas"
      caption="06 / releases"
      aside={<ExternalLink size={18} />}
    >
      <ResourceNotice resource={resource} />
      {data &&
        (data.items.length ? (
          <ul className="sb-card-list sb-release-list">
            {data.items.map((item) => (
              <li key={item.id}>
                <div>
                  <span className="sb-repo-label">{item.repository.split('/').at(-1)}</span>
                  <SourceLink href={item.url} className="sb-item-title">
                    {item.title || item.tag}
                  </SourceLink>
                  <DateLabel value={item.published_at} compact />
                </div>
                <span className="sb-badge">{item.prerelease ? 'Pré-release' : item.tag}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Nenhuma release coletada até o momento.</Empty>
        ))}
      {data && (
        <Pager
          offset={offset}
          limit={6}
          total={data.total}
          length={data.items.length}
          loading={resource.loading}
          onChange={setOffset}
        />
      )}
      <p className="sb-footnote">
        Consulte os arquivos de cada release para verificar a disponibilidade de instaladores.
      </p>
    </Panel>
  );
}
const evidenceLabels: Record<string, string> = {
  note: 'Nota',
  work_claim: 'Responsabilidade',
  code_review: 'Revisão de código',
  test_result: 'Resultado de teste',
  engineering_review: 'Revisão de engenharia',
  deployment: 'Publicação',
};
export function EvidencePanel({ revision }: { revision: number }) {
  const [offset, setOffset] = useState(0);
  const resource = usePublicResource(
    queryPath('/evidence', { limit: 6, offset }),
    isCountedPage(isEvidence),
    revision,
  );
  const data = resource.data;
  return (
    <Panel id="structbot-evidence" title="Notas e verificações" caption="07 / evidências públicas">
      <ResourceNotice resource={resource} />
      {data &&
        (data.items.length ? (
          <ul className="sb-card-list">
            {data.items.map((item) => (
              <li key={item.id}>
                <div className="sb-row">
                  <span className="sb-repo-label">{item.repository.split('/').at(-1)}</span>
                  <span className={`sb-badge ${item.stale ? 'sb-warning' : ''}`}>
                    {item.stale ? 'Referência anterior' : evidenceLabels[item.kind] || item.kind}
                  </span>
                </div>
                <p>{item.summary}</p>
                <SourceLink href={item.source_url}>Fonte · {item.author}</SourceLink>
                <span className="sb-footnote">
                  <DateLabel value={item.observed_at} compact /> · ID {item.id}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>
            Ainda não há notas ou verificações publicadas. Resultados de testes e revisões serão
            exibidos quando registrados.
          </Empty>
        ))}
      {data && (
        <Pager
          offset={offset}
          limit={6}
          total={data.total}
          length={data.items.length}
          loading={resource.loading}
          onChange={setOffset}
        />
      )}
    </Panel>
  );
}
export function SourcesPanel({ repositories }: { repositories: Repository[] }) {
  return (
    <Panel
      id="structbot-sources"
      title="De onde vêm os dados"
      caption="08 / condição das fontes"
      aside={<Radio size={19} />}
    >
      <div className="sb-sources">
        {repositories.map((repo) => (
          <div key={repo.full_name} className="sb-source">
            <span
              className={`sb-dot ${repo.stale || repo.sync_status !== 'ready' || !repo.synced_at ? 'sb-dot-warning' : ''}`}
            />
            <div>
              <SourceLink href={`https://github.com/${repo.full_name}`}>{repo.title}</SourceLink>
              <p>
                <DateLabel value={repo.synced_at} compact />
              </p>
            </div>
            <span className="sb-footnote">
              {repo.sync_status === 'error'
                ? 'Falha na última coleta'
                : !repo.synced_at
                  ? 'Aguardando coleta'
                  : repo.stale
                    ? 'Coleta desatualizada'
                    : 'Coleta em dia'}
            </span>
          </div>
        ))}
      </div>
      {!repositories.length && (
        <Empty>
          As fontes serão exibidas quando a API disponibilizar os repositórios públicos.
        </Empty>
      )}
    </Panel>
  );
}
