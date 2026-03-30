import { useEffect, useState } from "react";
import { motion, AnimatePresence, easeInOut } from "framer-motion";
import {
  Users, Copy, Heart, MessageCircle, ClipboardList, Plus, LogIn,
  Loader2, Trash2, Calendar, Check, X, Send, ChevronDown, ChevronUp,
  Trophy, ArrowLeft, BookOpen, Zap,
} from "lucide-react";
import ProgressBoard from "@/components/ProgressBoard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import GuestGate from "@/components/GuestGate";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ClassData {
  id: string; name: string; class_code: string; teacher_id: string; created_at: string;
}
interface AssignmentQuestion { question: string; options: string[]; correct: string; }
interface Assignment {
  id: string; title: string; description: string | null; due_date: string | null;
  created_at: string; questions: AssignmentQuestion[] | null;
}
interface FeedItem {
  id: string; user_id: string; action_type: string; content: string | null; created_at: string;
  profile?: { display_name: string | null };
  reactions_count: number; comments_count: number;
  comments?: FeedComment[]; userReacted?: boolean;
}
interface FeedComment {
  id: string; user_id: string; content: string; created_at: string; display_name: string;
}
interface Submission {
  user_id: string; score: number | null; submitted_at: string; display_name: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
};

const initials = (name: string) =>
  name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, delay: i * 0.04, ease: easeInOut },
});

// ─── Shared UI Atoms ─────────────────────────────────────────────────────────

const Avatar = ({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) => (
  <div
    className={`${
      size === "md" ? "h-10 w-10 text-sm" : "h-7 w-7 text-[11px]"
    } rounded-full bg-primary/10 flex items-center justify-center shrink-0 font-medium text-primary`}
  >
    {initials(name)}
  </div>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-3">
    {children}
  </p>
);

// ─── Assignment Answer Modal ──────────────────────────────────────────────────

const AssignmentAnswerModal = ({
  assignment, userId, onClose, onSubmitted,
}: {
  assignment: Assignment; userId: string; onClose: () => void; onSubmitted: () => void;
}) => {
  const questions = assignment.questions || [];
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!questions.length) return;
    setSubmitting(true);
    let correct = 0;
    questions.forEach((q, idx) => {
      if (answers[idx]?.trim().toLowerCase() === q.correct.trim().toLowerCase()) correct++;
    });
    setScore(correct);
    await supabase.from("assignment_submissions").insert({
      assignment_id: assignment.id, user_id: userId, answers: answers as any, score: correct,
    });
    setSubmitted(true);
    setSubmitting(false);
    onSubmitted();
  };

  if (!questions.length) {
    return (
      <div className="space-y-4 text-center py-6">
        <p className="text-sm text-muted-foreground">No questions yet.</p>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    );
  }

  if (submitted) {
    const percent = Math.round((score / questions.length) * 100);
    return (
      <div className="space-y-4 text-center py-6">
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${percent >= 75 ? "bg-emerald-500/10" : "bg-amber-500/10"}`}>
          <Trophy className={`h-7 w-7 ${percent >= 75 ? "text-emerald-500" : "text-amber-500"}`} strokeWidth={1.75} />
        </div>
        <div>
          <p className="text-xl font-semibold">{score}/{questions.length}</p>
          <p className="text-xs text-muted-foreground mt-1">{percent}% — {percent >= 75 ? "Great job! 🎉" : "Keep practicing! 💪"}</p>
        </div>
        <Button onClick={onClose} className="w-full">Done</Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
      {questions.map((q, idx) => (
        <div key={idx} className="space-y-2 rounded-xl border border-border/60 p-3">
          <p className="text-sm font-medium">{idx + 1}. {q.question}</p>
          {q.options?.filter(Boolean).length > 0 ? (
            <div className="space-y-1.5">
              {q.options.map((opt, oi) => (
                <button
                  key={oi}
                  onClick={() => setAnswers(prev => ({ ...prev, [idx]: opt }))}
                  className={`w-full text-left rounded-lg border px-3 py-2 text-xs transition-all ${
                    answers[idx] === opt
                      ? "border-primary bg-primary/5 font-medium"
                      : "border-border/50 hover:border-primary/40 text-muted-foreground"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <Input
              placeholder="Type your answer…"
              value={answers[idx] || ""}
              onChange={e => setAnswers(prev => ({ ...prev, [idx]: e.target.value }))}
              className="text-sm"
            />
          )}
        </div>
      ))}
      <Button
        className="w-full gap-2"
        onClick={handleSubmit}
        disabled={submitting || Object.keys(answers).length < questions.length}
      >
        {submitting ? "Submitting…" : <><Send className="h-3.5 w-3.5" strokeWidth={1.75} /> Submit</>}
      </Button>
    </div>
  );
};

// ─── Create Assignment Dialog ─────────────────────────────────────────────────

const CreateAssignmentDialog = ({
  open, onOpenChange, classId, teacherId, onCreated,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  classId: string; teacherId: string; onCreated: () => void;
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [questions, setQuestions] = useState<AssignmentQuestion[]>([
    { question: "", options: ["", "", "", ""], correct: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const updateQuestion = (idx: number, field: keyof AssignmentQuestion, value: any) =>
    setQuestions(prev => prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q)));

  const updateOption = (qIdx: number, oIdx: number, value: string) =>
    setQuestions(prev =>
      prev.map((q, i) =>
        i === qIdx ? { ...q, options: q.options.map((o, j) => (j === oIdx ? value : o)) } : q
      )
    );

  const handleSubmit = async () => {
    if (!title.trim()) return;
    const valid = questions.filter(q => q.question.trim() && q.correct.trim());
    if (!valid.length) { toast.error("Add at least one question."); return; }
    setSubmitting(true);
    const { error } = await supabase.from("assignments").insert({
      class_id: classId, teacher_id: teacherId,
      title: title.trim(), description: description.trim() || null,
      due_date: dueDate || null, questions: valid as any,
    });
    if (error) { toast.error(error.message); }
    else {
      toast.success("Assignment created!");
      setTitle(""); setDescription(""); setDueDate("");
      setQuestions([{ question: "", options: ["", "", "", ""], correct: "" }]);
      onOpenChange(false); onCreated();
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Assignment</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Title</label>
            <Input placeholder="e.g. Practice: Single Operations" value={title} onChange={e => setTitle(e.target.value)} className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Description (optional)</label>
            <Textarea placeholder="Instructions…" value={description} onChange={e => setDescription(e.target.value)} className="text-sm resize-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Due Date (optional)</label>
            <Input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} className="text-sm" />
          </div>

          <div className="border-t border-border/50 pt-4">
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-3">Questions</p>
            <div className="space-y-3">
              {questions.map((q, qIdx) => (
                <div key={qIdx} className="space-y-2 rounded-xl border border-border/60 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Q{qIdx + 1}</span>
                    {questions.length > 1 && (
                      <button onClick={() => setQuestions(prev => prev.filter((_, i) => i !== qIdx))} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                    )}
                  </div>
                  <Input placeholder="Question…" value={q.question} onChange={e => updateQuestion(qIdx, "question", e.target.value)} className="text-sm" />
                  <p className="text-[10px] text-muted-foreground">Options (leave blank for free-text)</p>
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((opt, oIdx) => (
                      <Input key={oIdx} placeholder={`Option ${String.fromCharCode(65 + oIdx)}`} value={opt} onChange={e => updateOption(qIdx, oIdx, e.target.value)} className="text-xs" />
                    ))}
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground">Correct Answer</p>
                    <Input placeholder="Type the correct answer" value={q.correct} onChange={e => updateQuestion(qIdx, "correct", e.target.value)} className="text-xs" />
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-3 w-full gap-1 text-xs"
              onClick={() => setQuestions(prev => [...prev, { question: "", options: ["", "", "", ""], correct: "" }])}>
              <Plus className="h-3 w-3" strokeWidth={1.75} /> Add Question
            </Button>
          </div>

          <Button className="w-full" onClick={handleSubmit} disabled={submitting || !title.trim()}>
            {submitting ? "Creating…" : "Create Assignment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main Class Component ─────────────────────────────────────────────────────

const Class = () => {
  const { user, userRole, isGuest } = useAuth();
  const isTeacher = userRole === "teacher";

  const [myClass, setMyClass] = useState<ClassData | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mySubmissions, setMySubmissions] = useState<Record<string, { score: number | null }>>({});
  const [teacherSubmissions, setTeacherSubmissions] = useState<Record<string, Submission[]>>({});

  const [showCreateClass, setShowCreateClass] = useState(false);
  const [showJoinClass, setShowJoinClass] = useState(false);
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);
  const [expandedAssignment, setExpandedAssignment] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [newClassName, setNewClassName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Feed
  const [commentingOn, setCommentingOn] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [expandedFeed, setExpandedFeed] = useState<string | null>(null);

  // View stack
  const [activeView, setActiveView] = useState<"main" | "assignments" | "feed">("main");

  // ── Data fetching ────────────────────────────────────────────────────────────

  const fetchClassData = async () => {
    if (!user) return;
    setLoading(true);

    let classData: ClassData | null = null;
    if (isTeacher) {
      const { data } = await supabase.from("classes").select("*").eq("teacher_id", user.id).limit(1).single();
      classData = data;
    } else {
      const { data: membership } = await supabase.from("class_members").select("class_id").eq("user_id", user.id).limit(1).single();
      if (membership) {
        const { data } = await supabase.from("classes").select("*").eq("id", membership.class_id).single();
        classData = data;
      }
    }

    setMyClass(classData);

    if (classData) {
      const { data: assignData } = await supabase.from("assignments").select("*").eq("class_id", classData.id).order("created_at", { ascending: false });
      const parsed: Assignment[] = (assignData || []).map(a => ({ ...a, questions: a.questions as unknown as AssignmentQuestion[] | null }));
      setAssignments(parsed);

      if (!isTeacher && parsed.length > 0) {
        const { data: subs } = await supabase.from("assignment_submissions").select("assignment_id, score").eq("user_id", user.id).in("assignment_id", parsed.map(a => a.id));
        const subMap: Record<string, { score: number | null }> = {};
        (subs || []).forEach(s => { subMap[s.assignment_id] = { score: s.score }; });
        setMySubmissions(subMap);
      }

      if (isTeacher && parsed.length > 0) {
        const { data: allSubs } = await supabase.from("assignment_submissions").select("assignment_id, user_id, score, submitted_at").in("assignment_id", parsed.map(a => a.id));
        if (allSubs?.length) {
          const ids = [...new Set(allSubs.map(s => s.user_id))];
          const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", ids);
          const pm = Object.fromEntries((profiles || []).map(p => [p.user_id, p.display_name || "Unknown"]));
          const grouped: Record<string, Submission[]> = {};
          allSubs.forEach(s => {
            if (!grouped[s.assignment_id]) grouped[s.assignment_id] = [];
            grouped[s.assignment_id].push({ user_id: s.user_id, score: s.score, submitted_at: s.submitted_at, display_name: pm[s.user_id] || "Unknown" });
          });
          setTeacherSubmissions(grouped);
        }
      }

      // Feed
      const { data: feedData } = await supabase.from("class_feed").select("*").eq("class_id", classData.id).order("created_at", { ascending: false }).limit(20);
      if (feedData?.length) {
        const userIds = [...new Set(feedData.map(f => f.user_id))];
        const feedIds = feedData.map(f => f.id);
        const [profilesRes, reactionsRes, commentsRes, userReactionsRes] = await Promise.all([
          supabase.from("profiles").select("user_id, display_name").in("user_id", userIds),
          supabase.from("feed_reactions").select("feed_item_id").in("feed_item_id", feedIds),
          supabase.from("feed_comments").select("id, feed_item_id, user_id, content, created_at").in("feed_item_id", feedIds).order("created_at", { ascending: true }),
          supabase.from("feed_reactions").select("feed_item_id").in("feed_item_id", feedIds).eq("user_id", user.id),
        ]);
        const pm = Object.fromEntries((profilesRes.data || []).map(p => [p.user_id, p.display_name]));
        const commentUids = [...new Set((commentsRes.data || []).map(c => c.user_id))].filter(id => !pm[id]);
        if (commentUids.length) {
          const { data: extra } = await supabase.from("profiles").select("user_id, display_name").in("user_id", commentUids);
          (extra || []).forEach(p => { pm[p.user_id] = p.display_name || "Unknown"; });
        }
        const reactionCounts: Record<string, number> = {};
        (reactionsRes.data || []).forEach(r => { reactionCounts[r.feed_item_id] = (reactionCounts[r.feed_item_id] || 0) + 1; });
        const userReactedSet = new Set((userReactionsRes.data || []).map(r => r.feed_item_id));
        const commentsByFeed: Record<string, FeedComment[]> = {};
        (commentsRes.data || []).forEach(c => {
          if (!commentsByFeed[c.feed_item_id]) commentsByFeed[c.feed_item_id] = [];
          commentsByFeed[c.feed_item_id].push({ id: c.id, user_id: c.user_id, content: c.content, created_at: c.created_at, display_name: pm[c.user_id] || "Unknown" });
        });
        setFeedItems(feedData.map(f => ({
          ...f,
          profile: { display_name: pm[f.user_id] || "Unknown" },
          reactions_count: reactionCounts[f.id] || 0,
          comments_count: commentsByFeed[f.id]?.length || 0,
          comments: commentsByFeed[f.id] || [],
          userReacted: userReactedSet.has(f.id),
        })));
      } else { setFeedItems([]); }
    }

    setLoading(false);
  };

  useEffect(() => { fetchClassData(); }, [user, userRole]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 3; i++) code += chars[Math.floor(Math.random() * 26)];
    code += "-";
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  };

  const handleCreateClass = async () => {
    if (!user || !newClassName.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("classes").insert({ name: newClassName.trim(), class_code: generateCode(), teacher_id: user.id });
    if (error) toast.error(error.message);
    else { toast.success("Class created!"); setShowCreateClass(false); setNewClassName(""); fetchClassData(); }
    setSubmitting(false);
  };

  const handleJoinClass = async () => {
    if (!user || !joinCode.trim()) return;
    setSubmitting(true);
    const { data: classLookup, error: findError } = await supabase.rpc("get_class_by_code", { _class_code: joinCode.trim().toUpperCase() });
    const classData = classLookup?.[0];
    if (findError || !classData) { toast.error("Class not found."); setSubmitting(false); return; }
    const { error } = await supabase.from("class_members").insert({ class_id: classData.id, user_id: user.id });
    if (error) toast.error(error.message.includes("duplicate") ? "You're already in this class." : error.message);
    else { toast.success(`Joined ${classData.name}!`); setShowJoinClass(false); setJoinCode(""); fetchClassData(); }
    setSubmitting(false);
  };

  const handleDeleteAssignment = async (id: string) => {
    const { error } = await supabase.from("assignments").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Assignment deleted"); setAssignments(prev => prev.filter(a => a.id !== id)); }
  };

  const handleReact = async (feedItemId: string) => {
    if (!user) return;
    const item = feedItems.find(f => f.id === feedItemId);
    if (item?.userReacted) {
      await supabase.from("feed_reactions").delete().eq("feed_item_id", feedItemId).eq("user_id", user.id);
    } else {
      const { error } = await supabase.from("feed_reactions").insert({ feed_item_id: feedItemId, user_id: user.id });
      if (error && !error.message.includes("duplicate")) { toast.error(error.message); return; }
    }
    setFeedItems(prev => prev.map(f => f.id === feedItemId ? { ...f, userReacted: !f.userReacted, reactions_count: f.userReacted ? f.reactions_count - 1 : f.reactions_count + 1 } : f));
  };

  const handleComment = async (feedItemId: string) => {
    if (!user || !commentText.trim()) return;
    const { data, error } = await supabase.from("feed_comments").insert({ feed_item_id: feedItemId, user_id: user.id, content: commentText.trim() }).select("id, created_at").single();
    if (error) { toast.error(error.message); return; }
    const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).single();
    setFeedItems(prev => prev.map(f => f.id === feedItemId ? {
      ...f, comments_count: f.comments_count + 1,
      comments: [...(f.comments || []), { id: data.id, user_id: user.id, content: commentText.trim(), created_at: data.created_at, display_name: profile?.display_name || "You" }],
    } : f));
    setCommentText(""); setCommentingOn(null);
  };

  // ── Guard: guest ─────────────────────────────────────────────────────────────

  if (isGuest && !user) {
    return (
      <div className="pb-28 min-h-screen">
        <motion.div {...stagger(0)} className="px-4 pt-6 pb-4 border-b border-border/50">
          <h1 className="text-[22px] font-semibold tracking-tight">My Class</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Join or create a class to collaborate.</p>
        </motion.div>
        <div className="px-4 pt-8">
          <GuestGate>
            {(gate) => (
              <Button size="lg" className="w-full gap-2" onClick={() => gate()}>
                <LogIn className="h-4 w-4" strokeWidth={1.75} /> Sign In to Access Classes
              </Button>
            )}
          </GuestGate>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center pb-24 pt-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── No class yet ─────────────────────────────────────────────────────────────

  if (!myClass) {
    return (
      <div className="pb-28 min-h-screen">
        <motion.div {...stagger(0)} className="px-4 pt-6 pb-4 border-b border-border/50">
          <h1 className="text-[22px] font-semibold tracking-tight">My Class</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isTeacher ? "Create a class to get started." : "Join a class with your teacher's code."}
          </p>
        </motion.div>
        <div className="px-4 pt-6">
          {isTeacher ? (
            <Dialog open={showCreateClass} onOpenChange={setShowCreateClass}>
              <DialogTrigger asChild>
                <Button size="lg" className="w-full gap-2">
                  <Plus className="h-4 w-4" strokeWidth={1.75} /> Create a Class
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create a Class</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Class Name</label>
                    <Input placeholder="e.g. Algebra 7-A" value={newClassName} onChange={e => setNewClassName(e.target.value)} className="text-sm" />
                  </div>
                  <Button className="w-full" onClick={handleCreateClass} disabled={submitting || !newClassName.trim()}>
                    {submitting ? "Creating…" : "Create Class"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <Dialog open={showJoinClass} onOpenChange={setShowJoinClass}>
              <DialogTrigger asChild>
                <Button size="lg" className="w-full gap-2">
                  <LogIn className="h-4 w-4" strokeWidth={1.75} /> Join a Class
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Join a Class</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Class Code</label>
                    <Input placeholder="e.g. ABC-1234" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} className="text-sm font-mono" />
                  </div>
                  <Button className="w-full" onClick={handleJoinClass} disabled={submitting || !joinCode.trim()}>
                    {submitting ? "Joining…" : "Join Class"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    );
  }

  // ── Assignments sub-view ──────────────────────────────────────────────────────

  if (activeView === "assignments") {
    return (
      <div className="pb-28 min-h-screen">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 pt-5 pb-4 border-b border-border/50">
          <button onClick={() => setActiveView("main")} className="text-muted-foreground hover:text-foreground transition-colors p-1 -ml-1">
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <span className="text-sm font-medium flex-1 truncate">Assignments</span>
          {isTeacher && (
            <Button size="sm" variant="ghost" className="gap-1 h-7 text-xs px-2" onClick={() => setShowCreateAssignment(true)}>
              <Plus className="h-3.5 w-3.5" strokeWidth={1.75} /> New
            </Button>
          )}
        </div>

        <CreateAssignmentDialog
          open={showCreateAssignment}
          onOpenChange={setShowCreateAssignment}
          classId={myClass.id}
          teacherId={user!.id}
          onCreated={fetchClassData}
        />

        <div className="px-4 pt-5">
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No assignments yet.</p>
          ) : (
            <div className="divide-y divide-border/50">
              {assignments.map((a, i) => {
                const mySubmission = mySubmissions[a.id];
                const subs = teacherSubmissions[a.id] || [];
                const isExpanded = expandedAssignment === a.id;
                const qCount = a.questions?.length || 0;

                return (
                  <motion.div key={a.id} {...stagger(i)} className="py-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <BookOpen className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold leading-snug">{a.title}</p>
                            {a.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-1">
                              {a.due_date && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-3 w-3" strokeWidth={1.75} />
                                  {new Date(a.due_date).toLocaleDateString()}
                                </span>
                              )}
                              <span className="text-[10px] text-muted-foreground">{qCount} question{qCount !== 1 ? "s" : ""}</span>
                            </div>
                          </div>
                          {isTeacher && (
                            <button onClick={() => handleDeleteAssignment(a.id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                            </button>
                          )}
                        </div>

                        {/* Learner actions */}
                        {!isTeacher && (
                          <div className="mt-2.5">
                            {mySubmission ? (
                              <div className="flex items-center gap-2">
                                <Check className="h-3.5 w-3.5 text-emerald-500" strokeWidth={2} />
                                <span className="text-xs text-emerald-600 font-medium">
                                  {mySubmission.score}/{qCount} correct
                                </span>
                              </div>
                            ) : qCount > 0 ? (
                              <button
                                onClick={() => setActiveAssignment(a)}
                                className="text-xs font-medium text-primary hover:underline underline-offset-2 transition-colors"
                              >
                                Answer now →
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">No questions yet</span>
                            )}
                          </div>
                        )}

                        {/* Teacher: submissions */}
                        {isTeacher && (
                          <div className="mt-2.5">
                            <button
                              onClick={() => setExpandedAssignment(isExpanded ? null : a.id)}
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {subs.length} submission{subs.length !== 1 ? "s" : ""}
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="space-y-1.5 pt-2">
                                    {subs.length === 0 ? (
                                      <p className="text-xs text-muted-foreground">No submissions yet</p>
                                    ) : subs.map(s => (
                                      <div key={s.user_id} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                                        <div className="flex items-center gap-2">
                                          <Avatar name={s.display_name} />
                                          <span className="text-xs font-medium">{s.display_name}</span>
                                        </div>
                                        <div className="text-right">
                                          <span className="text-xs font-semibold">{s.score}/{qCount}</span>
                                          <p className="text-[10px] text-muted-foreground">{timeAgo(s.submitted_at)}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Answer Dialog */}
        <Dialog open={!!activeAssignment} onOpenChange={() => setActiveAssignment(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{activeAssignment?.title}</DialogTitle></DialogHeader>
            {activeAssignment && user && (
              <AssignmentAnswerModal
                assignment={activeAssignment}
                userId={user.id}
                onClose={() => setActiveAssignment(null)}
                onSubmitted={fetchClassData}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── Activity Feed sub-view ────────────────────────────────────────────────────

  if (activeView === "feed") {
    return (
      <div className="pb-28 min-h-screen">
        <div className="flex items-center gap-2 px-4 pt-5 pb-4 border-b border-border/50">
          <button onClick={() => setActiveView("main")} className="text-muted-foreground hover:text-foreground transition-colors p-1 -ml-1">
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <span className="text-sm font-medium">Activity Feed</span>
        </div>

        <div className="px-4 pt-4">
          {feedItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No activity yet. Complete levels to see updates!</p>
          ) : (
            <div className="divide-y divide-border/50">
              {feedItems.map((item, i) => (
                <motion.div key={item.id} {...stagger(i)} className="py-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <Avatar name={item.profile?.display_name || "?"} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-xs font-semibold">{item.profile?.display_name || "Unknown"}</p>
                        <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(item.created_at)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.content || item.action_type}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pl-10">
                    <button
                      onClick={() => handleReact(item.id)}
                      className={`flex items-center gap-1.5 text-xs transition-colors ${
                        item.userReacted ? "text-rose-500" : "text-muted-foreground hover:text-rose-500"
                      }`}
                    >
                      <Heart className={`h-3.5 w-3.5 ${item.userReacted ? "fill-current" : ""}`} strokeWidth={1.75} />
                      {item.reactions_count}
                    </button>
                    <button
                      onClick={() => {
                        setExpandedFeed(expandedFeed === item.id ? null : item.id);
                        setCommentingOn(item.id);
                      }}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
                      {item.comments_count}
                    </button>
                  </div>

                  <AnimatePresence>
                    {expandedFeed === item.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden pl-10"
                      >
                        <div className="border-t border-border/40 pt-2 space-y-2">
                          {(item.comments || []).map(c => (
                            <div key={c.id} className="flex items-start gap-2">
                              <Avatar name={c.display_name} />
                              <div>
                                <span className="text-xs font-semibold">{c.display_name}</span>
                                <span className="text-xs text-muted-foreground ml-1.5">{c.content}</span>
                                <span className="text-[10px] text-muted-foreground/60 ml-1">{timeAgo(c.created_at)}</span>
                              </div>
                            </div>
                          ))}
                          <div className="flex gap-2 pt-1">
                            <Input
                              placeholder="Write a comment…"
                              className="h-8 text-xs"
                              value={commentingOn === item.id ? commentText : ""}
                              onFocus={() => setCommentingOn(item.id)}
                              onChange={e => setCommentText(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") handleComment(item.id); }}
                            />
                            <Button
                              size="sm" variant="ghost" className="h-8 px-2 shrink-0"
                              onClick={() => handleComment(item.id)}
                              disabled={!commentText.trim()}
                            >
                              <Send className="h-3.5 w-3.5" strokeWidth={1.75} />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Main view ─────────────────────────────────────────────────────────────────

  const pendingAssignments = assignments.filter(a => !mySubmissions[a.id] && (a.questions?.length || 0) > 0).length;

  return (
    <div className="pb-28 min-h-screen">
      {/* Header */}
      <motion.div {...stagger(0)} className="px-4 pt-6 pb-4 border-b border-border/50">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight">{myClass.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Your classroom</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-primary/10 px-2 py-1 font-mono text-xs font-bold text-primary">
              {myClass.class_code}
            </span>
            <button
              onClick={() => { navigator.clipboard.writeText(myClass.class_code); toast.success("Code copied!"); }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </motion.div>

      <div className="px-4 pt-5 space-y-6">
        {/* Progress Board */}
        <motion.div {...stagger(1)}>
          <SectionLabel>Leaderboard</SectionLabel>
          <ProgressBoard classId={myClass.id} teacherId={myClass.teacher_id} />
        </motion.div>

        {/* Quick nav cards */}
        <motion.div {...stagger(2)}>
          <SectionLabel>Sections</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            {/* Assignments card */}
            <button
              onClick={() => setActiveView("assignments")}
              className="group flex flex-col items-start gap-3 rounded-2xl border border-border/60 bg-card p-4 text-left hover:border-primary/40 hover:bg-primary/5 transition-all"
            >
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <ClipboardList className="h-4 w-4 text-primary" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-sm font-semibold leading-snug">Assignments</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {!isTeacher && pendingAssignments > 0
                    ? `${pendingAssignments} pending`
                    : `${assignments.length} total`}
                </p>
              </div>
            </button>

            {/* Activity card */}
            <button
              onClick={() => setActiveView("feed")}
              className="group flex flex-col items-start gap-3 rounded-2xl border border-border/60 bg-card p-4 text-left hover:border-primary/40 hover:bg-primary/5 transition-all"
            >
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Zap className="h-4 w-4 text-primary" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-sm font-semibold leading-snug">Activity</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {feedItems.length} update{feedItems.length !== 1 ? "s" : ""}
                </p>
              </div>
            </button>
          </div>
        </motion.div>

        {/* Recent assignments preview */}
        {assignments.length > 0 && (
          <motion.div {...stagger(3)}>
            <div className="flex items-center justify-between mb-3">
              <SectionLabel>Recent Assignments</SectionLabel>
              <button
                onClick={() => setActiveView("assignments")}
                className="text-[11px] text-primary hover:underline underline-offset-2 -mt-3"
              >
                See all
              </button>
            </div>
            <div className="divide-y divide-border/50">
              {assignments.slice(0, 3).map((a, i) => {
                const mySubmission = mySubmissions[a.id];
                const qCount = a.questions?.length || 0;
                return (
                  <motion.div key={a.id} {...stagger(i)} className="py-3 flex items-center gap-3">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <BookOpen className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.title}</p>
                      <p className="text-[10px] text-muted-foreground">{qCount} question{qCount !== 1 ? "s" : ""}</p>
                    </div>
                    {!isTeacher && (
                      mySubmission ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <Check className="h-3.5 w-3.5 text-emerald-500" strokeWidth={2} />
                          <span className="text-xs text-emerald-600">{mySubmission.score}/{qCount}</span>
                        </div>
                      ) : qCount > 0 ? (
                        <button
                          onClick={() => setActiveAssignment(a)}
                          className="text-[10px] font-medium text-primary border border-primary/30 rounded-full px-2 py-0.5 hover:bg-primary/5 transition-colors shrink-0"
                        >
                          Answer
                        </button>
                      ) : null
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Recent feed preview */}
        {feedItems.length > 0 && (
          <motion.div {...stagger(4)}>
            <div className="flex items-center justify-between mb-3">
              <SectionLabel>Recent Activity</SectionLabel>
              <button
                onClick={() => setActiveView("feed")}
                className="text-[11px] text-primary hover:underline underline-offset-2 -mt-3"
              >
                See all
              </button>
            </div>
            <div className="divide-y divide-border/50">
              {feedItems.slice(0, 3).map((item, i) => (
                <motion.div key={item.id} {...stagger(i)} className="py-3 flex items-start gap-3">
                  <Avatar name={item.profile?.display_name || "?"} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-xs font-semibold">{item.profile?.display_name || "Unknown"}</p>
                      <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(item.created_at)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.content || item.action_type}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Answer Dialog */}
      <Dialog open={!!activeAssignment} onOpenChange={() => setActiveAssignment(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{activeAssignment?.title}</DialogTitle></DialogHeader>
          {activeAssignment && user && (
            <AssignmentAnswerModal
              assignment={activeAssignment}
              userId={user.id}
              onClose={() => setActiveAssignment(null)}
              onSubmitted={fetchClassData}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Class;