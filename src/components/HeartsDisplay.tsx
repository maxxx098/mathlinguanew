import { Heart } from "lucide-react";
import { useLives } from "@/contexts/LivesContext";

interface HeartsDisplayProps {
  className?: string;
  showTimer?: boolean;
}

const formatTime = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const HeartsDisplay = ({ className = "", showTimer = false }: HeartsDisplayProps) => {
  const { lives, maxLives, nextRefillSeconds } = useLives();

  return (
    <div className={`flex flex-col items-start gap-1 ${className}`}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: maxLives }).map((_, i) => (
          <Heart
            key={i}
            className={`h-5 w-5 transition-all ${
              i < lives
                ? "fill-destructive text-destructive"
                : "text-muted-foreground/30"
            }`}
          />
        ))}
      </div>
      {showTimer && nextRefillSeconds !== null && (
        <p className="text-xs font-medium text-muted-foreground">
          Next heart in {formatTime(nextRefillSeconds)}
        </p>
      )}
    </div>
  );
};

export default HeartsDisplay;
