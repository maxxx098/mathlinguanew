import { Outlet, Navigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";

const AppLayout = () => {
  const { user, isGuest, loading } = useAuth();

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

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-background pb-24">
      <Outlet />
      <BottomNav />
    </div>
  );
};

export default AppLayout;
