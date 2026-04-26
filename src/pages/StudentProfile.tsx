import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
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

const ACTIVITY_TOPICS = [
  { label: "Equations", key: "equations", count: 9, max: 10 },
  { label: "Word Problems", key: "word", count: 4, max: 10 },
  { label: "Geometry", key: "geometry", count: 2, max: 10 },
  { label: "Daily Challenges", key: "challenges", count: 4, max: 10 },
];

const StudentProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ display_name: string | null } | null>(null);
  const [stats, setStats] = useState({ completed: 0, challenges: 0, streak: 0 });
  const [badges, setBadges] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

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
      setBadges((badgesRes.data || []).map((b) => b.badge_key));
      setLoading(false);
      setTimeout(() => setMounted(true), 50);
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
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const totalLevels = 20;
  const progressPct = Math.round((stats.completed / totalLevels) * 100);
  const earnedBadges = Object.keys(BADGE_CONFIG).filter((k) => badges.includes(k));
  const lockedBadges = Object.keys(BADGE_CONFIG).filter((k) => !badges.includes(k));

  return (
    <div className="pb-24 pt-4 px-4 space-y-3">
      {/* Back */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-muted-foreground font-body text-xs tracking-widest uppercase"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </Button>

      {/* ── Hero Card ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl bg-foreground px-6 pt-6 pb-5"
      >
        {/* Subtle radial tint using primary color feel */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,hsl(174_57%_32%_/_0.18),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_10%_90%,hsl(101_33%_45%_/_0.10),transparent_55%)]" />

        <div className="relative z-10 space-y-5">
          {/* Eyebrow */}
          <p className="font-body text-[10px] tracking-[0.18em] uppercase text-primary">
            Student Profile
          </p>

          {/* Identity row */}
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] bg-primary text-primary-foreground font-display text-xl font-bold">
              {initials}
            </div>
            <div className="pt-1">
              <h1 className="font-display text-2xl font-light leading-tight tracking-tight text-background">
                {displayName.split(" ").map((word, i) =>
                  i === displayName.split(" ").length - 1 ? (
                    <em key={i} className="italic font-light">{word}</em>
                  ) : (
                    <span key={i}>{word} </span>
                  )
                )}
              </h1>
              <p className="font-body text-[11px] tracking-[0.1em] uppercase text-primary/70 mt-0.5">
                Algebra · Level 2
              </p>
            </div>
          </div>

          {/* Active pill */}
          <div className="inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            <span className="font-body text-[10px] tracking-[0.12em] uppercase text-primary">
              Active learner
            </span>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-primary/20 to-transparent" />

          {/* Stats row */}
          <div className="grid grid-cols-3">
            {[
              { value: stats.completed, label: "Levels Done" },
              { value: stats.streak, label: "Day Streak" },
              { value: stats.challenges, label: "Challenges" },
            ].map((s, i) => (
              <div
                key={s.label}
                className={`flex flex-col gap-1 ${
                  i === 0 ? "items-start" : i === 2 ? "items-end" : "items-center"
                } ${i === 1 ? "border-x border-primary/15 px-4" : i === 2 ? "pl-4" : "pr-4"}`}
              >
                <span className="font-display text-2xl font-light text-background leading-none">
                  {String(s.value).padStart(2, "0")}
                </span>
                <span className="font-body text-[9px] tracking-[0.12em] uppercase text-primary/60">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Progress Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-2xl border border-border bg-card px-5 py-5 space-y-4"
      >
        <p className="font-body text-[9px] tracking-[0.18em] uppercase text-muted-foreground">
          Learning Progress
        </p>

        {/* Main bar */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="font-body text-xs text-muted-foreground">Overall completion</span>
            <span className="font-display text-base font-semibold text-foreground">
              {stats.completed}
              <span className="font-normal text-muted-foreground text-xs"> / {totalLevels}</span>
            </span>
          </div>
          <div className="h-[3px] rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-success transition-all duration-1000 ease-out"
              style={{ width: mounted ? `${progressPct}%` : "0%" }}
            />
          </div>
        </div>

        {/* Topic bars */}
        <div className="space-y-3 border-t border-border pt-4">
          {ACTIVITY_TOPICS.map((t) => (
            <div key={t.key} className="flex items-center gap-3">
              <span className="font-body text-xs text-muted-foreground w-28 shrink-0">
                {t.label}
              </span>
              <div className="flex-1 h-[2px] rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-1000 ease-out"
                  style={{ width: mounted ? `${(t.count / t.max) * 100}%` : "0%" }}
                />
              </div>
              <span className="font-body text-[10px] text-muted-foreground w-4 text-right">
                {t.count}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Badges Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="rounded-2xl border border-border bg-card px-5 py-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <p className="font-body text-[9px] tracking-[0.18em] uppercase text-muted-foreground">
            Badges
          </p>
          <span className="font-body text-[10px] text-muted-foreground">
            {earnedBadges.length} of {Object.keys(BADGE_CONFIG).length} unlocked
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {earnedBadges.map((b) => (
            <span
              key={b}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-body text-primary"
            >
              {BADGE_CONFIG[b]?.emoji} {BADGE_CONFIG[b]?.label}
            </span>
          ))}
          {lockedBadges.map((b) => (
            <span
              key={b}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-body text-muted-foreground opacity-50"
            >
              {BADGE_CONFIG[b]?.emoji} {BADGE_CONFIG[b]?.label}
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default StudentProfile;