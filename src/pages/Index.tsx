import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import DailyChallenge from "@/components/DailyChallenge";
import { Plus, MoreHorizontal, Lock, Check, Star } from "lucide-react";
import HeartsDisplay from "@/components/HeartsDisplay";
import { useAuth } from "@/contexts/AuthContext";
import { useGuestGate, GuestGateDialog } from "@/components/GuestGate";
import { supabase } from "@/integrations/supabase/client";
import Tarsi from "@/assets/tar.png"
/* ─────────────────────────────────────────────────────────────────────────────
   MASCOT: Blue bear with graduation cap (Teacher)
───────────────────────────────────────────────────────────────────────────── */
const MascotBlue = () => (
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="40" cy="58" rx="18" ry="16" fill="#1a56a0" />
    <ellipse cx="40" cy="63" rx="11" ry="10" fill="white" />
    <circle cx="40" cy="60" r="4" fill="#1a56a0" />
    <text x="37.5" y="63" fontSize="5" fill="white" fontWeight="bold">★</text>
    <circle cx="40" cy="32" r="20" fill="#2d6fc0" />
    <circle cx="22" cy="18" r="7" fill="#1a56a0" />
    <circle cx="58" cy="18" r="7" fill="#1a56a0" />
    <circle cx="22" cy="18" r="4" fill="#5090d8" />
    <circle cx="58" cy="18" r="4" fill="#5090d8" />
    <circle cx="33" cy="29" r="4" fill="white" />
    <circle cx="47" cy="29" r="4" fill="white" />
    <circle cx="34" cy="30" r="2.5" fill="#1a1a1a" />
    <circle cx="48" cy="30" r="2.5" fill="#1a1a1a" />
    <circle cx="34.8" cy="29.2" r="0.9" fill="white" />
    <circle cx="48.8" cy="29.2" r="0.9" fill="white" />
    <ellipse cx="40" cy="38" rx="7" ry="5" fill="#5090d8" />
    <ellipse cx="40" cy="36" rx="3" ry="2" fill="#1a3a80" />
    <path d="M35 40 Q40 44 45 40" stroke="#1a3a80" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <rect x="22" y="13" width="36" height="4" rx="1.5" fill="#111827" />
    <rect x="30" y="5" width="20" height="9" rx="3" fill="#111827" />
    <line x1="58" y1="14" x2="63" y2="22" stroke="#f5c842" strokeWidth="2" />
    <circle cx="63" cy="23" r="2.5" fill="#f5c842" />
  </svg>
);

/* ─────────────────────────────────────────────────────────────────────────────
   MASCOT: Green bear (Learner) - placeholder
───────────────────────────────────────────────────────────────────────────── */
const MascotGreen = () => (
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="40" cy="58" rx="18" ry="16" fill="#1a6a30" />
    <ellipse cx="40" cy="63" rx="11" ry="10" fill="white" />
    <circle cx="40" cy="60" r="4" fill="#1a6a30" />
    <text x="37.5" y="63" fontSize="5" fill="white" fontWeight="bold">★</text>
    <circle cx="40" cy="32" r="20" fill="#2d7a45" />
    <circle cx="22" cy="18" r="7" fill="#1a6a30" />
    <circle cx="58" cy="18" r="7" fill="#1a6a30" />
    <circle cx="22" cy="18" r="4" fill="#50d878" />
    <circle cx="58" cy="18" r="4" fill="#50d878" />
    <circle cx="33" cy="29" r="4" fill="white" />
    <circle cx="47" cy="29" r="4" fill="white" />
    <circle cx="34" cy="30" r="2.5" fill="#1a1a1a" />
    <circle cx="48" cy="30" r="2.5" fill="#1a1a1a" />
    <circle cx="34.8" cy="29.2" r="0.9" fill="white" />
    <circle cx="48.8" cy="29.2" r="0.9" fill="white" />
    <ellipse cx="40" cy="38" rx="7" ry="5" fill="#50d878" />
    <ellipse cx="40" cy="36" rx="3" ry="2" fill="#1a3a25" />
    <path d="M35 40 Q40 44 45 40" stroke="#1a3a25" strokeWidth="1.5" strokeLinecap="round" fill="none" />
  </svg>
);

/* ─────────────────────────────────────────────────────────────────────────────
   Week bar chart with day labels  F S S M T W T
───────────────────────────────────────────────────────────────────────────── */
const WeekBarChart = ({ accent = "#4ade80" }: { accent?: string }) => {
  const days = ["F","S","S","M","T","W","T"];
  const vals = [3, 2, 4, 5, 4, 7, 9];
  const max = Math.max(...vals);
  return (
    <div className="flex flex-col items-center gap-1 flex-shrink-0">
      <div className="flex items-end gap-[3px] h-8">
        {vals.map((v, i) => (
          <div key={i} className="w-[5px] rounded-sm flex-shrink-0"
            style={{ height: `${Math.round((v / max) * 100)}%`, background: i === vals.length - 1 ? accent : `${accent}55` }} />
        ))}
      </div>
      <div className="flex gap-[3px]">
        {days.map((d, i) => (
          <span key={i} className="text-[7px] font-extrabold w-[5px] text-center"
            style={{ color: i === days.length - 1 ? accent : "rgba(255,255,255,0.3)" }}>
            {d}
          </span>
        ))}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   Pill tab switcher
───────────────────────────────────────────────────────────────────────────── */
const PillTabs = ({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) => (
  <div className="flex gap-1 p-1 rounded-full" style={{ background: "rgba(0,0,0,0.2)" }}>
    {tabs.map(tab => {
      const isActive = active === tab;
      return (
        <button key={tab} onClick={() => onChange(tab)}
          className="px-4 py-1.5 rounded-full text-xs font-extrabold transition-all"
          style={{ background: isActive ? "white" : "transparent", color: isActive ? "#1a3a25" : "rgba(255,255,255,0.65)" }}>
          {tab}
        </button>
      );
    })}
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   Lesson / Content card
───────────────────────────────────────────────────────────────────────────── */
const getLevelIcon = (title: string, emoji: string): string => {
  // Use meaningful math symbols based on title keywords
  const t = title.toLowerCase();
  if (t.includes("linear")) return "X";
  if (t.includes("variable")) return "Σ";
  if (t.includes("quadratic")) return "Q";
  if (t.includes("function")) return "F";
  if (t.includes("equation")) return "=";
  if (t.includes("expression")) return "E";
  if (t.includes("graph")) return "G";
  if (t.includes("slope")) return "Δ";
  if (t.includes("inequalit")) return "≠";
  if (t.includes("factor")) return "×";
  if (t.includes("polynom")) return "P";
  if (t.includes("review")) return "★";
  // Fallback: first letter of title
  return title.charAt(0).toUpperCase() || emoji;
};

const LessonCard = ({ icon, title, subtitle, xpLabel, xpValue, statusLabel, statusValue, bg, fg, locked }:
  { icon: string; title: string; subtitle: string; xpLabel?: string; xpValue?: string; statusLabel?: string; statusValue?: string; bg: string; fg: string; locked?: boolean }) => (
  <div className="rounded-2xl p-4 flex flex-col gap-2" style={{ background: bg }}>
    <div className="flex justify-between items-start">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg"
        style={{ background: "rgba(0,0,0,0.22)", color: fg }}>{icon}</div>
      <MoreHorizontal className="h-4 w-4" style={{ color: `${fg}55` }} />
    </div>
    <div>
      <p className="font-extrabold text-sm leading-tight" style={{ color: fg }}>{title}</p>
      <p className="text-[10px] font-bold mt-0.5" style={{ color: `${fg}88` }}>{subtitle}</p>
    </div>
    {xpLabel && !locked && (
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: `${fg}70` }}>{xpLabel}</p>
        <p className="text-base font-black" style={{ color: fg }}>{xpValue}</p>
      </div>
    )}
    {statusLabel && (
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: `${fg}70` }}>{statusLabel}</p>
        <p className="text-base font-black text-green-500">{statusValue}</p>
      </div>
    )}
    {locked && (
      <div className="flex justify-between items-center mt-1">
        <div className="flex items-center gap-1">
          <Lock className="h-3 w-3" style={{ color: `${fg}60` }} />
          <span className="text-[9px] font-black" style={{ color: `${fg}60` }}>Locked</span>
        </div>
        <span className="text-[9px] font-black" style={{ color: `${fg}60` }}>{xpValue}</span>
      </div>
    )}
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   Class card (teacher)
───────────────────────────────────────────────────────────────────────────── */
const ClassCard = ({ icon, title, subtitle, metric, metricLabel, bg, fg, progressBar, progressVal, progressLabel, progressRight }:
  { icon: string; title: string; subtitle: string; metric?: string; metricLabel?: string; bg: string; fg: string; progressBar?: boolean; progressVal?: number; progressLabel?: string; progressRight?: string }) => (
  <div className="rounded-2xl p-4 flex flex-col gap-2" style={{ background: bg }}>
    <div className="flex justify-between items-start">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm"
        style={{ background: "rgba(0,0,0,0.2)", color: fg }}>{icon}</div>
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
          <div className="h-1.5 rounded-full" style={{ width: `${progressVal}%`, background: progressVal && progressVal > 50 ? "#4ade80" : "#f87171" }} />
        </div>
        <div className="flex justify-between">
          <span className="text-[9px] font-black" style={{ color: progressVal && progressVal > 50 ? "#4ade80" : "#f87171" }}>{progressLabel}</span>
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
  const [stats, setStats] = useState({ classCount: 0, studentCount: 0, assignmentCount: 0 });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("Overview");

  useEffect(() => {
    const fetchTeacherStats = async () => {
      if (!user) return;
      const [classesRes, assignmentsRes] = await Promise.all([
        supabase.from("classes").select("id").eq("teacher_id", user.id),
        supabase.from("assignments").select("id").eq("teacher_id", user.id),
      ]);
      const classIds = (classesRes.data || []).map((c: any) => c.id);
      let studentCount = 0;
      if (classIds.length > 0) {
        const { data: members } = await supabase.from("class_members").select("id").in("class_id", classIds);
        studentCount = members?.length || 0;
        const { data: feed } = await supabase.from("class_feed").select("*")
          .in("class_id", classIds).order("created_at", { ascending: false }).limit(5);
        if (feed?.length) {
          const uids = [...new Set(feed.map((f: any) => f.user_id))];
          const { data: profs } = await supabase.from("profiles").select("user_id, display_name").in("user_id", uids);
          const map = Object.fromEntries((profs || []).map((p: any) => [p.user_id, p.display_name]));
          setRecentActivity(feed.map((f: any) => ({ ...f, display_name: map[f.user_id] || "Unknown" })));
        }
      }
      setStats({ classCount: classesRes.data?.length || 0, studentCount, assignmentCount: assignmentsRes.data?.length || 0 });
    };
    fetchTeacherStats();
  }, [user]);

  const displayName = profile?.display_name || profile?.first_name || "Teacher";
  const timeAgo = (d: string) => { const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); if (m < 60) return `${m}m`; const h = Math.floor(m / 60); if (h < 24) return `${h}h`; return `${Math.floor(h / 24)}d`; };

  const mockActivity = [
    { name: "Jamie L.", initials: "JL", action: "Completed Lesson 2 · 100%", time: "5m", color: "#1565c0" },
    { name: "Sam R.", initials: "SR", action: "Daily quiz · perfect score", time: "22m", color: "#059669" },
    { name: "Mia K.", initials: "MK", action: "Stuck on Lesson 3 · needs help", time: "1h", color: "#d97706" },
  ];

  return (
    <div className="min-h-screen pb-24" style={{ background: "#12121f", fontFamily: "'Nunito',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap');`}</style>

      {/* Blue header */}
      <div style={{ background: "#1565c0", borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}>
        <div className="max-w-sm mx-auto px-5 pt-12 pb-7">
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="flex justify-between items-start mb-5">
            <div>
              <h1 className="text-2xl font-black text-white">Hi, {displayName}!</h1>
              <p className="text-sm font-semibold mt-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>Your classroom overview</p>
            </div>
            <button className="flex items-center gap-1 px-3 py-2 rounded-full text-xs font-black"
              style={{ background: "rgba(255,255,255,0.18)", color: "white" }} onClick={() => navigate("/class")}>
              <Plus className="h-3.5 w-3.5" /> New class
            </button>
          </motion.div>

          <div className="flex items-center gap-5 mb-6">
            <MascotBlue />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.5)" }}>STUDENTS</p>
              <p className="text-5xl font-black text-white leading-none">{stats.studentCount || 24}</p>
              <p className="text-xs font-bold mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>
                Across {stats.classCount || 3} active classes
              </p>
            </div>
          </div>

          <PillTabs tabs={["Overview", "Classes", "Assignments"]} active={activeTab} onChange={setActiveTab} />
        </div>
      </div>

      <div className="max-w-sm mx-auto px-5 py-5 space-y-5">
        {/* Insight */}
        <div className="rounded-2xl p-4 flex items-center justify-between gap-3"
          style={{ background: "#1e2035", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ background: "#1565c0", color: "white" }}>INSIGHT</span>
              <span className="text-[9px] font-bold" style={{ color: "rgba(255,255,255,0.35)" }}>Class report ›</span>
            </div>
            <p className="text-xs font-bold text-white leading-snug">
              Class avg is 72% this week. 3 students need attention.
            </p>
          </div>
          <WeekBarChart accent="#60a5fa" />
        </div>

        {/* Classes */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <p className="font-black text-white text-sm">Classes</p>
            <span className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.35)" }}>{stats.classCount || 3} active</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ClassCard icon="A" title="Algebra 1A" subtitle="Grade 8 · 12 students" metric="78%" metricLabel="CLASS AVG" bg="#1565c0" fg="white" />
            <ClassCard icon="B" title="Algebra 1B" subtitle="Grade 8 · 8 students" metric="65%" metricLabel="CLASS AVG" bg="#e8f0fe" fg="#1a1a2e" />
            <ClassCard icon="C" title="Algebra 2" subtitle="Grade 9 · 4 students" bg="#0d9488" fg="white"
              progressBar progressVal={80} progressLabel="8 assignments" progressRight="80%" />
            <ClassCard icon="!" title="Needs Attn." subtitle="3 students flagged" bg="#111827" fg="white"
              progressBar progressVal={35} progressLabel="Review now" progressRight="3/24" />
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <p className="font-black text-white text-sm mb-3">Recent Activity</p>
          <div className="rounded-2xl overflow-hidden" style={{ background: "#1e2035" }}>
            {(recentActivity.length > 0 ? recentActivity.map((item, i) => ({
              name: item.display_name,
              initials: item.display_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2),
              action: item.content || item.action_type,
              time: timeAgo(item.created_at),
              color: ["#1565c0","#059669","#d97706"][i % 3],
            })) : mockActivity).map((item, i, arr) => (
              <div key={i}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="h-9 w-9 rounded-full flex items-center justify-center font-black text-[11px] text-white flex-shrink-0"
                    style={{ background: item.color }}>{item.initials}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold text-white">{item.name}</p>
                    <p className="text-xs font-semibold truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{item.action}</p>
                  </div>
                  <span className="text-xs font-bold flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>{item.time}</span>
                </div>
                {i < arr.length - 1 && <div className="mx-4 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   LEARNER HOME
───────────────────────────────────────────────────────────────────────────── */
interface LevelWithStatus {
  id: string;
  title: string | null;
  order_index: number;
  stage_id: string;
  stage_title: string;
  stage_emoji: string;
  is_review: boolean;
  status: "completed" | "current" | "locked";
  score?: number;
  total_questions?: number;
}

const cardColors = [
  { bg: "#7c3aed", fg: "white" },
  { bg: "#f0f0f0", fg: "#1a1a2e" },
  { bg: "#1565c0", fg: "white" },
  { bg: "#0d9488", fg: "white" },
  { bg: "#84cc16", fg: "#1a2d00" },
  { bg: "#e8f0fe", fg: "#1a1a2e" },
  { bg: "#f59e0b", fg: "#1a1a2e" },
  { bg: "#111827", fg: "white" },
];



const LearnerHome = () => {
  const { user, profile, isGuest } = useAuth();
  const navigate = useNavigate();
  const [levels, setLevels] = useState<LevelWithStatus[]>([]);
  const [stats, setStats] = useState({ completed: 0, total: 20 });
  const [activeTab, setActiveTab] = useState("All");
  const [loading, setLoading] = useState(true);
  const { checkAuth, gateOpen, setGateOpen } = useGuestGate();

  useEffect(() => {
    const fetchData = async () => {
      const [stagesRes, levelsRes] = await Promise.all([
        supabase.from("stages").select("*").order("order_index"),
        supabase.from("levels").select("*").order("order_index"),
      ]);

      let progressMap: Record<string, { completed: boolean; score?: number; total_questions?: number }> = {};
      if (user) {
        const { data: progressData } = await supabase
          .from("user_progress")
          .select("level_id, completed, score, total_questions")
          .eq("user_id", user.id);
        if (progressData) {
          progressData.forEach(p => {
            progressMap[p.level_id] = { completed: !!p.completed, score: p.score ?? undefined, total_questions: p.total_questions ?? undefined };
          });
        }
      }

      if (stagesRes.data && levelsRes.data) {
        const stageMap = Object.fromEntries(stagesRes.data.map(s => [s.id, s]));
        let foundCurrent = false;
        const allLevels: LevelWithStatus[] = levelsRes.data.map(l => {
          const stage = stageMap[l.stage_id];
          let status: "completed" | "current" | "locked" = "locked";
          if (progressMap[l.id]?.completed) {
            status = "completed";
          } else if (!foundCurrent) {
            status = "current";
            foundCurrent = true;
          }
          return {
            id: l.id,
            title: l.title,
            order_index: l.order_index,
            stage_id: l.stage_id,
            stage_title: stage?.title || "Stage",
            stage_emoji: stage?.emoji || "📘",
            is_review: l.is_review || false,
            status,
            score: progressMap[l.id]?.score,
            total_questions: progressMap[l.id]?.total_questions,
          };
        });

        // For guests, unlock first 2 levels
        if (isGuest && !user) {
          let unlocked = 0;
          allLevels.forEach(l => {
            if (unlocked < 2 && l.status !== "completed") {
              if (unlocked === 0) l.status = "current";
              unlocked++;
            }
          });
        }

        const completedCount = allLevels.filter(l => l.status === "completed").length;
        setLevels(allLevels);
        setStats({ completed: completedCount, total: allLevels.length });
      }
      setLoading(false);
    };
    fetchData();
  }, [user, isGuest]);

  const handleLevelClick = (level: LevelWithStatus) => {
    if (level.status === "locked") return;
    if (!checkAuth()) return;
    navigate(`/activity/${level.id}`);
  };

  const displayName = profile?.display_name || profile?.first_name || (isGuest ? "Guest" : "Learner");
  const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const completedLevels = levels.filter(l => l.status === "completed");
  const inProgressLevels = levels.filter(l => l.status === "current");
  const lockedLevels = levels.filter(l => l.status === "locked");

  const filteredSections = activeTab === "Completed"
    ? { inProgress: [], completed: completedLevels, locked: [] }
    : activeTab === "In Progress"
    ? { inProgress: inProgressLevels, completed: [], locked: [] }
    : { inProgress: inProgressLevels, completed: completedLevels, locked: lockedLevels };

  return (
    <div className="min-h-screen pb-24" style={{ background: "#12121f", fontFamily: "'Nunito',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap');`}</style>

      {/* Green header */}
      <div style={{ background: "#2d7a45", borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}>
        <div className="max-w-screen-md mx-auto px-5 pt-12 pb-7">
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="flex justify-between items-start mb-5">
            <div>
              <h1 className="text-2xl font-black text-white">Hi, {displayName}!</h1>
              <p className="text-sm font-semibold mt-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>Your algebra journey</p>
            </div>
            <HeartsDisplay />
          </motion.div>

          <div className="flex items-center gap-5 mb-6">
            <div className="w-auto">
              <img className="" src={Tarsi} alt="Tarsi" width={100}/>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.5)" }}>PROGRESS</p>
              <p className="text-5xl font-black text-white leading-none">{progress}%</p>
              <p className="text-xs font-bold mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>
                {stats.completed} of {stats.total} lessons complete
              </p>
            </div>
          </div>

          <PillTabs tabs={["All", "In Progress", "Completed"]} active={activeTab} onChange={setActiveTab} />
        </div>
      </div>

      <div className="max-w-screen-md mx-auto px-5 py-5 space-y-5">
        {/* Insight */}
        <div className="rounded-2xl p-4 flex items-center justify-between gap-3"
          style={{ background: "#1e2035", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ background: "#2d7a45", color: "white" }}>INSIGHT</span>
              <span className="text-[9px] font-bold" style={{ color: "rgba(255,255,255,0.35)" }}>Daily challenge ›</span>
            </div>
            <p className="text-xs font-bold text-white leading-snug">
              You've completed <strong>{stats.completed} levels</strong>. Keep going!
            </p>
          </div>
          <WeekBarChart accent="#4ade80" />
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-6 w-6 border-4 border-white border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* In Progress / Current */}
            {filteredSections.inProgress.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <p className="font-black text-white text-sm">Current Level</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {filteredSections.inProgress.map((level, i) => {
                    const color = cardColors[0];
                    return (
                      <div key={level.id} onClick={() => handleLevelClick(level)} className="cursor-pointer">
                        <LessonCard
                          icon={getLevelIcon(level.title || `Level ${level.order_index}`, level.stage_emoji)}
                          title={level.title || `Level ${level.order_index}`}
                          subtitle={`${level.stage_title} · Lvl ${level.order_index}`}
                          xpLabel="STATUS"
                          xpValue="Start →"
                          bg={color.bg}
                          fg={color.fg}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Completed */}
            {filteredSections.completed.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <p className="font-black text-white text-sm">Completed</p>
                  <span className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.35)" }}>{filteredSections.completed.length} done</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {filteredSections.completed.map((level, i) => {
                    const color = cardColors[(i + 1) % cardColors.length];
                    const scoreText = level.score != null && level.total_questions != null
                      ? `${level.score}/${level.total_questions}`
                      : "Done ✓";
                    return (
                      <div key={level.id} onClick={() => handleLevelClick(level)} className="cursor-pointer">
                        <LessonCard
                          icon={getLevelIcon(level.title || `Level ${level.order_index}`, level.stage_emoji)}
                          title={level.title || `Level ${level.order_index}`}
                          subtitle={`${level.stage_title} · Lvl ${level.order_index}`}
                          statusLabel="SCORE"
                          statusValue={scoreText}
                          bg={color.bg}
                          fg={color.fg}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Coming Up (Locked) */}
            {filteredSections.locked.length > 0 && (
              <div>
                <p className="font-black text-white text-sm mb-3">Coming Up</p>
                <div className="grid grid-cols-2 gap-3">
                  {filteredSections.locked.slice(0, 4).map((level, i) => {
                    const color = i % 2 === 0
                      ? { bg: "#84cc16", fg: "#1a2d00" }
                      : { bg: "#111827", fg: "white" };
                    return (
                      <div key={level.id}>
                        <LessonCard
                          icon={getLevelIcon(level.title || `Level ${level.order_index}`, level.stage_emoji)}
                          title={level.title || `Level ${level.order_index}`}
                          subtitle={`${level.stage_title} · Lvl ${level.order_index}`}
                          xpValue={level.is_review ? "Review" : "0 XP"}
                          bg={color.bg}
                          fg={color.fg}
                          locked
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Daily Challenge */}
        <DailyChallenge open={false} onOpenChange={() => {}} />
      </div>
      <GuestGateDialog open={gateOpen} onOpenChange={setGateOpen} />
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   ROOT
───────────────────────────────────────────────────────────────────────────── */
const Index = () => {
  const { userRole, loading } = useAuth();
  if (loading) return null;
  if (userRole === "teacher") return <TeacherDashboard />;
  return <LearnerHome />;
};

export default Index;
