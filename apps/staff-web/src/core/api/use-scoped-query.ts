import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "~/core/auth/auth-context";
import { toFriendlyError } from "~/core/errors/error-mapper";

export interface ScopedQueryResult<T> {
  readonly data: T | null;
  readonly loading: boolean;
  readonly error: { statusCode: number; code: string; messageFa: string } | null;
  readonly lastLoadedAtIso: string | null;
  reload: () => void;
}

// Strictly RAM-only SWR cache scoped to sessionEpoch + clinicId (purged on clinic switch / logout)
const scopedSwrCache = new Map<string, { data: unknown; loadedAtIso: string }>();
let lastKnownEpoch = -1;

function buildSwrKey(epoch: number, clinicId: string, fetcher: unknown, deps: readonly unknown[]): string {
  const fnSig = typeof fetcher === "function" ? fetcher.toString().slice(0, 160) : "fn";
  let depSig = "";
  try {
    depSig = JSON.stringify(deps);
  } catch {
    depSig = String(deps.length);
  }
  return `${epoch}|${clinicId}|${fnSig}|${depSig}`;
}

export function useScopedQuery<T>(
  fetcher: (ctx: { token: string; signal: AbortSignal }) => Promise<T>,
  deps: readonly unknown[] = [],
  options: { enabled?: boolean } = {}
): ScopedQueryResult<T> {
  const { session, sessionEpoch } = useAuth();
  const enabled = (options.enabled ?? true) && Boolean(session?.accessToken);

  if (lastKnownEpoch !== sessionEpoch) {
    // Security & safety: purge ALL cached clinic/session data immediately on epoch change
    scopedSwrCache.clear();
    lastKnownEpoch = sessionEpoch;
  }

  const swrKey = enabled && session ? buildSwrKey(sessionEpoch, session.clinicId, fetcher, deps) : null;
  const cachedHit = swrKey ? scopedSwrCache.get(swrKey) : undefined;

  const [data, setData] = useState<T | null>(() => (cachedHit ? (cachedHit.data as T) : null));
  const [loading, setLoading] = useState<boolean>(() => enabled && !cachedHit);
  const [error, setError] = useState<{
    statusCode: number;
    code: string;
    messageFa: string;
  } | null>(null);
  const [lastLoadedAtIso, setLastLoadedAtIso] = useState<string | null>(() => cachedHit?.loadedAtIso ?? null);
  const [refreshTick, setRefreshTick] = useState(0);
  const activeEpochRef = useRef(sessionEpoch);

  const reload = useCallback(() => {
    if (swrKey) scopedSwrCache.delete(swrKey);
    setRefreshTick((n) => n + 1);
  }, [swrKey]);

  useEffect(() => {
    if (activeEpochRef.current !== sessionEpoch) {
      activeEpochRef.current = sessionEpoch;
      setData(null);
      setError(null);
      setLastLoadedAtIso(null);
    }

    if (!enabled || !session?.accessToken || !swrKey) {
      setLoading(false);
      return;
    }

    const warm = scopedSwrCache.get(swrKey);
    if (warm) {
      setData(warm.data as T);
      setLastLoadedAtIso(warm.loadedAtIso);
      setLoading(false);
    } else {
      setLoading(true);
    }

    const controller = new AbortController();
    const requestEpoch = sessionEpoch;
    setError(null);

    void fetcher({ token: session.accessToken, signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted || activeEpochRef.current !== requestEpoch) return;
        const ts = new Date().toISOString();
        if (scopedSwrCache.size > 120) {
          const firstKey = scopedSwrCache.keys().next().value;
          if (firstKey) scopedSwrCache.delete(firstKey);
        }
        scopedSwrCache.set(swrKey, { data: result, loadedAtIso: ts });
        setData(result);
        setLastLoadedAtIso(ts);
        setLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted || activeEpochRef.current !== requestEpoch) return;
        setError(toFriendlyError(err));
        setLoading(false);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, session?.accessToken, sessionEpoch, refreshTick, swrKey]);

  return { data, loading, error, lastLoadedAtIso, reload };
}
