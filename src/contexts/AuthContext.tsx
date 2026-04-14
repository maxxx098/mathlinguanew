import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: any | null;
  userRole: string | null;
  isGuest: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  setIsGuest: (v: boolean) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null, user: null, profile: null, userRole: null,
  isGuest: false, loading: true,
  signOut: async () => {}, setIsGuest: () => {}, refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(() => localStorage.getItem("algebra-bridge-guest") === "true");
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string, fallbackRole?: string | null) => {
    const [{ data: profileData }, { data: roleRows, error: roleError }] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId),
    ]);

    if (roleError) {
      console.error("Failed to load user role", roleError);
    }

    const roles = (roleRows ?? []).map((entry) => entry.role);
    const resolvedRole = roles.includes("teacher")
      ? "teacher"
      : roles.includes("learner")
        ? "learner"
        : fallbackRole ?? null;

    setProfile(profileData ?? null);
    setUserRole(resolvedRole);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id, user.user_metadata?.role ?? null);
  };

  useEffect(() => {
    // Restore session first — this is the source of truth for initial load
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id, session.user.user_metadata?.role ?? null);
      }
      setLoading(false);
    });

    // Listen for subsequent auth changes (sign-in, sign-out, token refresh)
    // Do NOT await inside this callback — it can deadlock
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id, session.user.user_metadata?.role ?? null);
          setIsGuest(false);
          localStorage.removeItem("algebra-bridge-guest");
        } else {
          setProfile(null);
          setUserRole(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setUserRole(null);
    setIsGuest(false);
    localStorage.removeItem("algebra-bridge-guest");
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, userRole, isGuest, loading, signOut, setIsGuest, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
