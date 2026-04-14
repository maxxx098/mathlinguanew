// AppLayout.tsx
import { Outlet, Navigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useNavVisibility } from "@/hooks/useScrollDirection";

const AppLayout = () => {
  const { user, profile, isGuest, loading } = useAuth();
  const navVisible = useNavVisibility(1000); // hides after 1s of no scrolling

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
      {!showingOnboarding && (
        <div
          className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg transition-transform duration-300 ease-in-out ${
            navVisible ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <BottomNav />
        </div>
      )}
    </div>
  );
};

export default AppLayout;