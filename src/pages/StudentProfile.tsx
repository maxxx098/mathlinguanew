import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, Flame, Trophy, Star, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const BADGE_CONFIG: Record<string, { label: string; emoji: string }> = {
  first_steps: { label: "First Steps", emoji: "👣" },
  rising_star: { label: "Rising Star", emoji: "⭐" },
  algebra_pro: { label: "Algebra Pro", emoji: "🧠" },
  master_mind: { label: "Master Mind", emoji: "👑" },
  perfect_score: { label: "Perfect Score", emoji: "💯" },
  perfectionist: { label: "Perfectionist", emoji: "🏆" },
};

const StudentProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ display_name: string | null } | null>(null);
  const [stats, setStats] = useState({ completed: 0, challenges: 0, streak: 0 });
  const [badges, setBadges] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!userId) return;

      const [profileRes, progressRes, challengesRes, badgesRes] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("user_id", userId).single(),
        supabase.from("user_progress").select("completed").eq("user_id", userId).eq("completed", true),
        supabase.from("daily_challenge_completions").select("id").eq("user_id", userId),
        supabase.from("user_badges").select("badge_key").eq("user_id", userId),
      ]);

      setProfile(profileRes.data);
      setStats({
        completed: progressRes.data?.length || 0,
        challenges: challengesRes.data?.length || 0,
        streak: progressRes.data?.length || 0,
      });
      setBadges((badgesRes.data || []).map(b => b.badge_key));
      setLoading(false);
    };
    fetch();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center pb-24 pt-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const displayName = profile?.display_name || "Learner";

  return (
    <div className="pb-24 pt-4 px-4">
      <Button variant="ghost" size="sm" className="gap-1 mb-4" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
            <GraduationCap className="h-10 w-10" />
          </div>
          <h1 className="font-display text-xl font-bold">{displayName}</h1>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center rounded-xl border bg-card p-3">
            <Flame className="h-5 w-5 text-warning mb-1" />
            <p className="font-display text-lg font-bold">{stats.streak}</p>
            <p className="text-[10px] text-muted-foreground">Streak</p>
          </div>
          <div className="flex flex-col items-center rounded-xl border bg-card p-3">
            <Trophy className="h-5 w-5 text-success mb-1" />
            <p className="font-display text-lg font-bold">{stats.completed}</p>
            <p className="text-[10px] text-muted-foreground">Levels Done</p>
          </div>
          <div className="flex flex-col items-center rounded-xl border bg-card p-3">
            <Star className="h-5 w-5 text-primary mb-1" />
            <p className="font-display text-lg font-bold">{stats.challenges}</p>
            <p className="text-[10px] text-muted-foreground">Challenges</p>
          </div>
        </div>

        {badges.length > 0 && (
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <h2 className="font-display text-sm font-bold">Badges</h2>
            <div className="flex flex-wrap gap-2">
              {badges.map(b => (
                <span key={b} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium">
                  {BADGE_CONFIG[b]?.emoji || "🏅"} {BADGE_CONFIG[b]?.label || b}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h2 className="font-display text-sm font-bold">Learning Progress</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span>Overall</span>
              <span className="font-bold text-success">{stats.completed}/20</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-success transition-all" style={{ width: `${(stats.completed / 20) * 100}%` }} />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default StudentProfile;
