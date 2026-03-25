import { useEffect, useState } from "react";
import { Sparkles, ArrowRight, Check, X, Lightbulb, BoxSelectIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";

interface Challenge {
  id: string;
  question_text: string;
  correct_answer: string;
  hint: string | null;
}

interface DailyChallengeProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const DailyChallenge = ({ open = true, onOpenChange }: DailyChallengeProps) => {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <BoxSelectIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Daily Challenge</DialogTitle>
              <DialogDescription className="text-xs">
                Test your knowledge!
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {!challenge ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No challenge today — check back tomorrow!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Question */}
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm leading-relaxed">{challenge.question_text}</p>
              </CardContent>
            </Card>

            {/* Result Display */}
            {result && (
              <Card className={result === "correct" ? "border-green-500" : "border-red-500"}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-2">
                    {result === "correct" ? (
                      <>
                        <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                            Correct! 🎉
                          </p>
                          <p className="text-xs text-muted-foreground">Great job!</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center">
                          <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                            Not quite
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Answer: {challenge.correct_answer}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Input Form */}
            {!result && (
              <div className="space-y-3">
                {showInput ? (
                  <>
                    <Input
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Type your answer..."
                      onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                      autoFocus
                    />
                    
                    {showHint && challenge.hint && (
                      <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
                        <CardContent className="py-3">
                          <div className="flex items-start gap-2">
                            <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                              {challenge.hint}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <div className="flex gap-2">
                      <Button 
                        onClick={handleSubmit} 
                        className="flex-1 gap-2"
                        disabled={!answer.trim()}
                      >
                        Submit
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                      {challenge.hint && (
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => setShowHint(!showHint)}
                        >
                          <Lightbulb className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <Button 
                    onClick={() => setShowInput(true)} 
                    className="w-full gap-2"
                  >
                    Start Challenge
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}

            {/* Close button after completion */}
            {result && (
              <Button 
                variant="outline" 
                onClick={() => onOpenChange?.(false)} 
                className="w-full"
              >
                Close
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DailyChallenge;