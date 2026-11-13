import { isEvent, isEventPage, mergeEvents, publicUrl, readPublic } from './structbot.ts';
import type { BotEvent } from './structbot.ts';
export type FeedState = 'connecting' | 'live' | 'polling' | 'unavailable' | 'paused';
type Source = Pick<EventSource, 'addEventListener' | 'close' | 'onopen' | 'onerror'>;
type Options = {
  cursor: number;
  onCursor: (cursor: number) => void;
  onEvents: (update: (previous: BotEvent[]) => BotEvent[]) => void;
  onState: (state: FeedState) => void;
  onChange: () => void;
  createSource?: (url: string) => Source;
  fetcher?: typeof fetch;
  pollMs?: number;
};
/** Native SSE resumes with Last-Event-ID; REST catches up if the stream is unavailable. */
export function subscribeToEvents(options: Options): () => void {
  let cursor = options.cursor,
    stopped = false,
    connected = false,
    polling = false;
  let source: Source | undefined;
  const controller = new AbortController();
  const receive = (events: BotEvent[]) => {
    if (stopped || !events.length) return;
    options.onEvents((previous) => mergeEvents(previous, events));
    const next = Math.max(cursor, ...events.map((e) => e.id));
    if (next > cursor) {
      cursor = next;
      options.onCursor(cursor);
      options.onChange();
    }
  };
  const poll = async () => {
    if (stopped || connected || polling) return;
    polling = true;
    try {
      // The API is ascending. Drain pages instead of presenting its first page as recent.
      // Bound each fallback cycle; remaining history continues on the next cycle.
      for (let page = 0; page < 10 && !stopped; page++) {
        const requestedCursor = cursor;
        const data = await readPublic(
          `/events?after_id=${requestedCursor}&limit=100`,
          isEventPage,
          AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]),
          options.fetcher,
        );
        if (stopped) return;
        if (!data) break;
        receive(data.items);
        if (!connected) options.onState('polling');
        if (data.items.length < 100 || cursor <= requestedCursor) break;
      }
    } catch {
      if (!stopped && !connected) options.onState('unavailable');
    } finally {
      polling = false;
    }
  };
  options.onState('connecting');
  try {
    source = (options.createSource ?? ((url) => new EventSource(url)))(
      publicUrl(`/events/stream?after_id=${cursor}`),
    );
    source.onopen = () => {
      if (!stopped) {
        connected = true;
        options.onState('live');
      }
    };
    source.onerror = () => {
      if (!stopped) {
        connected = false;
        options.onState('connecting');
        void poll();
      }
    };
    source.addEventListener('development', (event) => {
      if (stopped) return;
      try {
        const value: unknown = JSON.parse((event as MessageEvent).data);
        if (isEvent(value)) receive([value]);
      } catch {
        /* A malformed event must not break the feed or advance its cursor. */
      }
    });
  } catch {
    void poll();
  }
  // Also resolves initial content when a proxy stalls the SSE handshake indefinitely.
  const initial = setTimeout(() => void poll(), 3_000);
  const interval = setInterval(() => void poll(), options.pollMs ?? 30_000);
  return () => {
    stopped = true;
    controller.abort();
    source?.close();
    clearInterval(interval);
    clearTimeout(initial);
  };
}
