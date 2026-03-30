import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Copy, Heart, MessageCircle, ClipboardList, Plus, LogIn, Loader2, Trash2, Calendar, Check, X, Send, ChevronDown, ChevronUp, Trophy } from "lucide-react";
import ProgressBoard from "@/components/ProgressBoard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import GuestGate from "@/components/GuestGate";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ClassData {
  id: string;
  name: string;
  class_code: string;
  teacher_id: string;
  created_at: string;
}

interface AssignmentQuestion {
  question: string;
  options: string[];
  correct: string;
}

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  created_at: string;
  questions: AssignmentQuestion[] | null;
}

interface FeedItem {
  id: string;
  user_id: string;
  action_type: string;
  content: string | null;
  created_at: string;
  profile?: { display_name: string | null };
  reactions_count: number;
  comments_count: number;
  comments?: FeedComment[];
  userReacted?: boolean;
}

interface FeedComment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  display_name: string;
}

// LeaderboardEntry moved to ProgressBoard component

interface Submission {
  user_id: string;
  score: number | null;
  submitted_at: string;
  display_name: string;
}

// ─── Assignment Answer Modal (Learner) ───
const AssignmentAnswerModal = ({
  assignment,
  userId,
  onClose,
  onSubmitted,
}: {
  assignment: Assignment;
  userId: string;
  onClose: () => void;
  onSubmitted: () => void;
}) => {
  const questions = assignment.questions || [];
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (questions.length === 0) return;
    setSubmitting(true);

    let correct = 0;
    questions.forEach((q, idx) => {
      if (answers[idx]?.trim().toLowerCase() === q.correct.trim().toLowerCase()) {
        correct++;
      }
    });

    setScore(correct);

    await supabase.from("assignment_submissions").insert({
      assignment_id: assignment.id,
      user_id: userId,
      answers: answers as any,
      score: correct,
    });

    setSubmitted(true);
    setSubmitting(false);
    onSubmitted();
  };

  if (questions.length === 0) {
    return (
      <div className="space-y-4 text-center py-4">
        <p className="text-muted-foreground">This assignment has no questions yet.</p>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    );
  }

  if (submitted) {
    const percent = Math.round((score / questions.length) * 100);
    return (
      <div className="space-y-4 text-center py-4">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${percent >= 75 ? "bg-success/10" : "bg-warning/10"}`}>
          <Trophy className={`h-8 w-8 ${percent >= 75 ? "text-success" : "text-warning"}`} />
        </div>
        <div>
          <p className="font-display text-xl font-bold">{score}/{questions.length} correct</p>
          <p className="text-sm text-muted-foreground">{percent}% — {percent >= 75 ? "Great job! 🎉" : "Keep practicing! 💪"}</p>
        </div>
        <Button onClick={onClose} className="w-full">Done</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
      {questions.map((q, idx) => (
        <div key={idx} className="space-y-2 rounded-xl border p-3">
          <p className="text-sm font-semibold">{idx + 1}. {q.question}</p>
          {q.options && q.options.length > 0 ? (
            <div className="space-y-1.5">
              {q.options.map((opt, oi) => (
                <button
                  key={oi}
                  onClick={() => setAnswers(prev => ({ ...prev, [idx]: opt }))}
                  className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition-all ${
                    answers[idx] === opt
                      ? "border-primary bg-primary/5 font-medium"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <Input
              placeholder="Type your answer..."
              value={answers[idx] || ""}
              onChange={e => setAnswers(prev => ({ ...prev, [idx]: e.target.value }))}
            />
          )}
        </div>
      ))}
      <Button
        className="w-full gap-2"
        onClick={handleSubmit}
        disabled={submitting || Object.keys(answers).length < questions.length}
      >
        {submitting ? "Submitting..." : <><Send className="h-4 w-4" /> Submit Answers</>}
      </Button>
    </div>
  );
};

// ─── Create Assignment with Questions (Teacher) ───
const CreateAssignmentDialog = ({
  open,
  onOpenChange,
  classId,
  teacherId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  classId: string;
  teacherId: string;
  onCreated: () => void;
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [questions, setQuestions] = useState<AssignmentQuestion[]>([
    { question: "", options: ["", "", "", ""], correct: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const updateQuestion = (idx: number, field: keyof AssignmentQuestion, value: any) => {
    setQuestions(prev => prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q)));
  };

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    setQuestions(prev =>
      prev.map((q, i) =>
        i === qIdx
          ? { ...q, options: q.options.map((o, j) => (j === oIdx ? value : o)) }
          : q
      )
    );
  };

  const addQuestion = () => {
    setQuestions(prev => [...prev, { question: "", options: ["", "", "", ""], correct: "" }]);
  };

  const removeQuestion = (idx: number) => {
    if (questions.length <= 1) return;
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    const validQuestions = questions.filter(q => q.question.trim() && q.correct.trim());
    if (validQuestions.length === 0) {
      toast.error("Add at least one question with a correct answer.");
      return;
    }
    setSubmitting(true);

    const { error } = await supabase.from("assignments").insert({
      class_id: classId,
      teacher_id: teacherId,
      title: title.trim(),
      description: description.trim() || null,
      due_date: dueDate || null,
      questions: validQuestions as any,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Assignment created!");
      setTitle("");
      setDescription("");
      setDueDate("");
      setQuestions([{ question: "", options: ["", "", "", ""], correct: "" }]);
      onOpenChange(false);
      onCreated();
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create Assignment</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input placeholder="e.g. Practice: Single Operations" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea placeholder="Instructions for students..." value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Due Date (optional)</Label>
            <Input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>

          <div className="border-t pt-4">
            <Label className="text-base font-bold">Questions</Label>
            <div className="space-y-4 mt-3">
              {questions.map((q, qIdx) => (
                <div key={qIdx} className="space-y-2 rounded-xl border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground">Q{qIdx + 1}</span>
                    {questions.length > 1 && (
                      <button onClick={() => removeQuestion(qIdx)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <Input
                    placeholder="Enter question..."
                    value={q.question}
                    onChange={e => updateQuestion(qIdx, "question", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Options (leave blank for free-text answer):</p>
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((opt, oIdx) => (
                      <Input
                        key={oIdx}
                        placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                        value={opt}
                        onChange={e => updateOption(qIdx, oIdx, e.target.value)}
                      />
                    ))}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Correct Answer</Label>
                    <Input
                      placeholder="Type the correct answer"
                      value={q.correct}
                      onChange={e => updateQuestion(qIdx, "correct", e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-3 gap-1 w-full" onClick={addQuestion}>
              <Plus className="h-3 w-3" /> Add Question
            </Button>
          </div>

          <Button className="w-full" onClick={handleSubmit} disabled={submitting || !title.trim()}>
            {submitting ? "Creating..." : "Create Assignment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main Class Component ───
const Class = () => {
  const { user, userRole, isGuest } = useAuth();
  const isTeacher = userRole === "teacher";

  const [myClass, setMyClass] = useState<ClassData | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mySubmissions, setMySubmissions] = useState<Record<string, { score: number | null }>>({});
  const [teacherSubmissions, setTeacherSubmissions] = useState<Record<string, Submission[]>>({});

  // Dialogs
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [showJoinClass, setShowJoinClass] = useState(false);
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);
  const [expandedAssignment, setExpandedAssignment] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [newClassName, setNewClassName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Feed comment state
  const [commentingOn, setCommentingOn] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [expandedFeed, setExpandedFeed] = useState<string | null>(null);

  const fetchClassData = async () => {
    if (!user) return;
    setLoading(true);

    let classData: ClassData | null = null;

    if (isTeacher) {
      const { data } = await supabase
        .from("classes")
        .select("*")
        .eq("teacher_id", user.id)
        .limit(1)
        .single();
      classData = data;
    } else {
      const { data: membership } = await supabase
        .from("class_members")
        .select("class_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (membership) {
        const { data } = await supabase
          .from("classes")
          .select("*")
          .eq("id", membership.class_id)
          .single();
        classData = data;
      }
    }

    setMyClass(classData);

    if (classData) {
      // Fetch assignments
      const { data: assignData } = await supabase
        .from("assignments")
        .select("*")
        .eq("class_id", classData.id)
        .order("created_at", { ascending: false });

      const parsedAssignments: Assignment[] = (assignData || []).map(a => ({
        ...a,
        questions: a.questions as unknown as AssignmentQuestion[] | null,
      }));
      setAssignments(parsedAssignments);

      // Fetch my submissions (learner) or all submissions (teacher)
      if (!isTeacher && parsedAssignments.length > 0) {
        const { data: subs } = await supabase
          .from("assignment_submissions")
          .select("assignment_id, score")
          .eq("user_id", user.id)
          .in("assignment_id", parsedAssignments.map(a => a.id));

        const subMap: Record<string, { score: number | null }> = {};
        (subs || []).forEach(s => {
          subMap[s.assignment_id] = { score: s.score };
        });
        setMySubmissions(subMap);
      }

      if (isTeacher && parsedAssignments.length > 0) {
        const { data: allSubs } = await supabase
          .from("assignment_submissions")
          .select("assignment_id, user_id, score, submitted_at")
          .in("assignment_id", parsedAssignments.map(a => a.id));

        if (allSubs && allSubs.length > 0) {
          const subUserIds = [...new Set(allSubs.map(s => s.user_id))];
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, display_name")
            .in("user_id", subUserIds);
          const profileMap = Object.fromEntries(
            (profiles || []).map(p => [p.user_id, p.display_name || "Unknown"])
          );

          const grouped: Record<string, Submission[]> = {};
          allSubs.forEach(s => {
            if (!grouped[s.assignment_id]) grouped[s.assignment_id] = [];
            grouped[s.assignment_id].push({
              user_id: s.user_id,
              score: s.score,
              submitted_at: s.submitted_at,
              display_name: profileMap[s.user_id] || "Unknown",
            });
          });
          setTeacherSubmissions(grouped);
        }
      }

      // Fetch feed with comments
      const { data: feedData } = await supabase
        .from("class_feed")
        .select("*")
        .eq("class_id", classData.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (feedData && feedData.length > 0) {
        const userIds = [...new Set(feedData.map(f => f.user_id))];
        const feedIds = feedData.map(f => f.id);

        const [profilesRes, reactionsRes, commentsRes, userReactionsRes] = await Promise.all([
          supabase.from("profiles").select("user_id, display_name").in("user_id", userIds),
          supabase.from("feed_reactions").select("feed_item_id").in("feed_item_id", feedIds),
          supabase.from("feed_comments").select("id, feed_item_id, user_id, content, created_at").in("feed_item_id", feedIds).order("created_at", { ascending: true }),
          supabase.from("feed_reactions").select("feed_item_id").in("feed_item_id", feedIds).eq("user_id", user.id),
        ]);

        const profileMap = Object.fromEntries(
          (profilesRes.data || []).map(p => [p.user_id, p.display_name])
        );

        // Get comment user profiles
        const commentUserIds = [...new Set((commentsRes.data || []).map(c => c.user_id))];
        let commentProfileMap: Record<string, string> = { ...profileMap };
        const missingIds = commentUserIds.filter(id => !commentProfileMap[id]);
        if (missingIds.length > 0) {
          const { data: moreProfiles } = await supabase
            .from("profiles").select("user_id, display_name").in("user_id", missingIds);
          (moreProfiles || []).forEach(p => {
            commentProfileMap[p.user_id] = p.display_name || "Unknown";
          });
        }

        const reactionCounts: Record<string, number> = {};
        (reactionsRes.data || []).forEach(r => {
          reactionCounts[r.feed_item_id] = (reactionCounts[r.feed_item_id] || 0) + 1;
        });

        const userReactedSet = new Set((userReactionsRes.data || []).map(r => r.feed_item_id));

        const commentsByFeed: Record<string, FeedComment[]> = {};
        (commentsRes.data || []).forEach(c => {
          if (!commentsByFeed[c.feed_item_id]) commentsByFeed[c.feed_item_id] = [];
          commentsByFeed[c.feed_item_id].push({
            id: c.id,
            user_id: c.user_id,
            content: c.content,
            created_at: c.created_at,
            display_name: commentProfileMap[c.user_id] || "Unknown",
          });
        });

        const commentCounts: Record<string, number> = {};
        Object.entries(commentsByFeed).forEach(([fid, arr]) => {
          commentCounts[fid] = arr.length;
        });

        setFeedItems(feedData.map(f => ({
          ...f,
          profile: { display_name: profileMap[f.user_id] || "Unknown" },
          reactions_count: reactionCounts[f.id] || 0,
          comments_count: commentCounts[f.id] || 0,
          comments: commentsByFeed[f.id] || [],
          userReacted: userReactedSet.has(f.id),
        })));
      } else {
        setFeedItems([]);
      }

      // Fetch leaderboard
      const { data: members } = await supabase
        .from("class_members")
        .select("user_id")
        .eq("class_id", classData.id);

      const memberIds = (members || []).map(m => m.user_id);
      if (!memberIds.includes(classData.teacher_id)) {
        memberIds.push(classData.teacher_id);
      }

      if (memberIds.length > 0) {
        const [profilesRes, progressRes] = await Promise.all([
          supabase.from("profiles").select("user_id, display_name").in("user_id", memberIds),
          supabase.from("user_progress").select("user_id, completed, score").in("user_id", memberIds),
        ]);

        const profileMap = Object.fromEntries(
          (profilesRes.data || []).map(p => [p.user_id, p.display_name || "Unknown"])
        );

        const progressMap: Record<string, { completed: number; score: number }> = {};
        (progressRes.data || []).forEach(p => {
          if (!progressMap[p.user_id]) progressMap[p.user_id] = { completed: 0, score: 0 };
          if (p.completed) progressMap[p.user_id].completed += 1;
          progressMap[p.user_id].score += (p.score || 0);
        });

        const lb = memberIds.map(uid => ({
          user_id: uid,
          display_name: uid === user.id ? "You" : (profileMap[uid] || "Unknown"),
          completed_levels: progressMap[uid]?.completed || 0,
          total_score: progressMap[uid]?.score || 0,
        }));

        lb.sort((a, b) => b.completed_levels - a.completed_levels || b.total_score - a.total_score);
        setLeaderboard(lb);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchClassData();
  }, [user, userRole]);

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
    const code = generateCode();
    const { error } = await supabase.from("classes").insert({
      name: newClassName.trim(),
      class_code: code,
      teacher_id: user.id,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Class created!");
      setShowCreateClass(false);
      setNewClassName("");
      fetchClassData();
    }
    setSubmitting(false);
  };

  const handleJoinClass = async () => {
    if (!user || !joinCode.trim()) return;
    setSubmitting(true);

    const normalizedCode = joinCode.trim().toUpperCase();
    const { data: classLookup, error: findError } = await supabase
      .rpc("get_class_by_code", { _class_code: normalizedCode });

    const classData = classLookup?.[0];

    if (findError || !classData) {
      toast.error("Class not found. Check the code and try again.");
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from("class_members").insert({
      class_id: classData.id,
      user_id: user.id,
    });

    if (error) {
      toast.error(error.message.includes("duplicate") ? "You're already in this class." : error.message);
    } else {
      toast.success(`Joined ${classData.name}!`);
      setShowJoinClass(false);
      setJoinCode("");
      fetchClassData();
    }
    setSubmitting(false);
  };

  const handleDeleteAssignment = async (id: string) => {
    const { error } = await supabase.from("assignments").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Assignment deleted");
      setAssignments(prev => prev.filter(a => a.id !== id));
    }
  };

  const handleCopyCode = () => {
    if (myClass) {
      navigator.clipboard.writeText(myClass.class_code);
      toast.success("Code copied!");
    }
  };

  const handleReact = async (feedItemId: string) => {
    if (!user) return;
    const item = feedItems.find(f => f.id === feedItemId);

    if (item?.userReacted) {
      await supabase.from("feed_reactions").delete()
        .eq("feed_item_id", feedItemId)
        .eq("user_id", user.id);
    } else {
      const { error } = await supabase.from("feed_reactions").insert({
        feed_item_id: feedItemId,
        user_id: user.id,
      });
      if (error && !error.message.includes("duplicate")) {
        toast.error(error.message);
        return;
      }
    }

    setFeedItems(prev =>
      prev.map(f =>
        f.id === feedItemId
          ? {
              ...f,
              userReacted: !f.userReacted,
              reactions_count: f.userReacted ? f.reactions_count - 1 : f.reactions_count + 1,
            }
          : f
      )
    );
  };

  const handleComment = async (feedItemId: string) => {
    if (!user || !commentText.trim()) return;

    const { data, error } = await supabase.from("feed_comments").insert({
      feed_item_id: feedItemId,
      user_id: user.id,
      content: commentText.trim(),
    }).select("id, created_at").single();

    if (error) {
      toast.error(error.message);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .single();

    setFeedItems(prev =>
      prev.map(f =>
        f.id === feedItemId
          ? {
              ...f,
              comments_count: f.comments_count + 1,
              comments: [
                ...(f.comments || []),
                {
                  id: data.id,
                  user_id: user.id,
                  content: commentText.trim(),
                  created_at: data.created_at,
                  display_name: profile?.display_name || "You",
                },
              ],
            }
          : f
      )
    );
    setCommentText("");
    setCommentingOn(null);
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  // Guest gate — show login prompt for guests
  if (isGuest && !user) {
    return (
      <div className="pb-24 pt-4 px-4">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-2xl font-bold mb-1">My Class</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Join or create a class to collaborate with your teacher and classmates.
          </p>
        </motion.div>
        <GuestGate>
          {(gate) => (
            <Button size="lg" className="w-full gap-2 font-semibold" onClick={() => gate()}>
              <LogIn className="h-4 w-4" /> Sign In to Access Classes
            </Button>
          )}
        </GuestGate>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center pb-24 pt-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // No class yet — show create/join
  if (!myClass) {
    return (
      <div className="pb-24 pt-4 px-4">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-2xl font-bold mb-1">My Class</h1>
          <p className="text-sm text-muted-foreground mb-8">
            {isTeacher ? "Create a class to get started." : "Join a class with a code from your teacher."}
          </p>
        </motion.div>

        <div className="space-y-4">
          {isTeacher ? (
            <Dialog open={showCreateClass} onOpenChange={setShowCreateClass}>
              <DialogTrigger asChild>
                <Button size="lg" className="w-full gap-2 font-semibold">
                  <Plus className="h-4 w-4" /> Create a Class
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create a Class</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Class Name</Label>
                    <Input placeholder="e.g. Algebra 7-A" value={newClassName} onChange={e => setNewClassName(e.target.value)} />
                  </div>
                  <Button className="w-full" onClick={handleCreateClass} disabled={submitting || !newClassName.trim()}>
                    {submitting ? "Creating..." : "Create Class"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <Dialog open={showJoinClass} onOpenChange={setShowJoinClass}>
              <DialogTrigger asChild>
                <Button size="lg" className="w-full gap-2 font-semibold">
                  <LogIn className="h-4 w-4" /> Join a Class
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Join a Class</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Class Code</Label>
                    <Input placeholder="e.g. ABC-1234" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} />
                  </div>
                  <Button className="w-full" onClick={handleJoinClass} disabled={submitting || !joinCode.trim()}>
                    {submitting ? "Joining..." : "Join Class"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    );
  }

  // Has class — show full view
  return (
    <div className="pb-24 pt-4 px-4">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-2xl font-bold mb-1">{myClass.name}</h1>
        <div className="flex items-center gap-2 mb-6">
          <span className="text-sm text-muted-foreground">Code:</span>
          <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-sm font-bold text-primary">
            {myClass.class_code}
          </span>
          <button className="text-muted-foreground hover:text-foreground" onClick={handleCopyCode}>
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      </motion.div>

      {/* Progress Board */}
      <ProgressBoard classId={myClass.id} teacherId={myClass.teacher_id} />

      {/* Assignments */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-base font-bold flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" /> Assignments
          </h2>
          {isTeacher && (
            <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setShowCreateAssignment(true)}>
              <Plus className="h-3 w-3" /> New
            </Button>
          )}
        </div>

        {isTeacher && (
          <CreateAssignmentDialog
            open={showCreateAssignment}
            onOpenChange={setShowCreateAssignment}
            classId={myClass.id}
            teacherId={user!.id}
            onCreated={fetchClassData}
          />
        )}

        {assignments.length === 0 ? (
          <div className="rounded-xl border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">No assignments yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {assignments.map(a => {
              const mySubmission = mySubmissions[a.id];
              const subs = teacherSubmissions[a.id] || [];
              const isExpanded = expandedAssignment === a.id;
              const qCount = a.questions?.length || 0;

              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border bg-card p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{a.title}</p>
                      {a.description && <p className="text-xs text-muted-foreground mt-1">{a.description}</p>}
                      <div className="flex items-center gap-3 mt-1.5">
                        {a.due_date && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Due: {new Date(a.due_date).toLocaleDateString()}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">{qCount} question{qCount !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    {isTeacher && (
                      <button
                        onClick={() => handleDeleteAssignment(a.id)}
                        className="text-muted-foreground hover:text-destructive ml-2 shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Learner: answer or see score */}
                  {!isTeacher && (
                    <>
                      {mySubmission ? (
                        <div className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2">
                          <Check className="h-4 w-4 text-success" />
                          <span className="text-sm font-medium text-success">
                            Submitted — {mySubmission.score}/{qCount} correct
                          </span>
                        </div>
                      ) : qCount > 0 ? (
                        <Button
                          size="sm"
                          className="w-full gap-2"
                          onClick={() => setActiveAssignment(a)}
                        >
                          <ClipboardList className="h-4 w-4" /> Answer Assignment
                        </Button>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No questions added yet</p>
                      )}
                    </>
                  )}

                  {/* Teacher: view submissions */}
                  {isTeacher && (
                    <>
                      <button
                        onClick={() => setExpandedAssignment(isExpanded ? null : a.id)}
                        className="flex items-center gap-1 text-xs text-primary font-medium"
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
                            {subs.length === 0 ? (
                              <p className="text-xs text-muted-foreground py-2">No submissions yet</p>
                            ) : (
                              <div className="space-y-1.5 pt-1">
                                {subs.map(s => (
                                  <div key={s.user_id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                                    <span className="text-sm font-medium">{s.display_name}</span>
                                    <div className="text-right">
                                      <span className="text-sm font-bold">{s.score}/{qCount}</span>
                                      <p className="text-[10px] text-muted-foreground">{timeAgo(s.submitted_at)}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Assignment Answer Dialog */}
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

      {/* Activity Feed */}
      <div>
        <h2 className="font-display text-base font-bold mb-3">Activity Feed</h2>
        {feedItems.length === 0 ? (
          <div className="rounded-xl border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">No activity yet. Complete levels to see updates here!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {feedItems.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border bg-card p-4 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <p className="text-sm">
                    <span className="font-semibold">{item.profile?.display_name || "Unknown"}</span>{" "}
                    <span className="text-muted-foreground">{item.content || item.action_type}</span>
                  </p>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">{timeAgo(item.created_at)}</span>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleReact(item.id)}
                    className={`flex items-center gap-1 text-xs transition-colors ${
                      item.userReacted ? "text-destructive" : "text-muted-foreground hover:text-destructive"
                    }`}
                  >
                    <Heart className={`h-3.5 w-3.5 ${item.userReacted ? "fill-destructive" : ""}`} />
                    {item.reactions_count}
                  </button>
                  <button
                    onClick={() => {
                      if (expandedFeed === item.id) {
                        setExpandedFeed(null);
                      } else {
                        setExpandedFeed(item.id);
                        setCommentingOn(item.id);
                      }
                    }}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> {item.comments_count}
                  </button>
                </div>

                {/* Comments section */}
                <AnimatePresence>
                  {expandedFeed === item.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t pt-2 space-y-2">
                        {(item.comments || []).map(c => (
                          <div key={c.id} className="text-xs">
                            <span className="font-semibold">{c.display_name}</span>{" "}
                            <span className="text-muted-foreground">{c.content}</span>
                            <span className="text-muted-foreground/60 ml-1">{timeAgo(c.created_at)}</span>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <Input
                            placeholder="Write a comment..."
                            className="h-8 text-xs"
                            value={commentingOn === item.id ? commentText : ""}
                            onFocus={() => setCommentingOn(item.id)}
                            onChange={e => setCommentText(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === "Enter") handleComment(item.id);
                            }}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 shrink-0"
                            onClick={() => handleComment(item.id)}
                            disabled={!commentText.trim()}
                          >
                            <Send className="h-3.5 w-3.5" />
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
};

export default Class;
