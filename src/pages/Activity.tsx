import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, ArrowRight, RotateCcw, Trophy, Heart } from "lucide-react";
import { toast } from "sonner";
import { useLives } from "@/contexts/LivesContext";
import HeartsDisplay from "@/components/HeartsDisplay";

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: string[] | null;
  correct_answer: string;
  hint: string | null;
}

const PASS_THRESHOLD = 75;

const Activity = () => {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lives, loseLife } = useLives();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [levelTitle, setLevelTitle] = useState("");
  const [stageTitle, setStageTitle] = useState("");

  useEffect(() => {
    const fetchQuestions = async () => {
      if (!levelId) return;
      const { data: level } = await supabase
        .from("levels").select("title, stages(title)").eq("id", levelId).single();
      if (level) {
        setLevelTitle(level.title || "");
        setStageTitle((level as any).stages?.title || "");
      }
      const { data } = await supabase.from("questions").select("*").eq("level_id", levelId);
      if (data && data.length > 0) {
        const shuffled = [...data].sort(() => Math.random() - 0.5).slice(0, 12);
        setQuestions(shuffled.map(q => ({
          ...q,
          options: typeof q.options === "string" ? JSON.parse(q.options) : q.options as string[] | null,
        })));
      }
      setLoading(false);
    };
    fetchQuestions();
  }, [levelId]);

  const handleAnswer = async (answer: string) => {
    if (isAnswered) return;
    setSelectedAnswer(answer);
    setIsAnswered(true);
    const correct = answer === questions[currentIdx].correct_answer;
    setIsCorrect(correct);
    if (correct) {
      setScore(s => s + 1);
    } else {
      await loseLife();
      if (lives <= 1) toast.error("No lives left.");
    }
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(i => i + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setIsCorrect(false);
    } else {
      setFinished(true);
      saveProgress();
    }
  };

  const saveProgress = async () => {
    if (!user || !levelId) return;
    const passed = (score / questions.length) * 100 >= PASS_THRESHOLD;
    const { data: existing } = await supabase
      .from("user_progress").select("*").eq("user_id", user.id).eq("level_id", levelId).single();
    if (existing) {
      await supabase.from("user_progress").update({
        score, total_questions: questions.length, completed: passed,
        attempts: (existing.attempts || 0) + 1,
        completed_at: passed ? new Date().toISOString() : existing.completed_at,
      }).eq("id", existing.id);
    } else {
      await supabase.from("user_progress").insert({
        user_id: user.id, level_id: levelId, score,
        total_questions: questions.length, completed: passed,
        attempts: 1, completed_at: passed ? new Date().toISOString() : null,
      });
    }
  };

  const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
  const passed = pct >= PASS_THRESHOLD;

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-4 w-4 rounded-full border-2 border-foreground border-t-transparent animate-spin" />
      </div>
    );
  }

  // ── No lives ─────────────────────────────────────────────────────────────────
  if (lives <= 0 && !finished) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-8 gap-5 bg-background text-center">
        <Heart className="h-7 w-7 text-rose-400" strokeWidth={1.5} />
        <div className="space-y-1">
          <p className="font-semibold tracking-tight">No lives left</p>
          <p className="text-sm text-muted-foreground">Hearts refill every 30 minutes.</p>
        </div>
        <HeartsDisplay />
        <button onClick={() => navigate("/")}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors">
          Go back
        </button>
      </div>
    );
  }

  // ── No questions ─────────────────────────────────────────────────────────────
  if (questions.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <p className="text-sm text-muted-foreground">No questions for this level yet.</p>
        <button onClick={() => navigate("/")}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors">
          Go back
        </button>
      </div>
    );
  }

  // ── Finished ─────────────────────────────────────────────────────────────────
  if (finished) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-between px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 flex flex-col justify-center"
        >
          <div className="mb-2">
            <p className="text-[80px] font-bold tracking-tighter leading-none tabular-nums">
              {pct}
              <span className="text-[32px] font-normal text-muted-foreground">%</span>
            </p>
          </div>
          <p className="text-sm text-muted-foreground mb-10">
            {score} / {questions.length} correct
          </p>
          <div className="border-t border-border/60 pt-6 space-y-1 mb-10">
            <p className="font-semibold tracking-tight">
              {passed ? "Level complete." : "Not quite."}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {passed
                ? "You've unlocked the next level."
                : `You need ${PASS_THRESHOLD}% to pass. Try again with a new set.`}
            </p>
          </div>
        </motion.div>

        <div className="space-y-2">
          {!passed && (
            <button
              onClick={() => window.location.reload()}
              className="w-full h-11 rounded-xl bg-foreground text-background text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity active:scale-[0.99]"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
              Try again
            </button>
          )}
          {passed && (
            <button
              onClick={() => navigate("/")}
              className="w-full h-11 rounded-xl bg-foreground text-background text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity active:scale-[0.99]"
            >
              <Trophy className="h-3.5 w-3.5" strokeWidth={2} />
              Continue
            </button>
          )}
          <button
            onClick={() => navigate("/")}
            className="w-full h-11 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            Back to path
          </button>
        </div>
      </div>
    );
  }

  // ── Quiz ─────────────────────────────────────────────────────────────────────
  const currentQ = questions[currentIdx];
  const labels = ["A", "B", "C", "D"];

  return (
    <div className="flex min-h-screen flex-col bg-background w-full max-w-lg mx-auto">

      {/* Top nav — back button + hearts only, no progress dots here */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <button
          onClick={() => navigate("/")}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <HeartsDisplay />
      </div>

      {/* Stage / level label */}
      <p className="px-5 text-[11px] font-medium tracking-widest uppercase text-muted-foreground">
        {[stageTitle, levelTitle].filter(Boolean).join(" · ")}
      </p>

      {/* Main content */}
      <div className="flex-1 flex flex-col px-5 pt-8 pb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -18 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-8"
          >
            {/* Question */}
            <h2 className="text-[21px] font-semibold leading-snug tracking-tight">
              {currentQ.question_text}
            </h2>

            {/* Options */}
            <div className="space-y-2.5">
              {(currentQ.options || []).map((option, idx) => {
                const isThisCorrect = option === currentQ.correct_answer;
                const isThisSelected = option === selectedAnswer;

                return (
                  <motion.button
                    key={idx}
                    onClick={() => handleAnswer(option)}
                    disabled={isAnswered}
                    whileTap={!isAnswered ? { scale: 0.985 } : {}}
                    className={`
                      w-full text-left px-4 py-3.5 rounded-xl border text-sm
                      flex items-center gap-3 transition-all duration-150 outline-none
                      ${!isAnswered
                        ? "border-border bg-transparent hover:bg-muted/40 hover:border-foreground/25 cursor-pointer"
                        : isThisCorrect
                        ? "border-emerald-500/50 bg-emerald-500/6"
                        : isThisSelected
                        ? "border-rose-500/50 bg-rose-500/6"
                        : "border-border/30 opacity-25 cursor-default"
                      }
                    `}
                  >
                    <span className={`
                      w-[26px] h-[26px] rounded-lg text-[11px] font-bold flex items-center
                      justify-center shrink-0 transition-colors
                      ${isAnswered && isThisCorrect
                        ? "bg-emerald-500 text-white"
                        : isAnswered && isThisSelected
                        ? "bg-rose-500 text-white"
                        : "bg-muted text-muted-foreground"
                      }
                    `}>
                      {labels[idx]}
                    </span>
                    <span className={`flex-1 leading-snug ${
                      isAnswered && isThisCorrect ? "text-emerald-600 dark:text-emerald-400 font-medium" :
                      isAnswered && isThisSelected ? "text-rose-600 dark:text-rose-400" : ""
                    }`}>
                      {option}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Progress dots — sits right below the answers */}
        <div className="flex items-center justify-center gap-[5px] mt-6">
          {questions.map((_, i) => {
            const done = i < currentIdx + (isAnswered ? 1 : 0);
            const active = i === currentIdx && !isAnswered;
            return (
              <div
                key={i}
                className={`h-[3px] rounded-full transition-all duration-300 ${
                  done   ? "w-5 bg-foreground" :
                  active ? "w-5 bg-foreground/25" :
                           "w-[6px] bg-border"
                }`}
              />
            );
          })}
        </div>

        {/* Feedback + continue — pinned to bottom */}
        <AnimatePresence>
          {isAnswered && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="mt-auto pt-8 space-y-3"
            >
              {!isCorrect && currentQ.hint && (
                <div className="border-l-2 border-border pl-3">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1 font-medium">Hint</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{currentQ.hint}</p>
                </div>
              )}
              {!isCorrect && (
                <p className="text-xs text-muted-foreground">
                  Correct: <span className="text-foreground font-medium">{currentQ.correct_answer}</span>
                </p>
              )}
              <button
                onClick={handleNext}
                className="w-full h-11 rounded-xl bg-foreground text-background text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity active:scale-[0.99]"
              >
                {currentIdx < questions.length - 1
                  ? <><ArrowRight className="h-3.5 w-3.5" strokeWidth={2} /> Continue</>
                  : <><Trophy className="h-3.5 w-3.5" strokeWidth={2} /> See results</>
                }
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Activity;