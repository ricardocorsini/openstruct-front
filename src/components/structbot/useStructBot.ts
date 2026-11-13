import { useCallback, useEffect, useRef, useState } from 'react';
import { REFRESH_MS, readPublic } from '../../lib/structbot';
import { subscribeToEvents } from '../../lib/structbot-feed';
import type { BotEvent } from '../../lib/structbot';
import type { FeedState } from '../../lib/structbot-feed';

export type Resource<T> = { data: T | null; loading: boolean; error: string | null };
export function usePublicResource<T>(
  path: string,
  check: (v: unknown) => v is T,
  revision: number,
  enabled = true,
): Resource<T> {
  const [result, setResult] = useState<Resource<T> & { path: string }>({
    path,
    data: null,
    loading: true,
    error: null,
  });
  // Validators are module constants; avoid tying effects to wrappers created in render.
  const validator = useRef(check);
  validator.current = check;
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    setResult((previous) => ({
      path,
      data: previous.path === path ? previous.data : null,
      loading: true,
      error: null,
    }));
    readPublic(path, validator.current, controller.signal)
      .then((data) => {
        if (active) setResult({ path, data, loading: false, error: null });
      })
      .catch(() => {
        if (active)
          setResult({
            path,
            data: null,
            loading: false,
            error: 'Não foi possível consultar esta seção. Tente atualizar novamente.',
          });
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [path, revision, enabled]);
  return result.path === path ? result : { data: null, loading: true, error: null };
}
export function useDashboard() {
  const [revision, setRevision] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const [events, setEvents] = useState<BotEvent[]>([]);
  const [connection, setConnection] = useState<FeedState>('connecting');
  const cursor = useRef(0);
  const active = visible && !paused;
  const refresh = useCallback(() => setRevision((n) => n + 1), []);
  useEffect(() => {
    const visibility = () => {
      setVisible(!document.hidden);
      if (!document.hidden) refresh();
    };
    setVisible(!document.hidden);
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, [refresh]);
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(interval);
  }, [active, refresh]);
  useEffect(() => {
    if (!active) return;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribeToEvents({
      cursor: cursor.current,
      onCursor: (value) => {
        cursor.current = value;
      },
      onEvents: setEvents,
      onState: setConnection,
      onChange: () => {
        if (refreshTimer) return;
        refreshTimer = setTimeout(() => {
          refreshTimer = undefined;
          refresh();
        }, 10_000);
      },
    });
    return () => {
      unsubscribe();
      clearTimeout(refreshTimer);
    };
  }, [active, refresh]);
  return {
    revision,
    refresh,
    paused,
    setPaused,
    events,
    connection: active ? connection : ('paused' as FeedState),
  };
}
