import { useEffect, useState } from "react";
import { Lock, Check, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  levels: Level[];
}

const LearningPath = () => {
  const { user, isGuest } = useAuth();
  const navigate = useNavigate();
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);

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
          progressData.forEach(p => {
            if (p.completed) progressMap[p.level_id] = true;
          });
        }
      }

      if (stagesData && levelsData) {
        let foundCurrent = false;
        const builtStages: Stage[] = stagesData.map(s => {
          const stageLevels = levelsData
            .filter(l => l.stage_id === s.id)
            .map(l => {
              let status: "completed" | "current" | "locked" = "locked";
              if (progressMap[l.id]) {
                status = "completed";
              } else if (!foundCurrent) {
                status = "current";
                foundCurrent = true;
              }
              return { ...l, status, is_review: l.is_review || false };
            });
          return { ...s, emoji: s.emoji || "📘", levels: stageLevels };
        });

        // For guests, unlock first 2 levels
        if (isGuest && !user) {
          let unlocked = 0;
          builtStages.forEach(s => {
            s.levels.forEach(l => {
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
    navigate(`/activity/${level.id}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {stages.map((stage) => (
        <div key={stage.id}>
          {/* Stage Header */}
          <Card className="mb-3">
            <div className="flex items-center gap-3 p-3">
              <div className="text-2xl"></div>
              <div className="flex-1">
                <Badge variant="secondary" className="text-[10px] mb-1">
                  Stage {stage.order_index}
                </Badge>
                <h3 className="font-semibold text-sm">{stage.title}</h3>
              </div>
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
                  variant={isCompleted ? "default" : isCurrent ? "outline" : "ghost"}
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
                    <span className="text-lg font-bold">{level.order_index}</span>
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
  );
};

export default LearningPath;