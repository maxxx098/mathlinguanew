import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, Flame, Trophy, Star, Settings, LogOut, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import WeeklyProgressChart from "@/components/WeeklyProgressChart";

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
  const roleLabel = userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : (isGuest ? "Guest" : "Learner");
  const progressPercent = Math.round((stats.completed / 20) * 100);

  return (
    <div className="pb-24 pt-4 px-4 space-y-4">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        {/* Avatar & Name */}
        <Card>
          <CardContent className="pt-6 flex flex-col items-center text-center space-y-3">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
              <GraduationCap className="h-10 w-10" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold">{displayName}</h1>
              <p className="text-sm text-muted-foreground">{roleLabel}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Flame, label: "Streak", value: stats.streak, color: "text-warning" },
          { icon: Trophy, label: "Levels Done", value: stats.completed, color: "text-success" },
          { icon: Star, label: "Challenges", value: stats.challenges, color: "text-primary" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-3 pb-3 flex flex-col items-center">
              <stat.icon className={`h-5 w-5 mb-1 ${stat.color}`} />
              <p className="font-display text-lg font-bold">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Learning Progress</CardTitle>
            <span className="text-xs font-bold text-success">{stats.completed}/20</span>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={progressPercent} className="h-2" />
        </CardContent>
      </Card>

      <WeeklyProgressChart />

      {/* Actions */}
      <Card>
        <CardContent className="pt-4 space-y-2">
          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate("/badges")}>
            <Award className="h-4 w-4" /> My Badges
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate("/settings")}>
            <Settings className="h-4 w-4" /> Settings & Privacy
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-2 text-destructive" onClick={handleLogout}>
            <LogOut className="h-4 w-4" /> {isGuest ? "Exit Guest Mode" : "Log Out"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
