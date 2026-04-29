import { useEffect, useState, useCallback, useRef } from "react";
import Onboarding from "@/components/Onboarding";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useLives } from "@/contexts/LivesContext";
import DailyChallenge from "@/components/DailyChallenge";
import {
  Plus, MoreHorizontal, Lock, ClipboardList, BookOpen,
  AlertTriangle, Clock, CheckCircle2, Heart,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useGuestGate, GuestGateDialog } from "@/components/GuestGate";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import LearningPath from "@/components/LearningPath";
import Teacher from "@/assets/teacher.png";
import BG from "@/assets/bg.svg";
import teacherBG from "@/assets/teacherBG.png";

/* ─────────────────────────────────────────────────────────────────────────────
   Week bar chart
───────────────────────────────────────────────────────────────────────────── */
const WeekBarChart = ({ accent = "#4ade80" }: { accent?: string }) => {
  const days = ["F", "S", "S", "M", "T", "W", "T"];
  const vals = [3, 2, 4, 5, 4, 7, 9];
  const max = Math.max(...vals);
  return (
    <div className="flex flex-col items-center gap-1 flex-shrink-0">
      <div className="flex items-end gap-[3px] h-8">
        {vals.map((v, i) => (
          <div
            key={i}
            className="w-[5px] rounded-sm flex-shrink-0"
            style={{
              height: `${Math.round((v / max) * 100)}%`,
              background: i === vals.length - 1 ? accent : `${accent}55`,
            }}
          />
        ))}
      </div>
      <div className="flex gap-[3px]">
        {days.map((d, i) => (
          <span
            key={i}
            className="text-[7px] font-extrabold w-[5px] text-center text-muted-foreground"
            style={{ color: i === days.length - 1 ? accent : undefined }}
          >
            {d}
          </span>
        ))}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   Learner Tab Switcher
───────────────────────────────────────────────────────────────────────────── */
const LearnerTabs = ({
  tabs,
  active,
  onChange,
}: {
  tabs: string[];
  active: string;
  onChange: (t: string) => void;
}) => (
  <div className="flex gap-0">
    {tabs.map((tab) => {
      const isActive = active === tab;
      return (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className="relative px-5 py-3 text-[11px] font-black uppercase tracking-[0.15em] transition-colors"
          style={{ color: isActive ? "#27ff72" : "rgba(255,255,255,0.4)" }}
        >
          {tab}
          {isActive && (
            <motion.div
              layoutId="learner-tab-underline"
              className="absolute bottom-0 left-0 right-0 h-[2px]"
              style={{ background: "#27ff72" }}
            />
          )}
        </button>
      );
    })}
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   Pill tab switcher (Teacher)
───────────────────────────────────────────────────────────────────────────── */
const PillTabs = ({
  tabs,
  active,
  onChange,
}: {
  tabs: string[];
  active: string;
  onChange: (t: string) => void;
}) => (
  <div className="flex gap-1 p-1 rounded-full bg-black/20">
    {tabs.map((tab) => {
      const isActive = active === tab;
      return (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition-all ${
            isActive
              ? "bg-background text-foreground shadow-sm"
              : "text-white/80 hover:text-white"
          }`}
        >
          {tab}
        </button>
      );
    })}
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   Class card (teacher)
───────────────────────────────────────────────────────────────────────────── */
const ClassCard = ({
  icon, title, subtitle, metric, metricLabel, bg, fg,
  progressBar, progressVal, progressLabel, progressRight,
}: {
  icon: string; title: string; subtitle: string; metric?: string;
  metricLabel?: string; bg: string; fg: string; progressBar?: boolean;
  progressVal?: number; progressLabel?: string; progressRight?: string;
}) => (
  <div className="rounded-2xl p-4 flex flex-col gap-2" style={{ background: bg }}>
    <div className="flex justify-between items-start">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm"
        style={{ background: "rgba(0,0,0,0.2)", color: fg }}
      >
        {icon}
      </div>
      <MoreHorizontal className="h-4 w-4" style={{ color: `${fg}55` }} />
    </div>
    <div>
      <p className="font-extrabold text-sm leading-tight" style={{ color: fg }}>{title}</p>
      <p className="text-[10px] font-bold mt-0.5" style={{ color: `${fg}80` }}>{subtitle}</p>
    </div>
    {metric && (
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: `${fg}70` }}>{metricLabel}</p>
        <p className="text-xl font-black" style={{ color: fg }}>{metric}</p>
      </div>
    )}
    {progressBar && (
      <div>
        <div className="w-full rounded-full h-1.5 mb-1" style={{ background: "rgba(255,255,255,0.15)" }}>
          <div
            className="h-1.5 rounded-full"
            style={{
              width: `${progressVal}%`,
              background: progressVal && progressVal > 50 ? "#4ade80" : "#f87171",
            }}
          />
        </div>
        <div className="flex justify-between">
          <span
            className="text-[9px] font-black"
            style={{ color: progressVal && progressVal > 50 ? "#4ade80" : "#f87171" }}
          >
            {progressLabel}
          </span>
          <span className="text-[9px] font-bold" style={{ color: `${fg}50` }}>{progressRight}</span>
        </div>
      </div>
    )}
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   TEACHER DASHBOARD
───────────────────────────────────────────────────────────────────────────── */
const TeacherDashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ classCount: 0, studentCount: 0 });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("Overview");
  const [classes, setClasses] = useState<{
    id: string; name: string; class_code: string;
    studentCount: number; avgScore: number;
  }[]>([]);
  const [needsAttention, setNeedsAttention] = useState<{ name: string; avgScore: number; userId: string }[]>([]);

  useEffect(() => {
    const fetchTeacherStats = async () => {
      if (!user) return;
      const classesRes = await supabase
        .from("classes")
        .select("id, name, class_code")
        .eq("teacher_id", user.id);

      const allClasses = classesRes.data || [];
      const classIds = allClasses.map((c: any) => c.id);
      let classDetails: typeof classes = [];

      if (classIds.length > 0) {
        const { data: members } = await supabase
          .from("class_members")
          .select("user_id, class_id")
          .in("class_id", classIds);

        const totalStudents = members?.length || 0;
        const memberIds = [...new Set((members || []).map((m: any) => m.user_id))];
        let progressByUser: Record<string, { score: number; total: number }> = {};

        if (memberIds.length > 0) {
          const { data: progress } = await supabase
            .from("user_progress")
            .select("user_id, score, total_questions, completed")
            .in("user_id", memberIds)
            .eq("completed", true);

          (progress || []).forEach((p: any) => {
            if (!progressByUser[p.user_id]) progressByUser[p.user_id] = { score: 0, total: 0 };
            progressByUser[p.user_id].score += (p.score || 0);
            progressByUser[p.user_id].total += (p.total_questions || 0);
          });

          const { data: profs } = await supabase
            .from("profiles")
            .select("user_id, display_name")
            .in("user_id", memberIds);

          const profMap = Object.fromEntries(
            (profs || []).map((p: any) => [p.user_id, p.display_name || "Unknown"])
          );

          const struggling: typeof needsAttention = [];
          memberIds.forEach((uid) => {
            const prog = progressByUser[uid];
            const avg = prog && prog.total > 0 ? Math.round((prog.score / prog.total) * 100) : 0;
            if (avg < 50) struggling.push({ name: profMap[uid] || "Unknown", avgScore: avg, userId: uid });
          });
          setNeedsAttention(struggling.slice(0, 5));

          const { data: feed } = await supabase
            .from("class_feed")
            .select("*")
            .in("class_id", classIds)
            .order("created_at", { ascending: false })
            .limit(5);

          if (feed?.length) {
            const uids = [...new Set(feed.map((f: any) => f.user_id))];
            const { data: feedProfs } = await supabase
              .from("profiles")
              .select("user_id, display_name")
              .in("user_id", uids);
            const map = Object.fromEntries(
              (feedProfs || []).map((p: any) => [p.user_id, p.display_name])
            );
            setRecentActivity(feed.map((f: any) => ({ ...f, display_name: map[f.user_id] || "Unknown" })));
          }
        }

        classDetails = allClasses.map((c: any) => {
          const classMembers = (members || []).filter((m: any) => m.class_id === c.id);
          let totalPct = 0;
          let countWithProgress = 0;
          classMembers.forEach((m: any) => {
            const prog = progressByUser[m.user_id];
            if (prog && prog.total > 0) {
              totalPct += Math.round((prog.score / prog.total) * 100);
              countWithProgress++;
            }
          });
          const avgScore = countWithProgress > 0 ? Math.round(totalPct / countWithProgress) : 0;
          return {
            id: c.id, name: c.name, class_code: c.class_code,
            studentCount: classMembers.length, avgScore,
          };
        });

        setStats({ classCount: allClasses.length, studentCount: totalStudents });
      } else {
        setStats({ classCount: 0, studentCount: 0 });
      }

      setClasses(classDetails);
    };
    fetchTeacherStats();
  }, [user]);

  const displayName = profile?.display_name || profile?.first_name || "Teacher";

  const timeAgo = (d: string) => {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  const classCardColors = ["#27ff72", "#0d9488", "#7c3aed", "#d97706", "#2d7a45", "#dc2626"];
  const overallAvg = classes.length > 0
    ? Math.round(classes.reduce((s, c) => s + c.avgScore, 0) / classes.length)
    : 0;

  const renderOverview = () => (
    <div className="space-y-5">
      <div className="rounded-2xl p-4 flex items-center justify-between gap-3 bg-card border border-border">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ background: "#27ff72", color: "#0a0a0a" }}>INSIGHT</span>
            <span className="text-[9px] font-bold text-muted-foreground">Class report ›</span>
          </div>
          <p className="text-xs font-bold text-foreground leading-snug">
            {stats.studentCount > 0
              ? `Class avg is ${overallAvg}% this week. ${needsAttention.length} student${needsAttention.length !== 1 ? "s" : ""} need attention.`
              : "Create a class and invite students to get started!"}
          </p>
        </div>
        <WeekBarChart accent="#27ff72" />
      </div>

      <div>
        <div className="flex justify-between items-center mb-3">
          <p className="font-black text-foreground text-sm">Classes</p>
          <span className="text-xs font-bold text-muted-foreground">{stats.classCount} active</span>
        </div>
        {classes.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">No classes yet. Create one to get started!</p>
            <button onClick={() => navigate("/class")} className="text-sm font-bold text-primary mt-2">+ Create Class</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {classes.map((c, i) => (
              <div key={c.id} onClick={() => navigate("/class")} className="cursor-pointer">
                <ClassCard
                  icon={c.name.charAt(0).toUpperCase()} title={c.name}
                  subtitle={`${c.studentCount} student${c.studentCount !== 1 ? "s" : ""}`}
                  metric={c.avgScore > 0 ? `${c.avgScore}%` : undefined}
                  metricLabel={c.avgScore > 0 ? "CLASS AVG" : undefined}
                  bg={classCardColors[i % classCardColors.length]} fg="#ffffff"
                />
              </div>
            ))}
            {needsAttention.length > 0 && (
              <div className="rounded-2xl p-4 flex flex-col gap-2" style={{ background: "#111827" }}>
                <div className="flex justify-between items-start">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm bg-red-500/20 text-red-400">!</div>
                  <MoreHorizontal className="h-4 w-4 text-white/30" />
                </div>
                <div>
                  <p className="font-extrabold text-sm leading-tight text-white">Needs Attn.</p>
                  <p className="text-[10px] font-bold mt-0.5 text-white/50">{needsAttention.length} student{needsAttention.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="w-full rounded-full h-1.5 mb-1" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <div className="h-1.5 rounded-full bg-red-500" style={{ width: "40%" }} />
                </div>
                <button onClick={() => navigate("/class")} className="text-[10px] font-black text-red-400 text-left hover:text-red-300 transition-colors">
                  Review now
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <p className="font-black text-foreground text-sm mb-3">Recent Activity</p>
        <div className="rounded-2xl overflow-hidden bg-card border border-border">
          {recentActivity.length > 0 ? (
            recentActivity.map((item, i) => {
              const initials = (item.display_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2);
              return (
                <div key={i}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div
                      className="h-9 w-9 rounded-full flex items-center justify-center font-black text-[11px] text-white flex-shrink-0"
                      style={{ background: ["#1565c0", "#059669", "#d97706"][i % 3] }}
                    >
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-extrabold text-foreground">{item.display_name}</p>
                      <p className="text-xs font-semibold truncate text-muted-foreground">{item.content || item.action_type}</p>
                    </div>
                    <span className="text-xs font-bold flex-shrink-0 text-muted-foreground">{timeAgo(item.created_at)}</span>
                  </div>
                  {i < recentActivity.length - 1 && <div className="mx-4 h-px bg-border" />}
                </div>
              );
            })
          ) : (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">No recent activity yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderClasses = () => (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <p className="font-black text-foreground text-sm">Your Classes</p>
        <button onClick={() => navigate("/class")} className="flex items-center gap-1 text-xs font-black text-primary">
          <Plus className="h-3.5 w-3.5" /> New class
        </button>
      </div>
      {classes.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <BookOpen className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-bold text-foreground mb-1">No classes yet</p>
          <p className="text-xs text-muted-foreground mb-3">Create your first class to get started</p>
          <button onClick={() => navigate("/class")} className="px-4 py-2 rounded-full text-xs font-black" style={{ background: "#27ff72", color: "#0a0a0a" }}>
            Create Class
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {classes.map((c, i) => (
            <div key={c.id} onClick={() => navigate("/class")} className="cursor-pointer rounded-2xl p-4 bg-card border border-border hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white" style={{ background: classCardColors[i % classCardColors.length] }}>
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-extrabold text-sm text-foreground">{c.name}</p>
                  <p className="text-[10px] font-bold text-muted-foreground">Code: {c.class_code}</p>
                </div>
                <Badge variant="secondary" className="text-[10px]">{c.studentCount} students</Badge>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="w-full rounded-full h-1.5" style={{ background: "hsl(var(--muted))" }}>
                    <div className="h-1.5 rounded-full" style={{ width: `${c.avgScore}%`, background: c.avgScore > 50 ? "#4ade80" : "#f87171" }} />
                  </div>
                </div>
                <span className="text-xs font-black" style={{ color: c.avgScore > 50 ? "#4ade80" : "#f87171" }}>
                  {c.avgScore > 0 ? `${c.avgScore}% avg` : "No data"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      {needsAttention.length > 0 && (
        <div>
          <p className="font-black text-foreground text-sm mb-3">Students Needing Attention</p>
          <div className="rounded-2xl bg-card border border-border overflow-hidden">
            {needsAttention.map((s, i) => (
              <div key={i}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center font-black text-[10px] text-white bg-red-500/80">{s.name.charAt(0)}</div>
                  <div className="flex-1">
                    <p className="text-sm font-extrabold text-foreground">{s.name}</p>
                    <p className="text-[10px] font-bold text-muted-foreground">Avg: {s.avgScore}%</p>
                  </div>
                  <span className="text-[10px] font-black text-red-400">Needs help</span>
                </div>
                {i < needsAttention.length - 1 && <div className="mx-4 h-px bg-border" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen pb-24 bg-background" style={{ fontFamily: "'Nunito',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap');`}</style>
      <div
        className="relative pb-10"
        style={{
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
          backgroundImage: `url(${teacherBG})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to top, transparent 40%, rgba(0,0,0,0.6) 100%)" }} />
        <div className="absolute inset-0 pointer-events-none" style={{ borderBottomLeftRadius: 28, borderBottomRightRadius: 28, background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.6) 100%)" }} />

        <div className="max-w-screen-md mx-auto">
          <div className="relative px-5 pt-12 pb-0 flex justify-between items-start">
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Classroom Overview</p>
              <h1 className="text-2xl font-black mt-0.5 text-white">
                Hi, <span style={{ color: "#27ff72" }}>{displayName}</span>!
              </h1>
            </motion.div>
            <button
              className="flex items-center gap-1 px-3 py-2 rounded-full text-xs font-black"
              style={{ background: "rgba(255,255,255,0.18)", color: "white" }}
              onClick={() => navigate("/class")}
            >
              {stats.classCount > 0 ? <><BookOpen className="h-3.5 w-3.5" /> My class</> : <><Plus className="h-3.5 w-3.5" /> New class</>}
            </button>
          </div>

          <div className="px-5 pt-6 pb-0 relative overflow-hidden" style={{ minHeight: 200 }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex items-baseline leading-none">
              <span className="font-black" style={{ fontSize: "clamp(100px, 28vw, 200px)", lineHeight: 0.85, color: "#27ff72", letterSpacing: "-0.04em", marginLeft: "-4px" }}>
                {stats.studentCount}
              </span>
            </motion.div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="text-sm font-bold mt-2 max-w-xs leading-snug" style={{ color: "rgba(255,255,255,0.6)" }}>
              Students across <strong className="text-white">{stats.classCount} active {stats.classCount === 1 ? "class" : "classes"}</strong>.
            </motion.p>
          </div>

          <div className="relative px-5 pb-0 pt-6 grid grid-cols-2 gap-2">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}>
              <p className="text-[9px] font-black uppercase tracking-[0.12em] text-white/50">Classes</p>
              <p className="text-2xl font-black text-white mt-0.5 leading-none">{stats.classCount}</p>
              <p className="text-[9px] font-bold mt-1 text-white/40">active</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }} className="rounded-xl p-3" style={{ background: "rgba(39,255,114,0.15)", border: "1px solid rgba(39,255,114,0.3)" }}>
              <p className="text-[9px] font-black uppercase tracking-[0.12em]" style={{ color: "rgba(39,255,114,0.7)" }}>Avg Score</p>
              <p className="text-2xl font-black leading-none mt-0.5" style={{ color: "#27ff72" }}>{overallAvg}%</p>
              <p className="text-[9px] font-bold mt-1" style={{ color: "rgba(39,255,114,0.5)" }}>class avg</p>
            </motion.div>
          </div>

          <div className="px-5 pt-5 relative">
            <PillTabs tabs={["Overview", "Classes"]} active={activeTab} onChange={setActiveTab} />
          </div>
        </div>
      </div>

      <div className="max-w-screen-md mx-auto px-5 py-5">
        {activeTab === "Overview" && renderOverview()}
        {activeTab === "Classes" && renderClasses()}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   LEARNER HOME — clean, uses <LearningPath /> component only
───────────────────────────────────────────────────────────────────────────── */
const LearnerHome = () => {
  const { user, profile, isGuest } = useAuth();
  const [stats, setStats] = useState({ completed: 0, total: 20 });
  const [currentStageName, setCurrentStageName] = useState<string | null>(null);
  const [currentStageIndex, setCurrentStageIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("Path");
  const { gateOpen, setGateOpen } = useGuestGate();

  /* prevent swipe-back */
  useEffect(() => {
    const handlePopState = () => window.history.pushState(null, "", window.location.href);
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  /* fetch only stats + current stage for the header */
  useEffect(() => {
    const fetchStats = async () => {
      const [stagesRes, levelsRes] = await Promise.all([
        supabase.from("stages").select("id, title, order_index").order("order_index"),
        supabase.from("levels").select("id, stage_id, order_index").order("order_index"),
      ]);

      let progressMap: Record<string, boolean> = {};
      if (user) {
        const { data: progressData } = await supabase
          .from("user_progress").select("level_id, completed").eq("user_id", user.id);
        if (progressData) {
          progressData.forEach((p) => { progressMap[p.level_id] = !!p.completed; });
        }
      }

      if (stagesRes.data && levelsRes.data) {
        const allLevels = levelsRes.data;
        const completedCount = allLevels.filter((l) => progressMap[l.id]).length;
        setStats({ completed: completedCount, total: allLevels.length });

        // find first stage with an incomplete level
        let found = false;
        for (const stage of stagesRes.data) {
          const stageLevels = allLevels.filter((l) => l.stage_id === stage.id);
          if (stageLevels.some((l) => !progressMap[l.id]) && !found) {
            setCurrentStageName(stage.title);
            setCurrentStageIndex(stage.order_index);
            found = true;
          }
        }
      }
    };
    fetchStats();
  }, [user]);

  const displayName = profile?.display_name || profile?.first_name || (isGuest ? "Guest" : "Learner");
  const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  const streak = stats.completed > 0 ? Math.min(stats.completed, 7) : 0;
  const { lives, nextRefillSeconds } = useLives();
  const showTimer = lives < 5 && nextRefillSeconds !== null;
  function HeartbeatSVG() {
    const polyRef = useRef<SVGPolylineElement>(null);
    const offRef = useRef(0);
    const rafRef = useRef<number>(0);
  
    // one full ECG cycle spanning 28px wide, baseline at y=18
    const basePts: [number, number][] = [
      [0, 18],
      [4, 18],
      [5, 15],
      [6, 24],
      [8, 4],   // sharp spike up
      [10, 22],
      [12, 18],
      [28, 18],
    ];
  
    useEffect(() => {
      function draw() {
        if (!polyRef.current) return;
        offRef.current = (offRef.current + 0.5) % 28;
        const off = offRef.current;
  
        // duplicate the pattern so the scroll is seamless
        const doubled: [number, number][] = [
          ...basePts,
          ...basePts.map(([x, y]) => [x + 28, y] as [number, number]),
        ];
  
        const shifted = doubled
          .map(([x, y]) => [x - off, y] as [number, number])
          .filter(([x]) => x >= -2 && x <= 30);
  
        polyRef.current.setAttribute(
          "points",
          shifted.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")
        );
  
        rafRef.current = requestAnimationFrame(draw);
      }
  
      rafRef.current = requestAnimationFrame(draw);
      return () => cancelAnimationFrame(rafRef.current);
    }, []);
  
    return (
      <svg
        width="28"
        height="32"
        viewBox="0 0 28 32"
        fill="none"
        style={{ overflow: "visible" }}
      >
        <polyline
          ref={polyRef}
          stroke="rgba(248,113,113,0.75)"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="min-h-screen pb-24 bg-background" style={{ fontFamily: "'Nunito',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap');
        .stat-card        { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); }
        .stat-card-accent { background: rgba(39,255,114,0.12);  border: 1px solid rgba(39,255,114,0.25); }
        .stat-card-hearts { background: rgba(248,113,113,0.12); border: 1px solid rgba(248,113,113,0.25); }
        .insight-card     { background: hsl(var(--card));       border: 1px solid hsl(var(--border)); }
      `}</style>

      {/* ── HERO HEADER ── */}
      <div
        className="relative pb-10"
        style={{
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
          backgroundImage: `url(${BG})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to top, transparent 40%, rgba(0,0,0,0.6) 100%)" }} />
        <div className="absolute inset-0 pointer-events-none" style={{ borderBottomLeftRadius: 28, borderBottomRightRadius: 28, background: "linear-gradient(to bottom, transparent 1%, rgba(0,0,0,0.6) 100%)" }} />

        <div className="max-w-screen-md mx-auto">
          {/* greeting */}
          <div className="relative px-5 pt-12 pb-0">
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Student Overview</p>
              <h1 className="text-2xl font-black mt-0.5 text-white">
                {getGreeting()}, <span style={{ color: "#27ff72" }}>{displayName}</span>!
              </h1>
            </motion.div>
          </div>

          {/* hero: giant % */}
          <div className="px-5 pt-6 pb-0 relative overflow-hidden" style={{ minHeight: 180 }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex items-baseline leading-none">
              <span className="font-black text-white/60" style={{ fontSize: "clamp(100px, 28vw, 200px)", lineHeight: 0.85, letterSpacing: "-0.04em", marginLeft: "-4px" }}>
                {progress}
              </span>
              <span className="font-black text-white/60" style={{ fontSize: "clamp(36px, 9vw, 64px)", marginLeft: "-4px", marginBottom: 8, alignSelf: "flex-end" }}>
                %
              </span>
            </motion.div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="text-sm font-bold mt-2 max-w-xs leading-snug text-muted-foreground">
              {currentStageName
                ? <><strong className="text-white">Algebra Journey</strong>. Tackling <strong className="text-white">{currentStageName}</strong> now.</>
                : <><strong className="text-white">Algebra Journey</strong> complete. Outstanding!</>}
            </motion.p>
          </div>

        {/* 4 stat chips */}
        <div className="relative px-5 pb-0 pt-5 grid grid-cols-4 gap-2">

          {/* DONE */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.30 }}
            className="stat-card rounded-xl p-3 overflow-hidden"
          >
            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-white/50">Done</p>
            <div className="flex items-start justify-between mt-0.5">
              <div>
                <p className="text-2xl font-black text-white leading-none">{stats.completed}</p>
                <p className="text-[9px] font-bold mt-1 text-white/40">/ {stats.total}</p>
              </div>
              <svg width="28" height="32" viewBox="0 0 28 32" fill="none">
                <path d="M2,10 Q5,4 8,10 Q11,16 14,10 Q17,4 20,10 Q23,16 26,10" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <path d="M2,18 Q5,12 8,18 Q11,24 14,18 Q17,12 20,18 Q23,24 26,18" stroke="rgba(255,255,255,0.15)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <path d="M2,26 Q5,20 8,26 Q11,32 14,26 Q17,20 20,26 Q23,32 26,26" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </div>
          </motion.div>

          {/* STREAK */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.36 }}
            className="stat-card rounded-xl p-3 overflow-hidden"
          >
            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-white/50">Streak</p>
            <div className="flex items-start justify-between mt-0.5">
              <div>
                <p className="text-2xl font-black text-white leading-none">{streak}</p>
                <p className="text-[9px] font-bold mt-1 text-white/40">Levels</p>
              </div>
              <svg width="28" height="32" viewBox="0 0 28 32" fill="none">
                <path d="M2,10 Q5,4 8,10 Q11,16 14,10 Q17,4 20,10 Q23,16 26,10" stroke="rgba(255,159,67,0.45)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <path d="M2,18 Q5,12 8,18 Q11,24 14,18 Q17,12 20,18 Q23,24 26,18" stroke="rgba(255,159,67,0.22)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <path d="M2,26 Q5,20 8,26 Q11,32 14,26 Q17,20 20,26 Q23,32 26,26" stroke="rgba(255,159,67,0.08)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </div>
          </motion.div>

          {/* STAGE */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.42 }}
            className="stat-card-accent rounded-xl p-3 overflow-hidden"
          >
            <p className="text-[9px] font-black uppercase tracking-[0.12em]" style={{ color: "rgba(39,255,114,0.65)" }}>Stage</p>
            <div className="flex items-start justify-between mt-0.5">
              <div>
                <p className="text-2xl font-black leading-none" style={{ color: "#27ff72" }}>{currentStageIndex ?? "✓"}</p>
                <p className="text-[9px] font-bold mt-1 truncate" style={{ color: "rgba(39,255,114,0.55)" }}>{currentStageName ?? "Done!"}</p>
              </div>
              <svg width="28" height="32" viewBox="0 0 28 32" fill="none">
                <path d="M2,10 Q5,4 8,10 Q11,16 14,10 Q17,4 20,10 Q23,16 26,10" stroke="rgba(39,255,114,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <path d="M2,18 Q5,12 8,18 Q11,24 14,18 Q17,12 20,18 Q23,24 26,18" stroke="rgba(39,255,114,0.18)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <path d="M2,26 Q5,20 8,26 Q11,32 14,26 Q17,20 20,26 Q23,32 26,26" stroke="rgba(39,255,114,0.07)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </div>
          </motion.div>

          {/* HEARTS */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.48 }}
            className="stat-card-hearts rounded-xl p-3 overflow-hidden"
          >
            <p className="text-[9px] font-black uppercase tracking-[0.12em]" style={{ color: "rgba(248,113,113,0.65)" }}>Hearts</p>
            <div className="flex items-start justify-between mt-0.5">
              <div>
                <p className="text-2xl font-black text-white leading-none">{lives}</p>
                <p className="text-[9px] font-bold mt-1" style={{ color: "rgba(248,113,113,0.55)" }}>
                  {showTimer && nextRefillSeconds !== null ? formatTime(nextRefillSeconds) : "remaining"}
                </p>
              </div>
              <HeartbeatSVG />
            </div>
          </motion.div>

        </div>

          {/* tab bar */}
          <div className="px-5 pt-5">
            <LearnerTabs tabs={["Path", "Daily"]} active={activeTab} onChange={setActiveTab} />
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="max-w-screen-md mx-auto px-5 py-5 space-y-5">
        {activeTab === "Path" && (
          <>
            {/* insight strip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="insight-card rounded-xl p-4 flex items-center justify-between gap-3"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded" style={{ background: "#27ff72", color: "#0a0a0a" }}>
                    INSIGHT
                  </span>
                  <span className="text-[9px] font-bold text-muted-foreground">Your progress ›</span>
                </div>
                <p className="text-xs font-bold leading-snug text-muted-foreground">
                  You've completed <strong style={{ color: "#27ff72" }}>{stats.completed} levels</strong>. Keep going!
                </p>
              </div>
              <WeekBarChart accent="#27ff72" />
            </motion.div>

            {/* LearningPath handles all stage/level rendering */}
            <LearningPath />
          </>
        )}

        {activeTab === "Daily" && <DailyChallenge />}
      </div>

      <GuestGateDialog open={gateOpen} onOpenChange={setGateOpen} />
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   ROOT
───────────────────────────────────────────────────────────────────────────── */
const Index = () => {
  const { user, profile, userRole, loading, refreshProfile } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!loading && user && profile && !profile.onboarding_completed) {
      setShowOnboarding(true);
    }
  }, [loading, user, profile]);

  const handleOnboardingComplete = useCallback(async () => {
    if (user) {
      await supabase.from("profiles").update({ onboarding_completed: true }).eq("user_id", user.id);
      await refreshProfile();
    }
    setShowOnboarding(false);
  }, [user, refreshProfile]);

  if (loading) return null;
  if (showOnboarding) return <Onboarding onComplete={handleOnboardingComplete} />;
  if (userRole === "teacher") return <TeacherDashboard />;
  return <LearnerHome />;
};

export default Index;