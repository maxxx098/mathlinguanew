import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, Check, X, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import GuestGate from "@/components/GuestGate";

interface Challenge {
  id: string;
  question_text: string;
  correct_answer: string;
  hint: string | null;
}

const DailyChallenge = () => {
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [answer, setAnswer] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("daily_challenges")
        .select("*")
        .eq("posted_date", today)
        .limit(1)
        .maybeSingle();

      if (data) {
        setChallenge(data);
        if (user) {
          const { data: comp } = await supabase
            .from("daily_challenge_completions")
            .select("is_correct")
            .eq("challenge_id", data.id)
            .eq("user_id", user.id)
            .maybeSingle();
          if (comp) {
            setAlreadyDone(true);
            setResult(comp.is_correct ? "correct" : "wrong");
          }
        }
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const handleSubmit = async () => {
    if (!challenge || !answer.trim()) return;
    const isCorrect = answer.trim().toLowerCase() === challenge.correct_answer.trim().toLowerCase();
    setResult(isCorrect ? "correct" : "wrong");

    if (user) {
      await supabase.from("daily_challenge_completions").insert({
        challenge_id: challenge.id,
        user_id: user.id,
        answer: answer.trim(),
        is_correct: isCorrect,
      });
    }
    setAlreadyDone(true);
  };

  if (loading) return null;
  if (!challenge) {
    return (
      <div className="rounded-2xl border bg-card p-4 text-center">
        <p className="text-sm text-muted-foreground">No challenge today — check back tomorrow!</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border bg-gradient-to-br from-warning/10 via-card to-warning/5 p-4 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning text-warning-foreground">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-2">
          <p className="font-display text-sm font-bold">Daily Challenge</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {challenge.question_text}
          </p>

          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
                  result === "correct"
                    ? "bg-success/10 text-success"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {result === "correct" ? (
                  <><Check className="h-4 w-4" /> Correct! 🎉</>
                ) : (
                  <><X className="h-4 w-4" /> Not quite. Answer: {challenge.correct_answer}</>
                )}
              </motion.div>
            ) : showInput ? (
              <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                <Input
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Your answer..."
                  className="h-8 text-xs"
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                />
                <div className="flex gap-2">
                  <Button size="sm" className="gap-1 text-xs flex-1" onClick={handleSubmit}>
                    Submit <ArrowRight className="h-3 w-3" />
                  </Button>
                  {challenge.hint && (
                    <Button size="sm" variant="ghost" className="text-xs" onClick={() => setShowHint(!showHint)}>
                      <Lightbulb className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                {showHint && challenge.hint && (
                  <p className="text-[11px] text-muted-foreground italic">💡 {challenge.hint}</p>
                )}
              </motion.div>
            ) : (
              <GuestGate>
                {(gate) => (
                  <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => { if (gate()) setShowInput(true); }}>
                    Try it <ArrowRight className="h-3 w-3" />
                  </Button>
                )}
              </GuestGate>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default DailyChallenge;
