import {
  Bot,
  CircleDot,
  GitMerge,
  GitPullRequest,
  CheckCircle2,
  RefreshCw,
  Pause,
  Play,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { countOf, eventLabels, isOverview, isStatus, isReport } from '../lib/structbot';
import { useDashboard, usePublicResource } from '../components/structbot/useStructBot';
import { DateLabel, Empty, Panel, ResourceNotice, SourceLink } from '../components/structbot/Panel';
import { ReportPanel } from '../components/structbot/ReportPanel';
import { InventoryPanel } from '../components/structbot/InventoryPanel';
import {
  EvidencePanel,
  RecommendationsPanel,
  ReleasesPanel,
  SourcesPanel,
  WorkstreamsPanel,
} from '../components/structbot/ProjectPanels';
import { ConversationsPanel } from '../components/structbot/ConversationsPanel';
import { NewsPanel } from '../components/structbot/NewsPanel';
import '../structbot.css';

export function StructBot() {
  const dashboard = useDashboard();
  const overview = usePublicResource('/overview', isOverview, dashboard.revision);
  const latestReport = usePublicResource('/reports/latest', isReport, dashboard.revision);
  const status = usePublicResource('/status', isStatus, dashboard.revision);
  const repositories = status.data?.repositories ?? overview.data?.repositories ?? [];
  const warnings = repositories.filter((r) => r.stale || r.sync_status !== 'ready' || !r.synced_at);
  const connectionLabels = {
    connecting: 'Conectando ao feed',
    live: 'Feed conectado',
    polling: 'Feed por consulta periódica',
    unavailable: 'Feed indisponível',
    paused: 'Atualização pausada',
  };
  const metrics = [
    {
      label: 'Issues abertas',
      value: countOf(overview.data, 'issue', 'open'),
      icon: CircleDot,
      detail: 'Demandas em aberto',
    },
    {
      label: 'PRs abertas',
      value: countOf(overview.data, 'pull_request', 'open'),
      icon: GitPullRequest,
      detail: 'Propostas para integrar',
    },
    {
      label: 'PRs integradas',
      value: countOf(overview.data, 'pull_request', 'merged'),
      icon: GitMerge,
      detail: 'Histórico coletado',
    },
    {
      label: 'Issues encerradas',
      value: countOf(overview.data, 'issue', 'closed'),
      icon: CheckCircle2,
      detail: 'Histórico coletado',
    },
  ];
  return (
    <div className="sb-page">
      <div className="container">
        <div className="sb-heading">
          <div>
            <div className="sb-eyebrow">
              <span className="sb-robot">
                <Bot size={23} aria-hidden="true" />
              </span>{' '}
              OPENSTRUCT / CENTRAL DE ATIVIDADE
            </div>
            <h1>
              StructBot
              <span className="sb-cursor" aria-hidden="true">
                _
              </span>
            </h1>
            <p>
              O desenvolvimento, em perspectiva.
              <br />
              Acompanhe o que mudou, o que precisa de atenção e onde contribuir.
            </p>
          </div>
          <div className="sb-heading-actions">
            <button
              className="sb-button"
              onClick={dashboard.refresh}
              disabled={overview.loading || status.loading}
            >
              <RefreshCw size={16} /> Atualizar painel
            </button>
            <Link to="/development/contribuir-com-ia">
              Quero contribuir <ArrowRight size={15} />
            </Link>
          </div>
        </div>
        <NewsPanel report={latestReport} />
        <div className="sb-status-line" role="status">
          <span>
            <span className={`sb-dot ${dashboard.connection !== 'live' ? 'sb-dot-warning' : ''}`} />
            {connectionLabels[dashboard.connection]}
          </span>
          <span>
            Consulta:{' '}
            {overview.data ? (
              <DateLabel value={overview.data.generated_at} />
            ) : (
              'aguardando resposta'
            )}
          </span>
          <button
            onClick={() => dashboard.setPaused(!dashboard.paused)}
            aria-pressed={dashboard.paused}
          >
            {dashboard.paused ? <Play size={13} /> : <Pause size={13} />}
            {dashboard.paused ? 'Retomar atualização' : 'Pausar atualização'}
          </button>
        </div>
        {status.error && !overview.error && <ResourceNotice resource={status} />}
        {(warnings.length > 0 ||
          (status.data?.pending_repositories ?? 0) > 0 ||
          status.data?.worker_active === false) && (
          <div className="sb-notice sb-warning">
            <strong>Visão parcial do ecossistema.</strong>{' '}
            {warnings.length > 0 &&
              `${warnings.length} fonte(s) com coleta pendente, antiga ou com falha. `}
            {(status.data?.pending_repositories ?? 0) > 0 &&
              `${status.data!.pending_repositories} repositório(s) aguardando a primeira coleta. `}
            {status.data?.worker_active === false && 'O processador não enviou um sinal recente. '}
            Os números refletem o inventário disponível.
          </div>
        )}
        <ResourceNotice resource={overview} />
        <div className="sb-metrics">
          {metrics.map((metric) => (
            <div key={metric.label}>
              <div className="sb-metric-label">
                <span>{metric.label}</span>
                <metric.icon size={17} aria-hidden="true" />
              </div>
              <strong>{metric.value === null ? '—' : metric.value.toLocaleString('pt-BR')}</strong>
              <span className="sb-footnote">
                {metric.value === null ? 'Aguardando dados' : metric.detail}
              </span>
            </div>
          ))}
        </div>
        <nav className="sb-jump-links" aria-label="Seções do StructBot">
          <a href="#structbot-news">Últimas notícias</a>
          <a href="#structbot-conversations">Conversas</a>
          <a href="#structbot-report">Boletim</a>
          <a href="#structbot-inventory">Issues & PRs</a>
          <a href="#structbot-workstreams">Frentes</a>
          <a href="#structbot-releases">Releases</a>
          <a href="#structbot-sources">Fontes</a>
        </nav>
        <div className="sb-command-grid">
          <ReportPanel revision={dashboard.revision} latest={latestReport} />
          <div className="sb-feed-column">
            <Panel
              id="structbot-feed"
              title="Pulso dos projetos"
              caption="02 / terminal de atividade"
              terminal
              aside={<Activity size={19} aria-hidden="true" />}
            >
              <div className="sb-feed-state">
                <span
                  className={`sb-dot ${dashboard.connection !== 'live' ? 'sb-dot-warning' : ''}`}
                />
                {connectionLabels[dashboard.connection]}
              </div>
              {dashboard.events.length ? (
                <ol className="sb-event-list">
                  {dashboard.events.map((event) => (
                    <li key={event.id}>
                      <div>
                        <DateLabel value={event.occurred_at} compact />
                        <span>{eventLabels[event.kind] || event.kind}</span>
                      </div>
                      <span className="sb-repo-label">{event.repository.split('/').at(-1)}</span>
                      <SourceLink href={event.url}>{event.title}</SourceLink>
                    </li>
                  ))}
                </ol>
              ) : (
                <Empty>
                  {dashboard.connection === 'unavailable'
                    ? 'O feed não respondeu. As consultas serão retomadas automaticamente.'
                    : 'Aguardando eventos públicos do StructBot.'}
                </Empty>
              )}
              <p className="sb-footnote">
                Até 60 eventos recebidos, do mais recente para o mais antigo. Horários de observação
                pelo StructBot; a coleta do GitHub é periódica.
              </p>
            </Panel>
            <div className="sb-how-it-works">
              <span className="sb-panel-caption">UM PONTO DE ENCONTRO PARA CONTRIBUIR</span>
              <p>Leia o boletim. Confira a issue. Combine a próxima entrega.</p>
              <Link to="/community/como-colaborar">
                Conhecer o fluxo de colaboração <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
        <ConversationsPanel revision={dashboard.revision} repositories={repositories} />
        <InventoryPanel revision={dashboard.revision} repositories={repositories} />
        <div className="sb-secondary-grid">
          <WorkstreamsPanel revision={dashboard.revision} />
          <RecommendationsPanel revision={dashboard.revision} />
          <ReleasesPanel revision={dashboard.revision} />
          <EvidencePanel revision={dashboard.revision} />
        </div>
        <SourcesPanel repositories={repositories} />
        <div className="sb-page-note">
          <Bot size={18} />
          <p>
            Um retrato público do desenvolvimento OpenStruct. Atualização do painel a cada minuto e
            por eventos, sem executar análises de IA a cada visita. Horários de Brasília (UTC−3).
          </p>
          <Link to="/development">
            Central de desenvolvimento <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}
