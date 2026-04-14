import { useLocation, useNavigate } from "react-router-dom";
import { Home, MessageCircle, Bell, User, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavVisibility } from "@/hooks/useNavVisibility";

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasClass, setHasClass] = useState(false);
  const navVisible = useNavVisibility(1500);

  useEffect(() => {
    if (!user) return;

    const fetchUnread = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      setUnreadCount(count || 0);
    };

    const fetchClassStatus = async () => {
      if (userRole === "teacher") {
        const { data } = await supabase
          .from("classes")
          .select("id")
          .eq("teacher_id", user.id)
          .limit(1);
        setHasClass((data?.length ?? 0) > 0);
      } else {
        const { data } = await supabase
          .from("class_members")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);
        setHasClass((data?.length ?? 0) > 0);
      }
    };

    fetchUnread();
    fetchClassStatus();

    const channel = supabase
      .channel("nav-notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => fetchUnread()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, userRole]);

  const tabs = [
    { path: "/", label: "Home", icon: Home },
    { path: "/community", label: "Community", icon: MessageCircle },
    { path: "/notifications", label: "Alerts", icon: Bell, badge: unreadCount },
    { path: "/profile", label: "Profile", icon: User },
  ];

  const handleFabClick = () => {
    navigate("/class");
  };

  const fabLabel = (() => {
    if (userRole === "teacher") {
      return hasClass ? "My Class" : "New";
    }
    return hasClass ? "My Class" : "Join";
  })();

  return (
    <div
      className={`fixed bottom-6 left-0 right-0 z-50 flex items-center justify-center px-6 safe-area-bottom transition-transform duration-300 ease-in-out ${
        navVisible ? "translate-y-0" : "translate-y-[120%]"
      }`}
    >
      {/* Floating pill nav */}
      <nav className="flex items-center gap-1 rounded-full bg-card/95 backdrop-blur-md border border-border px-3 py-2 shadow-xl">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="relative flex flex-col items-center justify-center"
            >
              <motion.div
                className={`relative flex flex-col items-center justify-center gap-0.5 rounded-full px-4 py-2 transition-colors duration-200 ${
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground"
                }`}
                whileTap={{ scale: 0.92 }}
              >
                {/* Badge */}
                {(tab.badge ?? 0) > 0 && (
                  <span className="absolute -top-1 right-2 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center leading-none">
                    {(tab.badge ?? 0) > 99 ? "99+" : tab.badge}
                  </span>
                )}

                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.2 : 1.8} />
                <span
                  className={`text-[10px] font-medium leading-none ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {tab.label}
                </span>
              </motion.div>
            </button>
          );
        })}
      </nav>

      {/* FAB button */}
      <button
        onClick={handleFabClick}
        className="ml-3 flex h-12 shrink-0 items-center justify-center rounded-full bg-primary shadow-lg active:scale-95 transition-transform gap-1.5 px-4"
        aria-label={fabLabel}
      >
        <Plus className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
        <span className="text-primary-foreground text-xs font-semibold whitespace-nowrap">
          {fabLabel}
        </span>
      </button>
    </div>
  );
};

export default BottomNav;