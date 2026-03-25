import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const ALL_BADGES = [
  { key: "first_steps", label: "First Steps", emoji: "👣", description: "Complete your first level", requirement: "1 level completed" },
  { key: "rising_star", label: "Rising Star", emoji: "⭐", description: "Complete 5 levels", requirement: "5 levels completed" },
  { key: "algebra_pro", label: "Algebra Pro", emoji: "🧠", description: "Complete 10 levels", requirement: "10 levels completed" },
  { key: "master_mind", label: "Master Mind", emoji: "👑", description: "Complete all 20 levels", requirement: "20 levels completed" },
  { key: "perfect_score", label: "Perfect Score", emoji: "💯", description: "Get 100% on any level", requirement: "Score 100% on a level" },
  { key: "perfectionist", label: "Perfectionist", emoji: "🏆", description: "Get 3 perfect scores", requirement: "3 levels with 100%" },
];

const Badges = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [earnedBadges, setEarnedBadges] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase.from("user_badges").select("badge_key, earned_at").eq("user_id", user.id);
      const map: Record<string, string> = {};
      (data || []).forEach(b => { map[b.badge_key] = b.earned_at; });
      setEarnedBadges(map);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const earnedCount = Object.keys(earnedBadges).length;
  const progressPercent = Math.round((earnedCount / ALL_BADGES.length) * 100);

  return (
    <div className="pb-24 pt-4 px-4 space-y-4">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="font-display text-xl font-bold">My Badges</h1>
          <p className="text-sm text-muted-foreground">{earnedCount}/{ALL_BADGES.length} earned</p>
        </div>
      </motion.div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Collection Progress</CardTitle>
            <span className="text-xs font-bold">{progressPercent}%</span>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={progressPercent} className="h-2" />
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2].map(i => (
            <Card key={i}><CardContent className="h-28 animate-pulse" /></Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {ALL_BADGES.map((badge, idx) => {
            const earned = !!earnedBadges[badge.key];
            const earnedDate = earnedBadges[badge.key];
            return (
              <motion.div key={badge.key} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.06 }}>
                <Card className={earned ? "border-primary/20 bg-primary/5" : "opacity-60"}>
                  <CardContent className="pt-4 pb-3 text-center relative">
                    {!earned && <Lock className="h-3 w-3 text-muted-foreground absolute top-2 right-2" />}
                    <div className={`text-3xl mb-2 ${earned ? "" : "grayscale"}`}>{badge.emoji}</div>
                    <p className="text-sm font-bold">{badge.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{badge.description}</p>
                    {earned && earnedDate && (
                      <Badge variant="secondary" className="text-[10px] mt-2">
                        Earned {new Date(earnedDate).toLocaleDateString()}
                      </Badge>
                    )}
                    {!earned && (
                      <p className="text-[10px] text-muted-foreground mt-1.5 italic">{badge.requirement}</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Badges;
