import { useEffect, useState, useRef } from "react";
import { cubicBezier, motion } from "framer-motion";
import { GraduationCap, Flame, Trophy, Star, Settings, LogOut, Award, Camera, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import WeeklyProgressChart from "@/components/WeeklyProgressChart";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, userRole, signOut, isGuest, refreshProfile } = useAuth();
  const [stats, setStats] = useState({ completed: 0, challenges: 0, streak: 0 });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2MB"); return; }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) { toast.error("Upload failed"); setUploading(false); return; }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const avatarUrl = `${publicUrl}?t=${Date.now()}`;

    await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("user_id", user.id);
    await refreshProfile();
    toast.success("Avatar updated!");
    setUploading(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const displayName = profile?.display_name || (isGuest ? "Guest Learner" : "Learner");
  const roleLabel = userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : (isGuest ? "Guest" : "Learner");
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
          <div className="flex items-center justify-center shrink-0 relative group-[]:">
           {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="h-20 w-20 rounded-full object-cover border-2 border-primary/20" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <GraduationCap className="h-10 w-10" />
                </div>
              )}
              {!isGuest && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
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