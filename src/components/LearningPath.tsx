import { useEffect, useState } from "react";
import { Lock, Check, Star, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { useGuestGate, GuestGateDialog } from "@/components/GuestGate";

interface Level {
  id: string;
  title: string;
  order_index: number;
  is_review: boolean;
  status: "completed" | "current" | "locked";
}

interface Stage {
  id: string;
  title: string;
  emoji: string;
  order_index: number;
  description: string | null;
  levels: Level[];
}

const LearningPath = () => {
  const { user, isGuest } = useAuth();
  const navigate = useNavigate();
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);

  // Guest gate hook
  const { checkAuth, gateOpen, setGateOpen } = useGuestGate();

  useEffect(() => {
    const fetchPath = async () => {
      const { data: stagesData } = await supabase
        .from("stages")
        .select("*")
        .order("order_index");

      const { data: levelsData } = await supabase
        .from("levels")
        .select("*")
        .order("order_index");

      let progressMap: Record<string, boolean> = {};
      if (user) {
        const { data: progressData } = await supabase
          .from("user_progress")
          .select("level_id, completed")
          .eq("user_id", user.id);

        if (progressData) {
          progressData.forEach((p) => {
            if (p.completed) progressMap[p.level_id] = true;
          });
        }
      }

      if (stagesData && levelsData) {
        let foundCurrent = false;
        const builtStages: Stage[] = stagesData.map((s) => {
          const stageLevels = levelsData
            .filter((l) => l.stage_id === s.id)
            .map((l) => {
              let status: "completed" | "current" | "locked" = "locked";
              if (progressMap[l.id]) {
                status = "completed";
              } else if (!foundCurrent) {
                status = "current";
                foundCurrent = true;
              }
              return { ...l, status, is_review: l.is_review || false };
            });
          return {
            ...s,
            emoji: s.emoji || "📘",
            description: s.description ?? null,
            levels: stageLevels,
          };
        });

        // For guests, unlock first 2 levels
        if (isGuest && !user) {
          let unlocked = 0;
          builtStages.forEach((s) => {
            s.levels.forEach((l) => {
              if (unlocked < 2 && l.status !== "completed") {
                if (unlocked === 0) l.status = "current";
                unlocked++;
              }
            });
          });
        }

        setStages(builtStages);
      }
      setLoading(false);
    };

    fetchPath();
  }, [user, isGuest]);

  const handleLevelClick = (level: Level) => {
    if (level.status === "locked") return;
    // Guest gate check — shows "Oops, you need to log in" dialog if guest
    if (!checkAuth()) return;
    navigate(`/activity/${level.id}`);
  };

  const handleStageClick = (stage: Stage) => {
    setSelectedStage(stage);
  };

  const completedCount = (stage: Stage) =>
    stage.levels.filter((l) => l.status === "completed").length;

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {stages.map((stage) => (
          <div key={stage.id}>
            {/* Stage Header — clickable */}
            <Card
              className="mb-3 cursor-pointer hover:bg-muted/50 transition-colors active:scale-[0.99]"
              onClick={() => handleStageClick(stage)}
            >
              <div className="flex items-center gap-3 p-3">
                <div className="flex-1">
                  <Badge variant="secondary" className="text-[10px] mb-1">
                    Stage {stage.order_index}
                  </Badge>
                  <h3 className="font-semibold text-sm">{stage.title}</h3>
                </div>
                {/* Progress pill */}
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {completedCount(stage)}/{stage.levels.length}
                </Badge>
              </div>
            </Card>

            {/* Levels Grid */}
            <div className="grid grid-cols-4 gap-2 px-2">
              {stage.levels.map((level) => {
                const isCompleted = level.status === "completed";
                const isCurrent = level.status === "current";
                const isLocked = level.status === "locked";

                return (
                  <Button
                    key={level.id}
                    variant={
                      isCompleted ? "default" : isCurrent ? "outline" : "ghost"
                    }
                    size="lg"
                    disabled={isLocked}
                    onClick={() => handleLevelClick(level)}
                    className={`
                      h-14 w-full flex flex-col items-center justify-center gap-1
                      ${isCurrent ? "border-2 border-primary" : ""}
                      ${isLocked ? "opacity-50" : ""}
                    `}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : isLocked ? (
                      level.is_review ? (
                        <Star className="h-5 w-5" />
                      ) : (
                        <Lock className="h-4 w-4" />
                      )
                    ) : (
                      <span className="text-lg font-bold">
                        {level.order_index}
                      </span>
                    )}
                    {isCurrent && (
                      <span className="text-[10px] font-medium">Start</span>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Stage Detail Modal */}
      <Dialog
        open={!!selectedStage}
        onOpenChange={(open) => !open && setSelectedStage(null)}
      >
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div>
                <Badge variant="secondary" className="text-[10px] mb-1">
                  Stage {selectedStage?.order_index}
                </Badge>
                <DialogTitle className="text-base leading-tight">
                  {selectedStage?.title}
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>

          {/* Progress bar */}
          {selectedStage && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>
                  {completedCount(selectedStage)}/{selectedStage.levels.length} levels
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{
                    width: `${
                      selectedStage.levels.length > 0
                        ? (completedCount(selectedStage) /
                            selectedStage.levels.length) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Description */}
          <div className="flex gap-2 mt-1">
            <BookOpen className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              {selectedStage?.description ?? "No description available for this stage yet."}
            </p>
          </div>

          {/* Level list */}
          <div className="space-y-1 mt-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Levels
            </p>
            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
              {selectedStage?.levels.map((level) => (
                <div
                  key={level.id}
                  className="flex items-center gap-2 text-sm py-1"
                >
                  {level.status === "completed" ? (
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  ) : level.status === "current" ? (
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-primary shrink-0" />
                  ) : (
                    <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                  )}
                  <span
                    className={
                      level.status === "locked"
                        ? "text-muted-foreground"
                        : "text-foreground"
                    }
                  >
                    {level.title}
                  </span>
                  {level.is_review && (
                    <Star className="h-3 w-3 text-yellow-500 ml-auto shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <DialogClose asChild>
            <Button variant="outline" className="w-full mt-2">
              Close
            </Button>
          </DialogClose>
        </DialogContent>
      </Dialog>

      {/* Guest gate dialog — "Oops, you need to log in!" */}
      <GuestGateDialog open={gateOpen} onOpenChange={setGateOpen} />
    </>
  );
};

export default LearningPath;