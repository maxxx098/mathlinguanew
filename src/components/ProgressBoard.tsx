import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Trophy, Flame, Medal, Star, Zap, Crown, Target, Award, ChevronDown, ChevronUp, Search, UserMinus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  completed_levels: number;
  total_score: number;
  badges: string[];
  recent_activity: string | null;
}

const BADGE_CONFIG: Record<string, { label: string; emoji: string; description: string; color: string }> = {
  first_steps: { label: "First Steps", emoji: "👣", description: "Completed your first level", color: "bg-primary/10 text-primary" },
  rising_star: { label: "Rising Star", emoji: "⭐", description: "Completed 5 levels", color: "bg-warning/10 text-warning" },
  algebra_pro: { label: "Algebra Pro", emoji: "🧠", description: "Completed 10 levels", color: "bg-success/10 text-success" },
  master_mind: { label: "Master Mind", emoji: "👑", description: "Completed all 20 levels", color: "bg-primary/10 text-primary" },
  perfect_score: { label: "Perfect Score", emoji: "💯", description: "Got 100% on a level", color: "bg-success/10 text-success" },
  perfectionist: { label: "Perfectionist", emoji: "🏆", description: "3 perfect scores", color: "bg-warning/10 text-warning" },
};

const TOTAL_LEVELS = 20;

const ProgressBoard = ({ classId, teacherId }: { classId: string; teacherId: string }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const isTeacher = user?.id === teacherId;

  const fetchData = async () => {
    if (!user) return;

    const { data: members } = await supabase.from("class_members").select("user_id").eq("class_id", classId);

    let memberIds = (members || []).map(m => m.user_id);
    // Remove teacher from the list — learners shouldn't see the teacher in progress board
    if (!isTeacher) {
      memberIds = memberIds.filter(id => id !== teacherId);
    }
    if (memberIds.length === 0) { setLoading(false); return; }

    const [profilesRes, progressRes, badgesRes, feedRes] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name").in("user_id", memberIds),
      supabase.from("user_progress").select("user_id, completed, score").in("user_id", memberIds),
      supabase.from("user_badges").select("user_id, badge_key").in("user_id", memberIds),
      supabase.from("class_feed").select("user_id, content, created_at").eq("class_id", classId).order("created_at", { ascending: false }).limit(50),
    ]);

    const profileMap = Object.fromEntries((profilesRes.data || []).map(p => [p.user_id, p.display_name || "Unknown"]));

    const progressMap: Record<string, { completed: number; score: number }> = {};
    (progressRes.data || []).forEach(p => {
      if (!progressMap[p.user_id]) progressMap[p.user_id] = { completed: 0, score: 0 };
      if (p.completed) progressMap[p.user_id].completed += 1;
      progressMap[p.user_id].score += (p.score || 0);
    });

    const badgeMap: Record<string, string[]> = {};
    (badgesRes.data || []).forEach(b => {
      if (!badgeMap[b.user_id]) badgeMap[b.user_id] = [];
      badgeMap[b.user_id].push(b.badge_key);
    });

    const recentMap: Record<string, string> = {};
    (feedRes.data || []).forEach(f => {
      if (!recentMap[f.user_id] && f.content) recentMap[f.user_id] = f.content;
    });

    const lb: LeaderboardEntry[] = memberIds.map(uid => ({
      user_id: uid,
      display_name: uid === user.id ? "You" : (profileMap[uid] || "Unknown"),
      completed_levels: progressMap[uid]?.completed || 0,
      total_score: progressMap[uid]?.score || 0,
      badges: badgeMap[uid] || [],
      recent_activity: recentMap[uid] || null,
    }));

    lb.sort((a, b) => b.completed_levels - a.completed_levels || b.total_score - a.total_score);
    setEntries(lb);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [classId, user]);

  const handleRemoveStudent = async (studentId: string) => {
    const { error } = await supabase
      .from("class_members")
      .delete()
      .eq("class_id", classId)
      .eq("user_id", studentId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Student removed from class");
      setEntries(prev => prev.filter(e => e.user_id !== studentId));
    }
  };

  const filteredEntries = entries.filter(e =>
    e.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="mb-6">
        <h2 className="font-display text-base font-bold mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" /> Progress Board
        </h2>
        <div className="space-y-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-16 rounded-xl border bg-card animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const getRankIcon = (idx: number) => {
    if (idx === 0) return <Crown className="h-4 w-4 text-warning" />;
    if (idx === 1) return <Medal className="h-4 w-4 text-muted-foreground" />;
    if (idx === 2) return <Award className="h-4 w-4 text-amber-700" />;
    return <span className="text-xs font-bold text-muted-foreground">{idx + 1}</span>;
  };

  return (
    <div className="mb-6">
      <h2 className="font-display text-base font-bold mb-3 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-primary" /> Progress Board
      </h2>

      {/* Search bar */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search students..."
          className="pl-9 h-9 text-sm"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredEntries.length === 0 ? (
        <div className="rounded-xl border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            {searchQuery ? "No students found" : "No members yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEntries.map((member, idx) => {
            const isExpanded = expandedUser === member.user_id;
            const progressPct = Math.min((member.completed_levels / TOTAL_LEVELS) * 100, 100);
            const isYou = member.display_name === "You";
            const isStudent = member.user_id !== teacherId;

            return (
              <motion.div
                key={member.user_id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <button
                  onClick={() => setExpandedUser(isExpanded ? null : member.user_id)}
                  className={`w-full text-left rounded-xl border p-3 transition-all duration-200 ${
                    isYou ? "bg-primary/5 border-primary/20" : "bg-card hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      {getRankIcon(idx)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">{member.display_name}</p>
                        {member.badges.length > 0 && (
                          <div className="flex -space-x-0.5">
                            {member.badges.slice(0, 3).map(b => (
                              <span key={b} className="text-xs" title={BADGE_CONFIG[b]?.label}>
                                {BADGE_CONFIG[b]?.emoji || "🏅"}
                              </span>
                            ))}
                            {member.badges.length > 3 && (
                              <span className="text-[10px] text-muted-foreground ml-1">+{member.badges.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Target className="h-3 w-3" /> {member.completed_levels}/{TOTAL_LEVELS}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Zap className="h-3 w-3" /> {member.total_score} pts
                        </span>
                      </div>
                    </div>

                    <div className="relative h-10 w-10 shrink-0">
                      <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          className="stroke-muted"
                          strokeWidth="3"
                        />
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          className="stroke-success"
                          strokeWidth="3"
                          strokeDasharray={`${progressPct}, 100`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground">
                        {Math.round(progressPct)}%
                      </span>
                    </div>

                    <div className="shrink-0 text-muted-foreground">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-b-xl border border-t-0 bg-card/50 px-4 py-3 space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-muted-foreground">Level Progress</span>
                            <span className="text-xs font-bold text-foreground">{member.completed_levels} of {TOTAL_LEVELS}</span>
                          </div>
                          <div className="flex gap-0.5">
                            {Array.from({ length: TOTAL_LEVELS }).map((_, i) => (
                              <div
                                key={i}
                                className={`h-2 flex-1 rounded-full transition-colors ${
                                  i < member.completed_levels ? "bg-success" : "bg-muted"
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        {member.badges.length > 0 && (
                          <div>
                            <span className="text-xs font-medium text-muted-foreground">Badges Earned</span>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {member.badges.map(b => {
                                const cfg = BADGE_CONFIG[b];
                                if (!cfg) return null;
                                return (
                                  <span
                                    key={b}
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${cfg.color}`}
                                    title={cfg.description}
                                  >
                                    {cfg.emoji} {cfg.label}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {member.badges.length === 0 && (
                          <div>
                            <span className="text-xs font-medium text-muted-foreground">Badges</span>
                            <p className="text-xs text-muted-foreground mt-1">No badges yet — complete levels to earn them!</p>
                          </div>
                        )}

                        {member.recent_activity && (
                          <div>
                            <span className="text-xs font-medium text-muted-foreground">Recent Activity</span>
                            <p className="text-xs text-foreground mt-1 flex items-start gap-1.5">
                              <Flame className="h-3 w-3 text-warning shrink-0 mt-0.5" />
                              {member.recent_activity}
                            </p>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-2 pt-1">
                          {!isYou && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs gap-1 flex-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/student/${member.user_id}`);
                              }}
                            >
                              View Profile
                            </Button>
                          )}
                          {isTeacher && isStudent && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs gap-1 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveStudent(member.user_id);
                              }}
                            >
                              <UserMinus className="h-3.5 w-3.5" /> Remove
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProgressBoard;
