import { ArrowUpRight, RefreshCw } from 'lucide-react';
import type { CurrentApp } from '../lib/app-registry';
import { CATALOG_MAX_ATTEMPTS, availabilityLabel } from '../lib/catalog-store';
import { useProductAvailability, usePublicCatalog } from './CatalogProvider';
import { productReleasesUrl } from '../lib/installation';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(value),
  );
export function CatalogSyncStatus() {
  const { loading, failure, attempts, canRetry, refresh, lastAttemptAt } = usePublicCatalog();
  const failureMessage =
    failure === 'unsupported'
      ? 'Não foi possível verificar as assinaturas neste navegador. Tente um navegador atualizado e acesse o site por HTTPS.'
      : failure === 'invalid'
        ? 'A publicação recebida foi recusada pela validação. Novos pacotes não foram liberados.'
        : 'Não foi possível consultar o catálogo público. Tente novamente após o intervalo.';
  return (
    <div className="catalog-sync-status">
      <p role="status">
        {loading
          ? 'Consultando versões no catálogo público…'
          : failure
            ? `${failureMessage} Quando há dados anteriores verificados, eles aparecem como desatualizados.`
            : 'Consulta concluída. Versões e disponibilidade são conferidas por aplicativo.'}
        {lastAttemptAt && (
          <>
            {' '}
            <span>Consulta: {formatDate(lastAttemptAt)}.</span>
          </>
        )}
      </p>
      <button className="text-link" disabled={!canRetry} onClick={() => void refresh()}>
        <RefreshCw size={14} />
        {loading
          ? 'Consultando…'
          : attempts >= CATALOG_MAX_ATTEMPTS
            ? 'Limite de consultas atingido'
            : canRetry
              ? 'Consultar novamente'
              : 'Nova consulta após o intervalo'}
      </button>
      <small>
        Disponibilidade baseada nos pacotes do catálogo público assinado, verificados por
        aplicativo. Canal estável · até 3 consultas por sessão, com intervalo mínimo de 1 minuto.
      </small>
    </div>
  );
}

export function ProductCatalogMeta({ app }: { app: CurrentApp }) {
  const product = useProductAvailability(app.id);
  const { loading } = usePublicCatalog();
  return (
    <p className="catalog-product-meta">
      {product?.release && <>Versão para instalar: {product.release.version} · </>}
      {product?.checkedAt ? (
        <>Verificado em {formatDate(product.checkedAt)}.</>
      ) : loading ? (
        'Consultando o catálogo público.'
      ) : (
        'Nenhum pacote pôde ser confirmado neste navegador.'
      )}
      {product?.stale && <strong> Dado desatualizado.</strong>}
      {product?.issue === 'missing' && ' Produto ausente na última consulta.'}
      {product?.issue === 'invalid' && ' Publicação recusada pela validação.'}
      {product?.issue === 'rollback' && ' Catálogo anterior ao último dado válido.'}
      {product?.issue === 'offline' && ' A consulta ao catálogo falhou.'}
      {product?.issue === 'unsupported' &&
        ' Verificação de assinaturas indisponível; use HTTPS e um navegador atualizado.'}
    </p>
  );
}

/** Download buttons remain in the product page; this shared block synchronizes availability. */
export function ProductAvailability({ app }: { app: CurrentApp }) {
  const product = useProductAvailability(app.id);
  const { loading, canRetry, refresh, attempts } = usePublicCatalog();
  const release = product?.release;
  return (
    <aside className="product-availability" aria-label={`Disponibilidade do ${app.name}`}>
      <span className="eyebrow">VERSÃO PARA INSTALAR / CANAL ESTÁVEL</span>
      <p role="status">
        <strong>
          {app.name}
          {release && <> {release.version}</>}
        </strong>{' '}
        · {availabilityLabel(product, loading)}
      </p>
      <ProductCatalogMeta app={app} />
      {release && (
        <p>
          Pacotes:{' '}
          {release.assets
            .map((asset) => `${asset.platform === 'windows' ? 'Windows' : 'Linux'} ${asset.arch}`)
            .join(' · ')}
          . Publicada em {formatDate(release.publishedAt)}.
        </p>
      )}
      <p>
        Conteúdo técnico desta página: versão {app.distribution?.version ?? app.code.version}.
        {release &&
          release.version !== (app.distribution?.version ?? app.code.version) &&
          ' A versão para instalar mudou; os recursos descritos permanecem vinculados à documentação revisada.'}
      </p>
      <div className="product-availability-actions">
        <a
          className="text-link"
          href={release?.releaseUrl ?? productReleasesUrl(app.id)}
          target="_blank"
          rel="noreferrer"
        >
          {release ? 'Notas da versão para instalar' : 'Consultar releases oficiais'}{' '}
          <ArrowUpRight size={14} />
        </a>
        <button className="text-link" disabled={!canRetry} onClick={() => void refresh()}>
          <RefreshCw size={14} />
          {loading
            ? 'Consultando…'
            : attempts >= CATALOG_MAX_ATTEMPTS
              ? 'Limite de consultas atingido'
              : canRetry
                ? 'Consultar novamente'
                : 'Aguarde 1 min para consultar'}
        </button>
      </div>
    </aside>
  );
}
