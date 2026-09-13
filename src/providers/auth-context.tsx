import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import {
  clearStoredSession as clearStored,
  loadStoredSession,
  persistSession,
  providerForSession,
  refreshFamilyStudents,
  refreshLiveSnapshot,
  signIn as liveSignIn,
  signOut as liveSignOut,
  switchActiveStudent,
  type AuthSession,
  type SignInError,
} from '@/providers/auth';
import type { FamilyStudent } from '@/providers/myed/live-client';

type AuthStatus = 'restoring' | 'signed-out' | 'signing-in' | 'signed-in';

type AuthContextValue = {
  status: AuthStatus;
  session: AuthSession | null;
  error: SignInError | null;
  signingOut: boolean;
  /** Live-login progress label, e.g. "Loading classes (3/8)…". */
  progress: string | null;
  /** Children on a parent account. Empty for student/mock sessions. */
  students: FamilyStudent[];
  activeStudentId: string | undefined;
  switchingStudent: boolean;
  switchError: string | null;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  switchStudent: (studentId: string) => Promise<void>;
  refreshStudents: () => Promise<boolean>;
  /** Re-pull MyEd data for the active student. Throws on failure. */
  refreshSnapshot: () => Promise<void>;
  refreshing: boolean;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('restoring');
  const [session, setSession] = useState<AuthSession | null>(null);
  const [error, setError] = useState<SignInError | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [switchingStudent, setSwitchingStudent] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let live = true;
    loadStoredSession().then((stored) => {
      if (!live) return;
      if (stored) {
        setSession(stored);
        setStatus('signed-in');
      } else {
        setStatus('signed-out');
      }
    });
    return () => {
      live = false;
    };
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    setStatus('signing-in');
    setError(null);
    setProgress(null);
    try {
      const next = await liveSignIn(username, password, (label) =>
        setProgress(label),
      );
      await persistSession(next);
      setSession(next);
      setStatus('signed-in');
    } catch (e) {
      setError(e as SignInError);
      setStatus('signed-out');
    } finally {
      setProgress(null);
    }
  }, []);

  const signOut = useCallback(async () => {
    setSigningOut(true);
    try {
      if (session) await liveSignOut(session.token);
    } finally {
      await clearStored();
      setSession(null);
      setStatus('signed-out');
      setError(null);
      setSigningOut(false);
    }
  }, [session]);

  const clearError = useCallback(() => {
    setError(null);
    setSwitchError(null);
  }, []);

  const switchStudent = useCallback(
    async (studentId: string) => {
      if (!session || session.kind !== 'live') return;
      if (session.activeStudentId === studentId || switchingStudent) return;
      setSwitchingStudent(true);
      setSwitchError(null);
      setProgress(null);
      try {
        const next = await switchActiveStudent(session, studentId, (label) =>
          setProgress(label),
        );
        setSession({ ...next });
      } catch (e) {
        setSwitchError(
          e instanceof Error ? e.message : 'Could not switch student.',
        );
      } finally {
        setSwitchingStudent(false);
        setProgress(null);
      }
    },
    [session, switchingStudent],
  );

  const refreshSnapshot = useCallback(async (): Promise<void> => {
    if (!session || session.kind !== 'live' || refreshing) return;
    setRefreshing(true);
    try {
      const next = await refreshLiveSnapshot(session, (label) =>
        setProgress(label),
      );
      setSession({ ...next });
    } finally {
      setRefreshing(false);
      setProgress(null);
    }
  }, [session, refreshing]);

  const refreshStudents = useCallback(async (): Promise<boolean> => {
    if (!session || session.kind !== 'live') return false;
    if ((session.students?.length ?? 0) > 1) return true;
    setSwitchError(null);
    try {
      const found = await refreshFamilyStudents(session);
      if (found) setSession({ ...session });
      return found;
    } catch (e) {
      const message =
        e instanceof Error ? e.message : 'Could not reach MyEd.';
      setSwitchError(message);
      return false;
    }
  }, [session]);

  return (
    <AuthContext.Provider
      value={{
        status,
        session,
        error,
        signingOut,
        progress,
        students: session?.students ?? [],
        activeStudentId: session?.activeStudentId,
        switchingStudent,
        switchError,
        signIn,
        signOut,
        switchStudent,
        refreshStudents,
        refreshSnapshot,
        refreshing,
        clearError,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

/** Active provider: session-scoped profile over the MyEd snapshot. */
export function useSessionProvider() {
  const { session } = useAuth();
  return session ? providerForSession(session) : null;
}
