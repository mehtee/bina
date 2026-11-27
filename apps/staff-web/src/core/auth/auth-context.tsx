import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { apiRequest, registerUnauthorizedHandler } from "~/core/api/client";
import type {
  AuthorizedClinicMembership,
  ClinicProfile,
  FeatureFlagRecord,
  StaffMeResponse,
  StaffRole,
  StaffSessionResponse,
  StaffStepUpResponse,
} from "~/core/api/contracts";

export interface StaffSessionState {
  readonly accessToken: string;
  readonly oidcToken: string;
  readonly userId: string;
  readonly tenantId: string;
  readonly clinicId: string;
  readonly role: StaffRole;
  readonly mfaVerified: boolean;
  readonly stepUpVerified: boolean;
  readonly capabilities: Record<string, boolean>;
  readonly clinic: ClinicProfile | null;
  readonly authorizedClinics: AuthorizedClinicMembership[];
  readonly featureFlags: FeatureFlagRecord[];
}

interface AuthContextValue {
  readonly session: StaffSessionState | null;
  readonly sessionEpoch: number;
  readonly loading: boolean;
  readonly sessionExpiredNotice: boolean;
  loginWithOidc: (input: {
    oidcToken: string;
    clinicId: string;
    mfaCode?: string;
    tenantId?: string;
  }) => Promise<StaffSessionState>;
  switchClinic: (clinicId: string) => Promise<StaffSessionState>;
  performStepUp: (stepUpCode: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  logout: () => void;
  clearExpiredNotice: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Memory-only tokens & clinical session context: NEVER persisted in localStorage
  const [session, setSession] = useState<StaffSessionState | null>(null);
  const [sessionEpoch, setSessionEpoch] = useState(1);
  const [loading, setLoading] = useState(false);
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState(false);
  const activeControllerRef = useRef<AbortController | null>(null);

  const abortPending = useCallback(() => {
    activeControllerRef.current?.abort();
    activeControllerRef.current = new AbortController();
    return activeControllerRef.current.signal;
  }, []);

  const logout = useCallback(() => {
    abortPending();
    setSession(null);
    setSessionEpoch((e) => e + 1);
  }, [abortPending]);

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      setSession(null);
      setSessionExpiredNotice(true);
      setSessionEpoch((e) => e + 1);
    });
    return () => registerUnauthorizedHandler(null);
  }, []);

  const hydrateSession = useCallback(
    async (
      accessToken: string,
      oidcToken: string,
      signal: AbortSignal
    ): Promise<StaffSessionState> => {
      const me = await apiRequest<StaffMeResponse>("/v1/auth/staff/me", {
        token: accessToken,
        signal,
      });

      return {
        accessToken,
        oidcToken,
        userId: me.userId,
        tenantId: me.tenantId,
        clinicId: me.clinicId,
        role: me.role,
        mfaVerified: me.mfaVerified,
        stepUpVerified: me.stepUpVerified,
        capabilities: me.capabilities ?? {},
        clinic: me.clinic ?? null,
        authorizedClinics: me.authorizedClinics ?? [],
        featureFlags: me.featureFlags ?? [],
      };
    },
    []
  );

  const loginWithOidc = useCallback(
    async (input: {
      oidcToken: string;
      clinicId: string;
      mfaCode?: string;
      tenantId?: string;
    }): Promise<StaffSessionState> => {
      const signal = abortPending();
      setLoading(true);
      setSessionExpiredNotice(false);
      try {
        const res = await apiRequest<StaffSessionResponse>("/v1/auth/staff/session", {
          method: "POST",
          body: {
            oidcToken: input.oidcToken,
            clinicId: input.clinicId,
            mfaCode: input.mfaCode,
            tenantId: input.tenantId,
          },
          signal,
        });
        const nextState = await hydrateSession(res.accessToken, input.oidcToken, signal);
        setSession(nextState);
        setSessionEpoch((e) => e + 1);
        return nextState;
      } finally {
        setLoading(false);
      }
    },
    [abortPending, hydrateSession]
  );

  const switchClinic = useCallback(
    async (clinicId: string): Promise<StaffSessionState> => {
      if (!session) {
        throw new Error("NO_ACTIVE_SESSION");
      }
      const signal = abortPending();
      setLoading(true);
      try {
        const res = await apiRequest<StaffSessionResponse>("/v1/auth/staff/session", {
          method: "POST",
          body: {
            oidcToken: session.oidcToken,
            clinicId,
          },
          signal,
        });
        const nextState = await hydrateSession(res.accessToken, session.oidcToken, signal);
        // Atomic purge: increment epoch so all views reset stale previous-clinic data
        setSession(nextState);
        setSessionEpoch((e) => e + 1);
        return nextState;
      } finally {
        setLoading(false);
      }
    },
    [abortPending, hydrateSession, session]
  );

  const performStepUp = useCallback(
    async (stepUpCode: string): Promise<void> => {
      if (!session) return;
      const res = await apiRequest<StaffStepUpResponse>("/v1/auth/staff/step-up", {
        method: "POST",
        token: session.accessToken,
        body: { stepUpCode },
      });
      const updated = await hydrateSession(
        res.accessToken,
        session.oidcToken,
        abortPending()
      );
      setSession(updated);
      setSessionEpoch((e) => e + 1);
    },
    [abortPending, hydrateSession, session]
  );

  const refreshProfile = useCallback(async () => {
    if (!session) return;
    const updated = await hydrateSession(
      session.accessToken,
      session.oidcToken,
      abortPending()
    );
    setSession(updated);
  }, [abortPending, hydrateSession, session]);

  const clearExpiredNotice = useCallback(() => setSessionExpiredNotice(false), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      sessionEpoch,
      loading,
      sessionExpiredNotice,
      loginWithOidc,
      switchClinic,
      performStepUp,
      refreshProfile,
      logout,
      clearExpiredNotice,
    }),
    [
      session,
      sessionEpoch,
      loading,
      sessionExpiredNotice,
      loginWithOidc,
      switchClinic,
      performStepUp,
      refreshProfile,
      logout,
      clearExpiredNotice,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function useCapabilities() {
  const { session } = useAuth();
  const can = useCallback(
    (action: string): boolean => Boolean(session?.capabilities?.[action]),
    [session]
  );
  const isFeatureEnabled = useCallback(
    (flagKey: string): boolean => {
      const flag = session?.featureFlags.find((f) => f.flagKey === flagKey);
      return Boolean(flag?.enabled);
    },
    [session]
  );
  return {
    can,
    isFeatureEnabled,
    role: session?.role ?? null,
    stepUpVerified: Boolean(session?.stepUpVerified),
  };
}
