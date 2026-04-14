import { Outlet, Navigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";

const AppLayout = () => {
  const { user, profile, isGuest, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user && !isGuest) {
    return <Navigate to="/auth" replace />;
  }

  const showingOnboarding = user && profile && !profile.onboarding_completed;

  return (
    <div className={`mx-auto min-h-screen max-w-lg bg-background ${showingOnboarding ? "" : "pb-24"}`}>
      <Outlet />
      {!showingOnboarding && <BottomNav />}
    </div>
  );
};

export default AppLayout;