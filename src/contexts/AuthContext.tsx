import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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

const normalizeRole = (role: unknown): "teacher" | "learner" | null => {
  if (role === "teacher" || role === "learner") return role;
  return null;
};

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(() => localStorage.getItem("algebra-bridge-guest") === "true");
  const [loading, setLoading] = useState(true);

  const ensurePersistedRole = async (authUser: User, fallbackRole?: string | null) => {
    const desiredRole = normalizeRole(fallbackRole ?? authUser.user_metadata?.role);
    if (!desiredRole) return;

    const { data: existingRoles, error: existingRolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", authUser.id);

    if (existingRolesError) {
      console.error("Failed to read existing user roles", existingRolesError);
      return;
    }

    const hasDesiredRole = (existingRoles ?? []).some((entry) => entry.role === desiredRole);
    if (hasDesiredRole) return;

    const { error: persistRoleError } = await supabase.rpc("set_user_role", {
      _user_id: authUser.id,
      _role: desiredRole,
    });

    if (persistRoleError) {
      console.error("Failed to persist missing user role", persistRoleError);
    }
  };

  const fetchProfile = async (authUser: User, fallbackRole?: string | null) => {
    const normalizedFallbackRole = normalizeRole(fallbackRole ?? authUser.user_metadata?.role);
    await ensurePersistedRole(authUser, normalizedFallbackRole);

    const [{ data: profileData }, { data: roleRows, error: roleError }] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("user_id", authUser.id)
        .maybeSingle(),
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", authUser.id),
    ]);

    if (roleError) {
      console.error("Failed to load user role", roleError);
    }

    const roles = (roleRows ?? []).map((entry) => entry.role);
    const resolvedRole = roles.includes("teacher")
      ? "teacher"
      : roles.includes("learner")
        ? "learner"
        : normalizedFallbackRole;

    setProfile(profileData ?? null);
    setUserRole(resolvedRole ?? null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user, user.user_metadata?.role ?? null);
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user, session.user.user_metadata?.role ?? null);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user, session.user.user_metadata?.role ?? null);
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