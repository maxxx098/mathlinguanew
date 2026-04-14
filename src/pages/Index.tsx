import { useEffect, useState, useCallback } from "react";
import Onboarding from "@/components/Onboarding";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import DailyChallenge from "@/components/DailyChallenge";
import { Plus, MoreHorizontal, Lock, Check, Star, Users, ClipboardList, TrendingUp, BookOpen, Award, Target, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import HeartsHeaderPill from "@/components/HeartsHeaderPill";
import JoinClassCard from "@/components/JoinClassCard";
import { useAuth } from "@/contexts/AuthContext";
import { useGuestGate, GuestGateDialog } from "@/components/GuestGate";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

import Learner from "@/assets/learner.png"
import Teacher from "@/assets/teacher.png"
/* ─────────────────────────────────────────────────────────────────────────────
   MASCOT: Blue bear with graduation cap (Teacher)
───────────────────────────────────────────────────────────────────────────── */
const MascotBlue = () => (
  <div>
    <img src={Teacher} alt="Teacher Mascot" width={100}/>
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   MASCOT: Green bear (Learner) - placeholder
───────────────────────────────────────────────────────────────────────────── */
const MascotGreen = () => (
  <div>
    <img src={Learner} alt="Learner Mascot" width={100}/>
  </div>
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
          <span key={i} className="text-[7px] font-extrabold w-[5px] text-center text-muted-foreground"
            style={{ color: i === days.length - 1 ? accent : undefined }}>
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
  <div className="flex gap-1 p-1 rounded-full bg-black/20">
    {tabs.map(tab => {
      const isActive = active === tab;
      return (
        <button key={tab} onClick={() => onChange(tab)}
          className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition-all ${isActive ? "bg-background text-foreground shadow-sm" : "text-white/80 hover:text-white"}`}>
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
   Assignment Deadline Card (sits beside class cards in overview grid)
───────────────────────────────────────────────────────────────────────────── */
interface AssignmentWithDeadline {
  id: string;
  title: string;
  className: string;
  daysLeft: number;
}

const AssignmentDeadlineCard = ({ items }: { items: AssignmentWithDeadline[] }) => {
  const getUrgency = (days: number) => {
    if (days <= 0) return { color: "#dc2626", bg: "#fef2f2", label: "Overdue", icon: <AlertTriangle className="h-3.5 w-3.5" /> };
    if (days <= 2) return { color: "#dc2626", bg: "#fef2f2", label: `${days}d left`, icon: <AlertTriangle className="h-3.5 w-3.5" /> };
    if (days <= 7) return { color: "#d97706", bg: "#fffbeb", label: `${days}d left`, icon: <Clock className="h-3.5 w-3.5" /> };
    return { color: "#2d7a45", bg: "#f0fdf4", label: `${days}d left`, icon: <CheckCircle2 className="h-3.5 w-3.5" /> };
  };

  return (
    <div className="rounded-2xl overflow-hidden bg-card border border-border">
      <div className="px-4 pt-4 pb-2">
        <p className="font-black text-foreground text-sm">Assignments</p>
        <p className="text-[10px] text-muted-foreground font-bold mt-0.5">Due within 2 days</p>
      </div>
      {items.length === 0 ? (
        <div className="px-4 pb-4 text-center">
          <p className="text-xs text-muted-foreground">No assignments due soon</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {items.slice(0, 5).map((a) => {
            const u = getUrgency(a.daysLeft);
            return (
              <div key={a.id} className="flex items-center justify-between px-4 py-3 gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-extrabold text-foreground truncate">
                    {a.title || "Assignment"}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-semibold truncate">{a.className}</p>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-full flex-shrink-0"
                  style={{ background: u.bg, color: u.color }}>
                  {u.icon}
                  <span className="text-[9px] font-black">{u.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};


/* ─────────────────────────────────────────────────────────────────────────────
   TEACHER DASHBOARD
───────────────────────────────────────────────────────────────────────────── */
const TeacherDashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ classCount: 0, studentCount: 0, assignmentCount: 0 });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("Overview");
  const [classes, setClasses] = useState<{ id: string; name: string; class_code: string; studentCount: number; assignmentCount: number; avgScore: number }[]>([]);
  const [assignments, setAssignments] = useState<{ id: string; title: string; description: string | null; due_date: string | null; class_name: string; submissions: number; total_students: number }[]>([]);
  const [needsAttention, setNeedsAttention] = useState<{ name: string; avgScore: number; userId: string }[]>([]);

  useEffect(() => {
    const fetchTeacherStats = async () => {
      if (!user) return;
      const [classesRes, assignmentsRes] = await Promise.all([
        supabase.from("classes").select("id, name, class_code").eq("teacher_id", user.id),
        supabase.from("assignments").select("id, class_id, title, description, due_date").eq("teacher_id", user.id).order("created_at", { ascending: false }),
      ]);
      const allClasses = classesRes.data || [];
      const allAssignments = assignmentsRes.data || [];
      const classIds = allClasses.map((c: any) => c.id);
      let totalStudents = 0;
      let classDetails: typeof classes = [];

      if (classIds.length > 0) {
        const { data: members } = await supabase.from("class_members").select("user_id, class_id").in("class_id", classIds);
        totalStudents = members?.length || 0;

        const memberIds = [...new Set((members || []).map((m: any) => m.user_id))];
        let progressByUser: Record<string, { score: number; total: number }> = {};
        if (memberIds.length > 0) {
          const { data: progress } = await supabase.from("user_progress").select("user_id, score, total_questions, completed").in("user_id", memberIds).eq("completed", true);
          (progress || []).forEach((p: any) => {
            if (!progressByUser[p.user_id]) progressByUser[p.user_id] = { score: 0, total: 0 };
            progressByUser[p.user_id].score += (p.score || 0);
            progressByUser[p.user_id].total += (p.total_questions || 0);
          });

          // Find students needing attention (avg < 50% or no progress)
          const { data: profs } = await supabase.from("profiles").select("user_id, display_name").in("user_id", memberIds);
          const profMap = Object.fromEntries((profs || []).map((p: any) => [p.user_id, p.display_name || "Unknown"]));
          const struggling: typeof needsAttention = [];
          memberIds.forEach(uid => {
            const prog = progressByUser[uid];
            const avg = prog && prog.total > 0 ? Math.round((prog.score / prog.total) * 100) : 0;
            if (avg < 50) {
              struggling.push({ name: profMap[uid] || "Unknown", avgScore: avg, userId: uid });
            }
          });
          setNeedsAttention(struggling.slice(0, 5));
        }

        classDetails = allClasses.map((c: any) => {
          const classMembers = (members || []).filter((m: any) => m.class_id === c.id);
          const classAssigns = allAssignments.filter((a: any) => a.class_id === c.id);
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
          return { id: c.id, name: c.name, class_code: c.class_code, studentCount: classMembers.length, assignmentCount: classAssigns.length, avgScore };
        });

        // Fetch submissions count for each assignment
        const assignmentDetails = await Promise.all(allAssignments.map(async (a: any) => {
          const { data: subs } = await supabase.from("assignment_submissions").select("id").eq("assignment_id", a.id);
          const cls = allClasses.find((c: any) => c.id === a.class_id);
          const clsMembers = (members || []).filter((m: any) => m.class_id === a.class_id);
          return {
            id: a.id, title: a.title, description: a.description, due_date: a.due_date,
            class_name: cls?.name || "Unknown", submissions: subs?.length || 0, total_students: clsMembers.length,
          };
        }));
        setAssignments(assignmentDetails);

        const { data: feed } = await supabase.from("class_feed").select("*")
          .in("class_id", classIds).order("created_at", { ascending: false }).limit(5);
        if (feed?.length) {
          const uids = [...new Set(feed.map((f: any) => f.user_id))];
          const { data: feedProfs } = await supabase.from("profiles").select("user_id, display_name").in("user_id", uids);
          const map = Object.fromEntries((feedProfs || []).map((p: any) => [p.user_id, p.display_name]));
          setRecentActivity(feed.map((f: any) => ({ ...f, display_name: map[f.user_id] || "Unknown" })));
        }
      }
      setClasses(classDetails);
      setStats({ classCount: allClasses.length, studentCount: totalStudents, assignmentCount: allAssignments.length });
    };
    fetchTeacherStats();
  }, [user]);

  const displayName = profile?.display_name || profile?.first_name || "Teacher";
  const parseValidDate = (value: string | null | undefined) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };
  const getAssignmentDueLabel = (value: string | null | undefined) => {
    const dueDate = parseValidDate(value);
    if (!dueDate) return null;

    const daysLeft = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return "Overdue";
    if (daysLeft === 0) return "Due today";
    if (daysLeft === 1) return "1d left";
    return `${daysLeft}d left`;
  };
  const timeAgo = (d: string) => { const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); if (m < 60) return `${m}m`; const h = Math.floor(m / 60); if (h < 24) return `${h}h`; return `${Math.floor(h / 24)}d`; };
  const classCardColors = ["#1565c0", "#0d9488", "#7c3aed", "#d97706", "#2d7a45", "#dc2626"];

  // Compute overall avg
  const overallAvg = classes.length > 0 ? Math.round(classes.reduce((s, c) => s + c.avgScore, 0) / classes.length) : 0;

  /* ── Tab: Overview ─────────────────────────────────── */
  const renderOverview = () => (
    <div className="space-y-5">
      {/* Insight card */}
      <div className="rounded-2xl p-4 flex items-center justify-between gap-3 bg-card border border-border">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ background: "#1565c0", color: "white" }}>INSIGHT</span>
            <span className="text-[9px] font-bold text-muted-foreground">Class report ›</span>
          </div>
          <p className="text-xs font-bold text-foreground leading-snug">
            {stats.studentCount > 0
              ? `Class avg is ${overallAvg}% this week. ${needsAttention.length} student${needsAttention.length !== 1 ? "s" : ""} need attention.`
              : "Create a class and invite students to get started!"}
          </p>
        </div>
        <WeekBarChart accent="#60a5fa" />
      </div>

      {/* Classes grid */}
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
                  progressBar={c.assignmentCount > 0} progressVal={c.avgScore}
                  progressLabel={`${c.assignmentCount} assignment${c.assignmentCount !== 1 ? "s" : ""}`}
                  progressRight={c.avgScore > 0 ? `${c.avgScore}%` : "—"}
                />
              </div>
            ))}
            {/* Assignment Deadline card beside classes */}
            <AssignmentDeadlineCard items={assignments.map(a => {
              const d = parseValidDate(a.due_date);
              const daysLeft = d ? Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 999;
              return { id: a.id, title: a.title, className: a.class_name, daysLeft };
            }).filter(a => a.daysLeft <= 14).sort((a, b) => a.daysLeft - b.daysLeft)} />
            {/* Needs Attention card */}
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

      {/* Assignments summary */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <p className="font-black text-foreground text-sm">Assignments</p>
          <span className="text-xs font-bold text-muted-foreground">{assignments.length} total</span>
        </div>
        {assignments.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <ClipboardList className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No assignments yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {assignments.slice(0, 4).map((a, i) => {
              const dueDate = parseValidDate(a.due_date);
              const dueLabel = getAssignmentDueLabel(a.due_date);
              const pct = a.total_students > 0 ? Math.round((a.submissions / a.total_students) * 100) : 0;
              return (
                <div key={a.id} onClick={() => setActiveTab("Assignments")} className="cursor-pointer rounded-2xl p-4 flex flex-col gap-2" style={{ background: ["#0d9488", "#7c3aed", "#d97706", "#1565c0"][i % 4] }}>
                  <div className="flex justify-between items-start">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm"
                      style={{ background: "rgba(0,0,0,0.2)", color: "#fff" }}>
                      <ClipboardList className="h-4 w-4" />
                    </div>
                    <MoreHorizontal className="h-4 w-4" style={{ color: "rgba(255,255,255,0.4)" }} />
                  </div>
                  <div>
                    <p className="font-extrabold text-sm leading-tight text-white truncate">{a.title}</p>
                    <p className="text-[10px] font-bold mt-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>{a.class_name}</p>
                  </div>
                  {dueLabel && (
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.5)" }}>DUE</p>
                      <p className="text-sm font-black text-white">{dueLabel}</p>
                    </div>
                  )}
                  <div>
                    <div className="w-full rounded-full h-1.5 mb-1" style={{ background: "rgba(255,255,255,0.15)" }}>
                      <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: pct >= 80 ? "#4ade80" : "#f87171" }} />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[9px] font-black" style={{ color: pct >= 80 ? "#4ade80" : "#f87171" }}>{a.submissions}/{a.total_students} submitted</span>
                      <span className="text-[9px] font-bold" style={{ color: "rgba(255,255,255,0.5)" }}>{pct}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div>
        <p className="font-black text-foreground text-sm mb-3">Recent Activity</p>
        <div className="rounded-2xl overflow-hidden bg-card border border-border">
          {recentActivity.length > 0 ? recentActivity.map((item, i) => {
            const initials = (item.display_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2);
            return (
              <div key={i}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="h-9 w-9 rounded-full flex items-center justify-center font-black text-[11px] text-white flex-shrink-0"
                    style={{ background: ["#1565c0","#059669","#d97706"][i % 3] }}>{initials}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold text-foreground">{item.display_name}</p>
                    <p className="text-xs font-semibold truncate text-muted-foreground">{item.content || item.action_type}</p>
                  </div>
                  <span className="text-xs font-bold flex-shrink-0 text-muted-foreground">{timeAgo(item.created_at)}</span>
                </div>
                {i < recentActivity.length - 1 && <div className="mx-4 h-px bg-border" />}
              </div>
            );
          }) : (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">No recent activity yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  /* ── Tab: Classes ──────────────────────────────────── */
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
          <button onClick={() => navigate("/class")} className="px-4 py-2 rounded-full text-xs font-black text-white" style={{ background: "#1565c0" }}>
            Create Class
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {classes.map((c, i) => (
            <div key={c.id} onClick={() => navigate("/class")} className="cursor-pointer rounded-2xl p-4 bg-card border border-border hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white"
                  style={{ background: classCardColors[i % classCardColors.length] }}>
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
              <div className="flex items-center gap-3 mt-2">
                <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                  <ClipboardList className="h-3 w-3" /> {c.assignmentCount} assignments
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Needs attention section */}
      {needsAttention.length > 0 && (
        <div>
          <p className="font-black text-foreground text-sm mb-3">Students Needing Attention</p>
          <div className="rounded-2xl bg-card border border-border overflow-hidden">
            {needsAttention.map((s, i) => (
              <div key={i}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center font-black text-[10px] text-white bg-red-500/80">
                    {s.name.charAt(0)}
                  </div>
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

  /* ── Tab: Assignments ──────────────────────────────── */
  const renderAssignments = () => (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <p className="font-black text-foreground text-sm">Assignments</p>
        <button onClick={() => navigate("/class")} className="flex items-center gap-1 text-xs font-black text-primary">
          <Plus className="h-3.5 w-3.5" /> New
        </button>
      </div>
      {assignments.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-bold text-foreground mb-1">No assignments yet</p>
          <p className="text-xs text-muted-foreground mb-3">Create assignments from your class page</p>
          <button onClick={() => navigate("/class")} className="px-4 py-2 rounded-full text-xs font-black text-white" style={{ background: "#1565c0" }}>
            Go to Classes
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => {
            const pct = a.total_students > 0 ? Math.round((a.submissions / a.total_students) * 100) : 0;
            const dueDate = parseValidDate(a.due_date);
            const dueLabel = getAssignmentDueLabel(a.due_date);
            return (
              <div key={a.id} className="rounded-2xl p-4 bg-card border border-border">
                <div className="flex items-start justify-between mb-2 gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-sm text-foreground truncate">{a.title}</p>
                    <p className="text-[10px] font-bold text-muted-foreground">{a.class_name}</p>
                  </div>
                  {dueDate && (
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <Badge variant="outline" className="text-[9px]">
                        Due {dueDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </Badge>
                      {dueLabel && <span className="text-[10px] font-bold text-muted-foreground">{dueLabel}</span>}
                    </div>
                  )}
                </div>
                {a.description && <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{a.description}</p>}
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Progress value={pct} className="h-1.5" />
                  </div>
                  <span className="text-[10px] font-black text-muted-foreground">{a.submissions}/{a.total_students} submitted</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen pb-24 bg-background" style={{ fontFamily: "'Nunito',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap');`}</style>

      {/* Blue header */}
      <div style={{ background: "#1565c0", borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}>
        <div className="max-w-screen-md mx-auto px-5 pt-12 pb-7">
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="flex justify-between items-start mb-5">
            <div>
              <h1 className="text-2xl font-black text-white">Hi, {displayName}!</h1>
              <p className="text-sm font-semibold mt-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>Your classroom overview</p>
            </div>
            <button className="flex items-center gap-1 px-3 py-2 rounded-full text-xs font-black"
              style={{ background: "rgba(255,255,255,0.18)", color: "white" }} onClick={() => navigate("/class")}>
              {stats.classCount > 0 ? (
                <><BookOpen className="h-3.5 w-3.5" /> My class</>
              ) : (
                <><Plus className="h-3.5 w-3.5" /> New class</>
              )}
            </button>
          </motion.div>

          <div className="flex items-center gap-5 mb-6">
            <MascotBlue />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.5)" }}>STUDENTS</p>
              <p className="text-5xl font-black text-white leading-none">{stats.studentCount}</p>
              <p className="text-xs font-bold mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>
                Across {stats.classCount} active {stats.classCount === 1 ? "class" : "classes"}
              </p>
            </div>
          </div>

          <PillTabs tabs={["Overview", "Classes", "Assignments"]} active={activeTab} onChange={setActiveTab} />
        </div>
      </div>

      <div className="max-w-screen-md mx-auto px-5 py-5">
        {activeTab === "Overview" && renderOverview()}
        {activeTab === "Classes" && renderClasses()}
        {activeTab === "Assignments" && renderAssignments()}
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
  stage_description: string | null;
  is_review: boolean;
  status: "completed" | "current" | "locked";
  score?: number;
  total_questions?: number;
}

interface StageWithLevels {
  id: string;
  title: string;
  emoji: string;
  description: string | null;
  order_index: number;
  levels: LevelWithStatus[];
}

const cardColors = [
  { bg: "#7c3aed", fg: "#ffffff" },
  { bg: "#1565c0", fg: "#ffffff" },
  { bg: "#0d9488", fg: "#ffffff" },
  { bg: "#2d7a45", fg: "#ffffff" },
  { bg: "#d97706", fg: "#ffffff" },
  { bg: "#6366f1", fg: "#ffffff" },
];

const StageLevelItem = ({ level, onClick, colorIdx }: { level: LevelWithStatus; onClick: () => void; colorIdx: number }) => {
  const color = cardColors[colorIdx % cardColors.length];
  const isLocked = level.status === "locked";
  const isCompleted = level.status === "completed";
  const isCurrent = level.status === "current";

  const scoreText = level.score != null && level.total_questions != null
    ? `${level.score}/${level.total_questions}`
    : null;

  return (
    <button
      onClick={onClick}
      disabled={isLocked}
      className={`w-full rounded-2xl p-4 text-left transition-all ${isLocked ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:scale-[1.02] active:scale-[0.98]"} ${isCurrent ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
      style={{ background: color.bg }}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg flex-shrink-0"
          style={{ background: "rgba(0,0,0,0.22)", color: color.fg }}>
          {isCompleted ? <Check className="h-5 w-5" /> :
           isLocked ? (level.is_review ? <Star className="h-4 w-4" /> : <Lock className="h-4 w-4" />) :
           getLevelIcon(level.title || `Level ${level.order_index}`, level.stage_emoji)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-extrabold text-sm leading-tight truncate" style={{ color: color.fg }}>
            {level.title || `Level ${level.order_index}`}
          </p>
          <p className="text-[10px] font-bold mt-0.5" style={{ color: `${color.fg}88` }}>
            {level.is_review ? "Unit Review" : `Level ${level.order_index}`}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          {isCompleted && (
            <span className="text-[10px] font-black" style={{ color: "#4ade80" }}>
              {scoreText || "Done ✓"}
            </span>
          )}
          {isCurrent && (
            <span className="text-[10px] font-black" style={{ color: color.fg }}>
              Start →
            </span>
          )}
          {isLocked && (
            <span className="text-[10px] font-black" style={{ color: `${color.fg}60` }}>
              Locked
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

const LearnerHome = () => {
  const { user, profile, isGuest } = useAuth();
  const navigate = useNavigate();
  const [stages, setStages] = useState<StageWithLevels[]>([]);
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
        let foundCurrent = false;
        const builtStages: StageWithLevels[] = stagesRes.data.map(s => {
          const stageLevels = levelsRes.data!
            .filter(l => l.stage_id === s.id)
            .map(l => {
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
                stage_title: s.title,
                stage_emoji: s.emoji || "📘",
                stage_description: s.description,
                is_review: l.is_review || false,
                status,
                score: progressMap[l.id]?.score,
                total_questions: progressMap[l.id]?.total_questions,
              } as LevelWithStatus;
            });
          return { id: s.id, title: s.title, emoji: s.emoji || "📘", description: s.description, order_index: s.order_index, levels: stageLevels };
        });

        // For guests, unlock first 2 levels
        if (isGuest && !user) {
          let unlocked = 0;
          builtStages.forEach(st => {
            st.levels.forEach(l => {
              if (unlocked < 2 && l.status !== "completed") {
                if (unlocked === 0) l.status = "current";
                unlocked++;
              }
            });
          });
        }

        const allLevels = builtStages.flatMap(s => s.levels);
        const completedCount = allLevels.filter(l => l.status === "completed").length;
        setStages(builtStages);
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

  // Filter stages based on tab
  const filteredStages = stages.map(stage => {
    let filteredLevels = stage.levels;
    if (activeTab === "Completed") filteredLevels = stage.levels.filter(l => l.status === "completed");
    else if (activeTab === "In Progress") filteredLevels = stage.levels.filter(l => l.status === "current");
    return { ...stage, levels: filteredLevels };
  }).filter(s => s.levels.length > 0);

  // Determine current stage for highlighting
  const currentStageId = stages.find(s => s.levels.some(l => l.status === "current"))?.id;

  function setShowJoinClass(arg0: boolean): void {
    throw new Error("Function not implemented.");
  }

  return (
    <div className="min-h-screen pb-24 bg-background" style={{ fontFamily: "'Nunito',sans-serif" }}>
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
            <HeartsHeaderPill />
          </motion.div>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-auto flex-shrink-0">
              <MascotGreen />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.5)" }}>PROGRESS</p>
              <p className="text-5xl font-black text-white leading-none">{progress}%</p>
              <p className="text-xs font-bold mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>
                {stats.completed} of {stats.total} lessons complete
              </p>
            </div>
            {/* Streak card */}
            <div
              className="flex-shrink-0 rounded-2xl p-3 flex flex-col items-center justify-center gap-1 min-w-[80px]"
              style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)" }}
            >
              <span className="text-2xl">🔥</span>
              <p className="text-2xl font-black text-white leading-none">{stats.completed > 0 ? Math.min(stats.completed, 7) : 0}</p>
              <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.6)" }}>
                Day streak
              </p>
            </div>
          </div>

          <PillTabs tabs={["All", "In Progress", "Completed"]} active={activeTab} onChange={setActiveTab} />
        </div>
      </div>

      <div className="max-w-screen-md mx-auto px-5 py-5 space-y-5">
        
        {/* Insight */}
        <div className="rounded-2xl p-4 flex items-center justify-between gap-3 bg-card border border-border">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ background: "#2d7a45", color: "white" }}>INSIGHT</span>
              <span className="text-[9px] font-bold text-muted-foreground">Daily challenge ›</span>
            </div>
            <p className="text-xs font-bold text-foreground leading-snug">
              You've completed <strong>{stats.completed} levels</strong>. Keep going!
            </p>
          </div>
          <WeekBarChart accent="#4ade80" />
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {filteredStages.map((stage, stageIdx) => {
              const isCurrent = stage.id === currentStageId;
              const completedInStage = stage.levels.filter(l => l.status === "completed").length;
              const stageProgress = Math.round((completedInStage / (stages.find(s => s.id === stage.id)?.levels.length || 4)) * 100);

              return (
                <motion.div
                  key={stage.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: stageIdx * 0.08 }}
                >
                  {/* Stage Header */}
                  <div className={`rounded-2xl p-4 mb-3 border ${isCurrent ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
                    <div className="flex items-center gap-3">
                     
                      <div className="flex-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Stage {stage.order_index}
                        </p>
                        <p className="font-black text-sm text-foreground">{stage.title}</p>
                        {stage.description && (
                          <p className="text-[11px] font-semibold text-muted-foreground mt-0.5 leading-snug">{stage.description}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-black text-foreground">{stageProgress}%</p>
                        <p className="text-[9px] font-bold text-muted-foreground">{completedInStage}/{stages.find(s => s.id === stage.id)?.levels.length || 4}</p>
                      </div>
                    </div>
                    {/* Stage progress bar */}
                    <div className="mt-2 w-full rounded-full h-1.5" style={{ background: "hsl(var(--muted))" }}>
                      <div className="h-1.5 rounded-full transition-all" style={{
                        width: `${stageProgress}%`,
                        background: stageProgress === 100 ? "#4ade80" : isCurrent ? "#7c3aed" : "#60a5fa"
                      }} />
                    </div>
                  </div>

                  {/* Levels list */}
                  <div className="space-y-2 pl-2">
                    {stage.levels.map((level, levelIdx) => (
                      <motion.div
                        key={level.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: stageIdx * 0.08 + levelIdx * 0.04 }}
                      >
                        <StageLevelItem
                          level={level}
                          onClick={() => handleLevelClick(level)}
                          colorIdx={stageIdx * 4 + levelIdx}
                        />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              );
            })}

            {filteredStages.length === 0 && (
              <div className="rounded-2xl border border-border bg-card p-8 text-center">
                <p className="text-sm text-muted-foreground">No levels match this filter.</p>
              </div>
            )}
          </div>
        )}

        {/* Daily Challenge */}
        <DailyChallenge />
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
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("user_id", user.id);
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
