import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
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

// ── SVG Icons ────────────────────────────────────────────────────
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <polyline
      points="3,8 6.5,12 13,4"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LockIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 14 18" fill="none">
    <rect x="1.5" y="7.5" width="11" height="9" rx="2" stroke="currentColor" strokeWidth="1.4" />
    <path
      d="M4.5 7.5V5a2.5 2.5 0 0 1 5 0v2.5"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
);

const StarIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <polygon
      points="8,1.5 9.9,6 14.8,6.4 11.2,9.5 12.4,14.3 8,11.7 3.6,14.3 4.8,9.5 1.2,6.4 6.1,6"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  </svg>
);

const BookIcon = ({
  size = 14,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    style={{ color }}
  >
    <path
      d="M3 2h8a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"
      stroke="currentColor"
      strokeWidth="1.3"
    />
    <path d="M5 5.5h6M5 8h6M5 10.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

// ── Helpers ──────────────────────────────────────────────────────
const doneCount = (stage: Stage) =>
  stage.levels.filter((l) => l.status === "completed").length;

const pct = (stage: Stage) =>
  stage.levels.length
    ? Math.round((doneCount(stage) / stage.levels.length) * 100)
    : 0;

// ── Component ────────────────────────────────────────────────────
const LearningPath = () => {
  const { user, isGuest } = useAuth();
  const navigate = useNavigate();
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const { checkAuth, gateOpen, setGateOpen } = useGuestGate();

  useEffect(() => {
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
    };
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

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
    if (!checkAuth()) return;
    setSelectedLevel(level);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <style>{`
        /* ── Stage ───────────────────────────────────── */
        .lp-stage { margin-bottom: 2rem; }

        .lp-stage-head {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-bottom: 10px;
          cursor: pointer;
          user-select: none;
        }
        .lp-stage-eyebrow {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .1em;
          text-transform: uppercase;
          color: hsl(var(--muted-foreground));
          flex-shrink: 0;
        }
        .lp-stage-name {
          font-size: 14px;
          font-weight: 700;
          font-family: var(--font-display, 'Montserrat', sans-serif);
          color: hsl(var(--foreground));
          flex: 1;
          transition: color .15s;
        }
        .lp-stage-head:hover .lp-stage-name {
          color: hsl(var(--primary));
        }
        .lp-stage-fraction {
          font-size: 11px;
          font-weight: 500;
          color: hsl(var(--muted-foreground));
        }

        /* hairline progress rule */
        .lp-rule {
          height: 1.5px;
          background: hsl(var(--border));
          border-radius: 99px;
          margin-bottom: 12px;
          overflow: hidden;
          position: relative;
        }
        .lp-rule-fill {
          position: absolute;
          inset: 0 auto 0 0;
          background: hsl(var(--primary));
          border-radius: 99px;
          transition: width .5s ease;
        }

        /* ── Level grid ──────────────────────────────── */
        .lp-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }

        .lp-tile {
          height: 64px;
          border-radius: var(--radius, 0.75rem);
          border: 1px solid hsl(var(--border));
          background: hsl(var(--card));
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          cursor: pointer;
          transition: transform .12s ease, border-color .12s ease;
          color: hsl(var(--muted-foreground));
        }
        .lp-tile:active:not(.lp-tile--locked) { transform: scale(.97); }
        .lp-tile:hover:not(.lp-tile--locked):not(.lp-tile--current) {
          border-color: hsl(var(--primary) / .5);
          color: hsl(var(--foreground));
        }

        /* done */
        .lp-tile--done {
          color: hsl(var(--success));
          border-color: hsl(var(--success) / .4);
          background: hsl(var(--card));
        }

        /* current */
        .lp-tile--current {
          background: hsl(var(--primary));
          border-color: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
          box-shadow: 0 2px 12px hsl(var(--primary) / .3);
        }

        /* locked */
        .lp-tile--locked {
          opacity: .38;
          cursor: not-allowed;
        }
        .lp-tile--review.lp-tile--locked {
          border-style: dashed;
        }

        .lp-tile-num {
          font-family: var(--font-display, 'Montserrat', sans-serif);
          font-size: 15px;
          font-weight: 800;
          line-height: 1;
        }
        .lp-tile-sub {
          font-size: 9px;
          font-weight: 600;
          letter-spacing: .07em;
          text-transform: uppercase;
          opacity: .8;
        }

        /* dot for current (alternative: just number) */
        .lp-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }

        /* ── Bottom sheet ─────────────────────────────── */
        .lp-overlay {
          display: none;
          position: fixed;
          inset: 0;
          
          z-index: 50;
          align-items: center;
        }
        .lp-overlay.lp-open { display: flex; }

        .lp-sheet {
          background: hsl(var(--card));
          border-radius: calc(var(--radius, 0.75rem) * 2) ;
          width: 100%;
          padding: 0 1.25rem 2rem;
          max-height: 86vh;
          overflow-y: auto;
        }
        .lp-sheet-handle {
          width: 36px;
          height: 3px;
          background: hsl(var(--border));
          border-radius: 99px;
          margin: 10px auto 1.25rem;
        }
        .lp-sh-eyebrow {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .1em;
          text-transform: uppercase;
          color: hsl(var(--primary));
          margin-bottom: 4px;
        }
        .lp-sh-title {
          font-family: var(--font-display, 'Montserrat', sans-serif);
          font-size: 18px;
          font-weight: 800;
          color: hsl(var(--foreground));
          margin-bottom: 1rem;
          line-height: 1.2;
        }
        .lp-sh-prog-row {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: hsl(var(--muted-foreground));
          margin-bottom: 5px;
        }
        .lp-sh-prog-bar {
          height: 3px;
          background: hsl(var(--border));
          border-radius: 99px;
          overflow: hidden;
          margin-bottom: 1.25rem;
        }
        .lp-sh-prog-fill {
          height: 100%;
          background: hsl(var(--primary));
          border-radius: 99px;
          transition: width .4s ease;
        }
        .lp-sh-desc {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          background: hsl(var(--muted));
          border-radius: var(--radius, 0.75rem);
          padding: 12px;
          margin-bottom: 1.25rem;
          font-size: 13px;
          color: hsl(var(--muted-foreground));
          line-height: 1.65;
        }
        .lp-sh-desc-icon {
          flex-shrink: 0;
          margin-top: 1px;
        }
        .lp-sh-levels-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .1em;
          text-transform: uppercase;
          color: hsl(var(--muted-foreground));
          margin-bottom: 4px;
        }
        .lp-sh-lvl-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 0;
          border-bottom: 1px solid hsl(var(--border));
        }
        .lp-sh-lvl-row:last-child { border-bottom: none; }
        .lp-sh-idx {
          width: 20px;
          font-size: 11px;
          font-weight: 700;
          font-family: var(--font-display, 'Montserrat', sans-serif);
          color: hsl(var(--muted-foreground));
          flex-shrink: 0;
        }
        .lp-sh-lname {
          flex: 1;
          font-size: 13px;
          color: hsl(var(--foreground));
        }
        .lp-sh-row--done .lp-sh-lname { color: hsl(var(--muted-foreground)); }
        .lp-sh-row--locked .lp-sh-lname { color: hsl(var(--muted-foreground) / .5); }
        .lp-sh-badge {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .lp-sh-badge--done {
          background: hsl(var(--success));
          color: hsl(var(--success-foreground));
        }
        .lp-sh-badge--cur {
          border: 1.5px solid hsl(var(--primary));
        }
        .lp-sh-badge--lock {
          color: hsl(var(--muted-foreground));
          opacity: .4;
        }
        .lp-review-pill {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .07em;
          text-transform: uppercase;
          color: hsl(var(--muted-foreground));
          margin-left: 5px;
        }
        .lp-sh-close {
          margin-top: 1.25rem;
          width: 100%;
          padding: 13px;
          border: 1px solid hsl(var(--border));
          border-radius: var(--radius, 0.75rem);
          background: transparent;
          font-family: var(--font-display, 'Montserrat', sans-serif);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: .02em;
          color: hsl(var(--foreground));
          cursor: pointer;
          transition: background .15s;
        }
        .lp-sh-close:hover { background: hsl(var(--muted)); }

        /* ── Warning dialog ───────────────────────────── */
        .lp-warn-ov {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,.45);
          z-index: 60;
          align-items: center;
          justify-content: center;
          padding: 1.25rem;
        }
        .lp-warn-ov.lp-open { display: flex; }
        .lp-warn-card {
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: calc(var(--radius, 0.75rem) * 1.5);
          padding: 1.5rem;
          width: 100%;
          max-width: 320px;
        }
        .lp-warn-eyebrow {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .1em;
          text-transform: uppercase;
          color: hsl(var(--muted-foreground));
          margin-bottom: 5px;
        }
        .lp-warn-title {
          font-family: var(--font-display, 'Montserrat', sans-serif);
          font-size: 16px;
          font-weight: 800;
          color: hsl(var(--foreground));
          margin-bottom: 8px;
        }
        .lp-warn-body {
          font-size: 13px;
          color: hsl(var(--muted-foreground));
          line-height: 1.65;
          margin-bottom: 1rem;
        }
        .lp-warn-lvl {
          font-family: var(--font-display, 'Montserrat', sans-serif);
          font-size: 13px;
          font-weight: 700;
          color: hsl(var(--primary));
          margin-bottom: 1.25rem;
        }
        .lp-warn-btns { display: flex; gap: 8px; }
        .lp-warn-btn {
          flex: 1;
          padding: 12px;
          border-radius: var(--radius, 0.75rem);
          font-family: var(--font-display, 'Montserrat', sans-serif);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: .02em;
          cursor: pointer;
          border: none;
          transition: opacity .15s, transform .1s;
        }
        .lp-warn-btn:hover { opacity: .85; }
        .lp-warn-btn:active { transform: scale(.97); }
        .lp-warn-btn--cancel {
          background: hsl(var(--muted));
          color: hsl(var(--foreground));
        }
        .lp-warn-btn--go {
          background: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }
      .lp-sh-guide-btn {
        margin-top: .75rem;
        width: 100%;
        padding: 13px;
        border: none;
        border-radius: var(--radius, 0.75rem);
        background: hsl(var(--primary));
        font-family: var(--font-display, 'Montserrat', sans-serif);
        font-size: 13px;
        font-weight: 700;
        letter-spacing: .02em;
        color: hsl(var(--primary-foreground));
        cursor: pointer;
        transition: opacity .15s;
      }
      .lp-sh-guide-btn:hover { opacity: .85; }
      `}</style>

      {/* ── Learning path ───────────────────────────────────── */}
      <div>
        {stages.map((stage) => {
          const done = doneCount(stage);
          const progress = pct(stage);

          return (
            <div key={stage.id} className="lp-stage">
              {/* Stage header */}
              <div
                className="lp-stage-head"
                onClick={() => setSelectedStage(stage)}
              >
                <span className="lp-stage-eyebrow">Stage {stage.order_index}</span>
                <span className="lp-stage-name">{stage.title}</span>
                <span className="lp-stage-fraction">
                  {done}/{stage.levels.length}
                </span>
              </div>

              {/* Progress rule */}
              <div className="lp-rule">
                <div className="lp-rule-fill" style={{ width: `${progress}%` }} />
              </div>

              {/* Level tiles */}
              <div className="lp-grid">
                {stage.levels.map((level) => {
                  const isDone = level.status === "completed";
                  const isCur = level.status === "current";
                  const isLocked = level.status === "locked";

                  let cls = "lp-tile";
                  if (isDone) cls += " lp-tile--done";
                  else if (isCur) cls += " lp-tile--current";
                  else cls += " lp-tile--locked";
                  if (level.is_review) cls += " lp-tile--review";

                  return (
                    <div
                      key={level.id}
                      className={cls}
                      onClick={() => !isLocked && handleLevelClick(level)}
                    >
                      {isDone ? (
                        <CheckIcon />
                      ) : isCur ? (
                        <>
                          <span className="lp-tile-num">{level.order_index}</span>
                          <span className="lp-tile-sub">Start</span>
                        </>
                      ) : level.is_review ? (
                        <StarIcon size={14} />
                      ) : (
                        <LockIcon size={14} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Stage detail sheet ──────────────────────────────── */}
      <div
        className={`lp-overlay relative max-w-screen-sm rounded-md flex mx-auto${selectedStage ? " lp-open" : ""}`}
        onClick={(e) => e.target === e.currentTarget && setSelectedStage(null)}
      >
        <div className="lp-sheet">
          <div className="lp-sheet-handle" />
          {selectedStage && (
            <>
              <div className="lp-sh-eyebrow">Stage {selectedStage.order_index}</div>
              <div className="lp-sh-title">{selectedStage.title}</div>

              <div className="lp-sh-prog-row">
                <span>Progress</span>
                <span>
                  {doneCount(selectedStage)}/{selectedStage.levels.length} levels
                </span>
              </div>
              <div className="lp-sh-prog-bar">
                <div
                  className="lp-sh-prog-fill"
                  style={{ width: `${pct(selectedStage)}%` }}
                />
              </div>

              <div className="lp-sh-desc">
                <span className="lp-sh-desc-icon">
                  <BookIcon />
                </span>
                <span>
                  {selectedStage.description ??
                    "No description available for this stage yet."}
                </span>
              </div>

              <div className="lp-sh-levels-label">Levels</div>
              <div>
                {selectedStage.levels.map((level) => {
                  const isDone = level.status === "completed";
                  const isCur = level.status === "current";
                  const isLocked = level.status === "locked";

                  let rowCls = "lp-sh-lvl-row";
                  if (isDone) rowCls += " lp-sh-row--done";
                  else if (isLocked) rowCls += " lp-sh-row--locked";

                  return (
                    <div key={level.id} className={rowCls}>
                      <span className="lp-sh-idx">{level.order_index}</span>
                      <span className="lp-sh-lname">
                        {level.title}
                        {level.is_review && (
                          <span className="lp-review-pill">Review</span>
                        )}
                      </span>
                      <div
                        className={`lp-sh-badge${
                          isDone
                            ? " lp-sh-badge--done"
                            : isCur
                            ? " lp-sh-badge--cur"
                            : " lp-sh-badge--lock"
                        }`}
                      >
                        {isDone ? (
                          <CheckIcon />
                        ) : isCur ? null : (
                          <LockIcon size={10} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

          <button
            className="lp-sh-guide-btn flex items-center justify-center gap-2"
            onClick={() => {
              setSelectedStage(null);
              navigate(`/guide/${selectedStage.id}`);
            }}
          >
            <BookIcon />  View Stage Guide
          </button>
          <button
            className="lp-sh-close"
            onClick={() => setSelectedStage(null)}
          >
            Close
          </button>
            </>
          )}
        </div>
      </div>

      {/* ── Warning dialog ──────────────────────────────────── */}
      <div
        className={`lp-warn-ov${selectedLevel ? " lp-open" : ""}`}
        onClick={(e) => e.target === e.currentTarget && setSelectedLevel(null)}
      >
        <div className="lp-warn-card">
          <div className="lp-warn-eyebrow">Heads up</div>
          <div className="lp-warn-title">Ready to begin?</div>
          <div className="lp-warn-body">
            Once you enter this level, you cannot go back. Make sure you're
            prepared before starting.
          </div>
          {selectedLevel && (
            <div className="lp-warn-lvl">{selectedLevel.title}</div>
          )}
          <div className="lp-warn-btns">
            <button
              className="lp-warn-btn lp-warn-btn--cancel"
              onClick={() => setSelectedLevel(null)}
            >
              Cancel
            </button>
            <button
              className="lp-warn-btn lp-warn-btn--go"
              onClick={() => {
                if (selectedLevel) navigate(`/activity/${selectedLevel.id}`);
              }}
            >
              Continue
            </button>
          </div>
        </div>
      </div>

      {/* ── Guest gate ──────────────────────────────────────── */}
      <GuestGateDialog open={gateOpen} onOpenChange={setGateOpen} />
    </>
  );
};

export default LearningPath;