import { useEffect, useState } from "react";
import { motion, cubicBezier } from "framer-motion";
import { Flame, CheckSquare, Zap, Award, Settings, LogOut, ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import WeeklyProgressChart from "@/components/WeeklyProgressChart";
import { ThemeToggle } from "@/components/ThemeToggle";

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, userRole, signOut, isGuest } = useAuth();
  const [stats, setStats] = useState({ completed: 0, challenges: 0, streak: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      const [progressRes, challengesRes] = await Promise.all([
        supabase.from("user_progress").select("completed").eq("user_id", user.id).eq("completed", true),
        supabase.from("daily_challenge_completions").select("id").eq("user_id", user.id),
      ]);
      setStats({
        completed: progressRes.data?.length || 0,
        challenges: challengesRes.data?.length || 0,
        streak: progressRes.data?.length || 0,
      });
    };
    fetchStats();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const displayName = profile?.display_name || (isGuest ? "Guest Learner" : "Learner");
  const roleLabel = userRole
    ? userRole.charAt(0).toUpperCase() + userRole.slice(1)
    : isGuest ? "Guest" : "Learner";
  const progressPercent = Math.round((stats.completed / 20) * 100);

  const stagger = (i: number) => ({
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, delay: i * 0.06, ease: cubicBezier(0.42, 0, 0.58, 1) },
  });

  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen pb-28">

      {/* Hero strip */}
      <motion.div
        {...stagger(0)}
        className="px-5 pt-8 pb-6 border-b border-border/50"
      >
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-lg font-semibold text-primary tracking-tight">
              {initials}
            </span>
          </div>
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight leading-tight">
              {displayName}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{roleLabel}</p>
          </div>
        </div>
      </motion.div>

      <div className="px-5 space-y-7 pt-6">

        {/* Stats */}
        <motion.div {...stagger(1)}>
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-3">
            Stats
          </p>
          <div className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border overflow-hidden">
            {[
              { label: "Day streak",  value: stats.streak, },
              { label: "Levels done",  value: stats.completed,},
              { label: "Challenges",  value: stats.challenges, },
            ].map(({ label: label, value}) => (
              <div key={label} className="flex flex-col items-center gap-1.5 py-4 px-2 bg-card">       
                <span className="text-[26px] font-semibold leading-none tabular-nums">
                  {value}
                </span>
                <span className="text-[10px] text-muted-foreground text-center leading-tight">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Progress */}
        <motion.div {...stagger(2)}>
          <div className="flex items-baseline justify-between mb-3">
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Course progress
            </p>
            <span className="text-xs text-muted-foreground">
              {stats.completed}
              <span className="text-muted-foreground/40 mx-0.5">/</span>
              20
            </span>
          </div>
          <Progress value={progressPercent} className="h-1" />
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-muted-foreground">Beginner</span>
            <span className="text-[10px] text-muted-foreground">Advanced</span>
          </div>
        </motion.div>

        {/* Weekly chart */}
        <motion.div {...stagger(3)}>
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-3">
            This week
          </p>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <WeeklyProgressChart />
          </div>
        </motion.div>

        {/* Menu */}
        <motion.div {...stagger(4)}>
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-2">
            Account
          </p>
          <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
            {[
              { label: "My Badges",          icon: Award,    action: () => navigate("/badges")   },
              { label: "Settings & Privacy", icon: Settings, action: () => navigate("/settings") },
            ].map(({ label, icon: Icon, action }) => (
              <button
                key={label}
                onClick={action}
                className="w-full flex items-center justify-between px-4 py-3.5 text-sm hover:bg-muted/50 active:bg-muted transition-colors text-left group"
              >
                <div className="flex items-center gap-3 text-foreground">
                  <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                  {label}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
              </button>
            ))}

            <div className="px-4 py-3">
              <ThemeToggle />
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-destructive/80 hover:text-destructive hover:bg-destructive/5 active:bg-destructive/10 transition-colors text-left"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} />
              {isGuest ? "Exit Guest Mode" : "Log Out"}
            </button>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default Profile;