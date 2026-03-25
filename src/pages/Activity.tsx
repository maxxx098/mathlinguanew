import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Check, X, Lightbulb, ArrowRight, RotateCcw, Trophy, Heart } from "lucide-react";
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

const Activity = () => {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  const { user, isGuest } = useAuth();
  const { lives, loseLife } = useLives();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [levelTitle, setLevelTitle] = useState("");
  const [stageTitle, setStageTitle] = useState("");

  useEffect(() => {
    const fetchQuestions = async () => {
      if (!levelId) return;

      // Get level info
      const { data: level } = await supabase
        .from("levels")
        .select("title, stages(title)")
        .eq("id", levelId)
        .single();

      if (level) {
        setLevelTitle(level.title || "");
        setStageTitle((level as any).stages?.title || "");
      }

      // Get questions
      const { data } = await supabase
        .from("questions")
        .select("*")
        .eq("level_id", levelId);

      if (data && data.length > 0) {
        // Shuffle questions
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
      if (lives <= 1) {
        // Will be 0 after loseLife
        toast.error("You're out of lives! Wait for them to refill.");
      }
    }
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(i => i + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setIsCorrect(false);
      setShowHint(false);
    } else {
      setFinished(true);
      saveProgress();
    }
  };

  const saveProgress = async () => {
    if (!user || !levelId) return;
    const finalScore = score + (isCorrect ? 0 : 0); // score already updated

    const { data: existing } = await supabase
      .from("user_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("level_id", levelId)
      .single();

    const passed = (score / questions.length) * 100 >= 75;

    if (existing) {
      await supabase.from("user_progress").update({
        score,
        total_questions: questions.length,
        completed: passed,
        attempts: (existing.attempts || 0) + 1,
        completed_at: passed ? new Date().toISOString() : existing.completed_at,
      }).eq("id", existing.id);
    } else {
      await supabase.from("user_progress").insert({
        user_id: user.id,
        level_id: levelId,
        score,
        total_questions: questions.length,
        completed: passed,
        attempts: 1,
        completed_at: passed ? new Date().toISOString() : null,
      });
    }
  };

  const progressPercent = questions.length > 0 ? ((currentIdx + (isAnswered ? 1 : 0)) / questions.length) * 100 : 0;
  const passed = questions.length > 0 && (score / questions.length) * 100 >= 75;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (lives <= 0 && !finished) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 gap-4">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <Heart className="h-10 w-10 text-destructive" />
        </div>
        <h2 className="font-display text-xl font-bold">No Lives Left!</h2>
        <p className="text-sm text-muted-foreground text-center">Your hearts refill over time. Come back in 30 minutes or try again later.</p>
        <HeartsDisplay />
        <Button onClick={() => navigate("/")} variant="outline">Back to Home</Button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <p className="text-muted-foreground">No questions available for this level yet.</p>
        <Button onClick={() => navigate("/")} variant="outline">Back to Home</Button>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm space-y-6 text-center">
          <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${passed ? "bg-success/10" : "bg-warning/10"}`}>
            {passed ? <Trophy className="h-10 w-10 text-success" /> : <RotateCcw className="h-10 w-10 text-warning" />}
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold">{passed ? "Level Complete! 🎉" : "Keep Practicing! 💪"}</h2>
            <p className="text-muted-foreground mt-1">
              You got {score} out of {questions.length} correct ({Math.round((score / questions.length) * 100)}%)
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {passed ? "Great job! You've unlocked the next level." : "You need 75% (9/12) to pass. Try again with new questions!"}
            </p>
          </div>
          <div className="space-y-3">
            {!passed && (
              <Button className="w-full gap-2" onClick={() => window.location.reload()}>
                <RotateCcw className="h-4 w-4" /> Try Again
              </Button>
            )}
            <Button variant={passed ? "default" : "outline"} className="w-full" onClick={() => navigate("/")}>
              Back to Learning Path
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const currentQ = questions[currentIdx];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top Bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">{stageTitle}</p>
            <p className="font-display text-sm font-bold">{levelTitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <HeartsDisplay />
            <span className="font-display text-sm font-bold text-primary">
              {currentIdx + 1}/{questions.length}
            </span>
          </div>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Question Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -30, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-md space-y-6"
          >
            <p className="font-display text-lg font-bold text-center leading-relaxed">
              {currentQ.question_text}
            </p>

            {/* Options */}
            <div className="space-y-3">
              {(currentQ.options || []).map((option, idx) => {
                let optionClass = "border bg-card hover:border-primary";
                if (isAnswered) {
                  if (option === currentQ.correct_answer) {
                    optionClass = "border-2 border-success bg-success/5";
                  } else if (option === selectedAnswer && !isCorrect) {
                    optionClass = "border-2 border-warning bg-warning/5";
                  } else {
                    optionClass = "border bg-card opacity-50";
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(option)}
                    disabled={isAnswered}
                    className={`w-full rounded-xl p-4 text-left font-mono text-base transition-all ${optionClass}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold font-display">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span>{option}</span>
                      {isAnswered && option === currentQ.correct_answer && <Check className="ml-auto h-5 w-5 text-success" />}
                      {isAnswered && option === selectedAnswer && !isCorrect && option !== currentQ.correct_answer && <X className="ml-auto h-5 w-5 text-warning" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Feedback Area */}
      <AnimatePresence>
        {isAnswered && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`border-t p-4 ${isCorrect ? "bg-success/5" : "bg-warning/5"}`}
          >
            <div className="mx-auto max-w-md space-y-3">
              <div className="flex items-center gap-2">
                {isCorrect ? (
                  <><Check className="h-5 w-5 text-success" /><span className="font-display font-bold text-success">Correct!</span></>
                ) : (
                  <><Lightbulb className="h-5 w-5 text-warning" /><span className="font-display font-bold text-warning">Not quite!</span></>
                )}
              </div>
              {!isCorrect && currentQ.hint && (
                <p className="text-sm text-muted-foreground">{currentQ.hint}</p>
              )}
              <Button onClick={handleNext} className="w-full gap-2">
                {currentIdx < questions.length - 1 ? (
                  <>Continue <ArrowRight className="h-4 w-4" /></>
                ) : (
                  <>See Results <Trophy className="h-4 w-4" /></>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Activity;
