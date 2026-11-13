import type { ReactNode } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, Terminal } from 'lucide-react';
import { botDate, safeSourceUrl, itemSource } from '../../lib/structbot';
import type { Resource } from './useStructBot';

export function Panel({
  id,
  title,
  caption,
  children,
  terminal = false,
  aside,
}: {
  id: string;
  title: string;
  caption?: string;
  children: ReactNode;
  terminal?: boolean;
  aside?: ReactNode;
}) {
  return (
    <section
      id={id}
      className={`sb-panel ${terminal ? 'sb-terminal' : ''}`}
      aria-labelledby={`${id}-title`}
    >
      <div className="sb-panel-bar">
        <div>
          <span className="sb-panel-caption">
            {terminal && <Terminal size={13} aria-hidden="true" />}
            {caption}
          </span>
          <h2 id={`${id}-title`}>{title}</h2>
        </div>
        {aside}
      </div>
      <div className="sb-panel-body">{children}</div>
    </section>
  );
}
export function SourceLink({
  href,
  children,
  className = '',
}: {
  href?: string | null;
  children: ReactNode;
  className?: string;
}) {
  const safe = safeSourceUrl(href);
  return safe ? (
    <a href={safe} className={className} target="_blank" rel="noreferrer">
      {children}
      <ArrowUpRight size={13} aria-hidden="true" />
    </a>
  ) : (
    <span className={className}>{children}</span>
  );
}
export function References({ keys }: { keys: string[] }) {
  if (!keys.length) return null;
  return (
    <div className="sb-references">
      {keys.map((key) => (
        <SourceLink key={key} href={itemSource(key)}>
          {key.split('/').at(-1)}
        </SourceLink>
      ))}
    </div>
  );
}
export function ResourceNotice<T>({ resource }: { resource: Resource<T> }) {
  if (resource.error)
    return (
      <p className="sb-notice sb-warning" role="status">
        {resource.error}
      </p>
    );
  if (resource.loading && !resource.data)
    return (
      <p className="sb-empty" role="status">
        Consultando o StructBot…
      </p>
    );
  return null;
}
export function Empty({ children }: { children: ReactNode }) {
  return <p className="sb-empty">{children}</p>;
}
export function DateLabel({
  value,
  compact = false,
}: {
  value?: string | null;
  compact?: boolean;
}) {
  return value ? (
    <time dateTime={value}>{botDate(value, compact)}</time>
  ) : (
    <span>Ainda não coletado</span>
  );
}
export function Pager({
  offset,
  limit,
  total,
  length,
  loading,
  onChange,
}: {
  offset: number;
  limit: number;
  total?: number;
  length: number;
  loading: boolean;
  onChange: (offset: number) => void;
}) {
  if (!offset && (total === undefined ? length < limit : total <= limit)) return null;
  return (
    <div className="sb-pager">
      <span>
        {total !== undefined
          ? `${length ? offset + 1 : 0}–${offset + length} de ${total}`
          : `Página ${Math.floor(offset / limit) + 1}`}
      </span>
      <div>
        <button
          type="button"
          disabled={!offset || loading}
          onClick={() => onChange(Math.max(0, offset - limit))}
        >
          <ChevronLeft size={16} /> Anterior
        </button>
        <button
          type="button"
          disabled={loading || (total !== undefined ? offset + length >= total : length < limit)}
          onClick={() => onChange(offset + limit)}
        >
          Próxima <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
