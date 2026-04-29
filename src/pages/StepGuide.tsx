import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// ── Types ────────────────────────────────────────────────────────
interface GuideSubsection {
  heading?: string;
  body: string;
  examples?: string[];
}

interface GuideSection {
  title: string;
  intro?: string;
  subsections?: GuideSubsection[];
  table?: { columns: string[]; rows: string[][] };
  bullets?: string[];
  properties?: { name: string; formula?: string; explanation: string; example: string }[];
}

interface StageGuide {
  id: string;
  stage_id: string;
  sections: GuideSection[];
}

interface Stage {
  id: string;
  title: string;
  order_index: number;
  emoji: string;
}

// ── Icons ────────────────────────────────────────────────────────
const ArrowLeftIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const BookOpenIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M2 6c0-1.1.9-2 2-2h5a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H4a2 2 0 0 1-2-2V6z" stroke="currentColor" strokeWidth="1.5" />
    <path d="M22 6c0-1.1-.9-2-2-2h-5a3 3 0 0 0-3 3v13a2.5 2.5 0 0 1 2.5-2.5H20a2 2 0 0 0 2-2V6z" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── Component ────────────────────────────────────────────────────
const StageGuide = () => {
  const { stageId } = useParams<{ stageId: string }>();
  const navigate = useNavigate();
  const [guide, setGuide] = useState<StageGuide | null>(null);
  const [stage, setStage] = useState<Stage | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      if (!stageId) return;

      const [{ data: stageData }, { data: guideData }] = await Promise.all([
        supabase.from("stages").select("*").eq("id", stageId).single(),
        supabase.from("stage_guides").select("*").eq("stage_id", stageId).single(),
      ]);

      if (stageData) setStage({ ...stageData, emoji: stageData.emoji || "📘" });
      if (guideData) setGuide(guideData);
      setLoading(false);
    };
    fetch();
  }, [stageId]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!guide || !stage) {
    return (
      <div className="flex flex-col items-center py-20 gap-3 text-center px-6">
        <p className="text-sm text-muted-foreground">No guide available for this stage yet.</p>
        <button
          onClick={() => navigate(-1)}
          className="text-sm font-semibold text-primary"
        >
          Go back
        </button>
      </div>
    );
  }

  const section = guide.sections[activeSection];

  return (
    <>
      <style>{`
        /* ── Guide shell ─────────────────────────────── */
        .sg-root {
          min-height: 100dvh;
          background: hsl(var(--background));
          display: flex;
          flex-direction: column;
        }

        /* ── Header ──────────────────────────────────── */
        .sg-header {
          position: sticky;
          top: 0;
          z-index: 20;
          background: hsl(var(--background) / .92);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid hsl(var(--border));
          padding: 0 1rem;
          display: flex;
          align-items: center;
          gap: 10px;
          height: 52px;
        }
        .sg-back-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--card));
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          color: hsl(var(--foreground));
          transition: background .15s;
        }
        .sg-back-btn:hover { background: hsl(var(--muted)); }
        .sg-header-meta { flex: 1; min-width: 0; }
        .sg-header-eyebrow {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .1em;
          text-transform: uppercase;
          color: hsl(var(--primary));
          line-height: 1;
          margin-bottom: 2px;
        }
        .sg-header-title {
          font-size: 13px;
          font-weight: 800;
          font-family: var(--font-display, 'Montserrat', sans-serif);
          color: hsl(var(--foreground));
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sg-header-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: hsl(var(--primary) / .1);
          color: hsl(var(--primary));
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        /* ── Section nav pills ───────────────────────── */
        .sg-nav {
          display: flex;
          gap: 6px;
          padding: 12px 1rem;
          overflow-x: auto;
          scrollbar-width: none;
          border-bottom: 1px solid hsl(var(--border));
        }
        .sg-nav::-webkit-scrollbar { display: none; }
        .sg-pill {
          flex-shrink: 0;
          height: 28px;
          padding: 0 12px;
          border-radius: 99px;
          border: 1px solid hsl(var(--border));
          background: transparent;
          font-size: 11px;
          font-weight: 600;
          color: hsl(var(--muted-foreground));
          cursor: pointer;
          transition: all .15s;
          white-space: nowrap;
        }
        .sg-pill:hover { border-color: hsl(var(--primary) / .5); color: hsl(var(--foreground)); }
        .sg-pill--active {
          background: hsl(var(--primary));
          border-color: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }

        /* ── Content area ────────────────────────────── */
        .sg-body {
          flex: 1;
          padding: 1.25rem 1rem 5rem;
          max-width: 680px;
          margin: 0 auto;
          width: 100%;
        }

        .sg-section-title {
          font-family: var(--font-display, 'Montserrat', sans-serif);
          font-size: 20px;
          font-weight: 800;
          color: hsl(var(--foreground));
          margin-bottom: .75rem;
          line-height: 1.2;
        }
        .sg-intro {
          font-size: 14px;
          color: hsl(var(--muted-foreground));
          line-height: 1.75;
          margin-bottom: 1.5rem;
          padding-left: 12px;
          border-left: 3px solid hsl(var(--primary) / .4);
        }

        /* table */
        .sg-table-wrap {
          overflow-x: auto;
          border-radius: var(--radius, .75rem);
          border: 1px solid hsl(var(--border));
          margin-bottom: 1.5rem;
        }
        .sg-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .sg-table thead { background: hsl(var(--muted)); }
        .sg-table th {
          padding: 10px 14px;
          text-align: left;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: hsl(var(--muted-foreground));
        }
        .sg-table td {
          padding: 10px 14px;
          border-top: 1px solid hsl(var(--border));
          color: hsl(var(--foreground));
          line-height: 1.55;
          vertical-align: top;
        }
        .sg-table tr:last-child td { border-bottom: none; }
        .sg-table tr:nth-child(even) td { background: hsl(var(--muted) / .35); }

        /* bullets */
        .sg-bullets {
          list-style: none;
          padding: 0;
          margin: 0 0 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .sg-bullet {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          font-size: 13.5px;
          color: hsl(var(--foreground));
          line-height: 1.65;
        }
        .sg-bullet-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: hsl(var(--primary));
          flex-shrink: 0;
          margin-top: 8px;
        }

        /* subsections */
        .sg-subsection {
          margin-bottom: 1.25rem;
        }
        .sg-sub-heading {
          font-size: 13px;
          font-weight: 700;
          color: hsl(var(--foreground));
          margin-bottom: 4px;
          font-family: var(--font-display, 'Montserrat', sans-serif);
        }
        .sg-sub-body {
          font-size: 13.5px;
          color: hsl(var(--muted-foreground));
          line-height: 1.7;
          margin-bottom: 6px;
        }
        .sg-examples {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-top: 6px;
        }
        .sg-example {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: hsl(var(--muted-foreground));
          background: hsl(var(--muted));
          border-radius: calc(var(--radius, .75rem) / 1.5);
          padding: 7px 10px;
        }
        .sg-example-arrow {
          color: hsl(var(--primary));
          flex-shrink: 0;
        }

        /* property cards */
        .sg-props {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 1.5rem;
        }
        .sg-prop-card {
          border: 1px solid hsl(var(--border));
          border-radius: var(--radius, .75rem);
          background: hsl(var(--card));
          padding: 12px 14px;
          transition: border-color .15s;
        }
        .sg-prop-card:hover { border-color: hsl(var(--primary) / .4); }
        .sg-prop-name {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .07em;
          text-transform: uppercase;
          color: hsl(var(--primary));
          margin-bottom: 3px;
        }
        .sg-prop-formula {
          font-family: 'Courier New', monospace;
          font-size: 13px;
          font-weight: 600;
          color: hsl(var(--foreground));
          background: hsl(var(--muted));
          border-radius: 6px;
          padding: 2px 8px;
          display: inline-block;
          margin-bottom: 6px;
        }
        .sg-prop-explanation {
          font-size: 13px;
          color: hsl(var(--muted-foreground));
          line-height: 1.6;
          margin-bottom: 5px;
        }
        .sg-prop-example {
          font-size: 11.5px;
          color: hsl(var(--muted-foreground));
          background: hsl(var(--muted) / .6);
          border-radius: 6px;
          padding: 5px 9px;
          font-family: 'Courier New', monospace;
        }

        /* operation group header */
        .sg-op-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 1.5rem 0 .75rem;
        }
        .sg-op-header:first-child { margin-top: 0; }
        .sg-op-label {
          font-family: var(--font-display, 'Montserrat', sans-serif);
          font-size: 13px;
          font-weight: 800;
          color: hsl(var(--foreground));
        }
        .sg-op-divider {
          flex: 1;
          height: 1px;
          background: hsl(var(--border));
        }

        /* nav arrows */
        .sg-footer {
          position: fixed;
          bottom: 0;
          left: 0; right: 0;
          padding: .875rem 1rem;
          background: hsl(var(--background) / .95);
          backdrop-filter: blur(10px);
          border-top: 1px solid hsl(var(--border));
          display: flex;
          gap: 8px;
        }
        .sg-foot-btn {
          flex: 1;
          height: 44px;
          border-radius: var(--radius, .75rem);
          border: 1px solid hsl(var(--border));
          background: hsl(var(--card));
          font-family: var(--font-display, 'Montserrat', sans-serif);
          font-size: 13px;
          font-weight: 700;
          color: hsl(var(--foreground));
          cursor: pointer;
          transition: all .15s;
        }
        .sg-foot-btn:disabled { opacity: .35; cursor: not-allowed; }
        .sg-foot-btn:not(:disabled):hover { background: hsl(var(--muted)); }
        .sg-foot-btn--next {
          background: hsl(var(--primary));
          border-color: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }
        .sg-foot-btn--next:not(:disabled):hover { opacity: .88; }

        /* progress indicator */
        .sg-progress {
          height: 2px;
          background: hsl(var(--border));
          width: 100%;
        }
        .sg-progress-fill {
          height: 100%;
          background: hsl(var(--primary));
          transition: width .4s ease;
        }
      `}</style>

      <div className="sg-root">
        {/* Header */}
        <header className="sg-header">
          <button className="sg-back-btn" onClick={() => navigate(-1)}>
            <ArrowLeftIcon />
          </button>
          <div className="sg-header-meta">
            <div className="sg-header-eyebrow">Stage {stage.order_index} · Guide</div>
            <div className="sg-header-title">{stage.title}</div>
          </div>
          <div className="sg-header-icon">
            <BookOpenIcon />
          </div>
        </header>

        {/* Progress bar */}
        <div className="sg-progress">
          <div
            className="sg-progress-fill"
            style={{ width: `${((activeSection + 1) / guide.sections.length) * 100}%` }}
          />
        </div>

        {/* Section nav pills */}
        <nav className="sg-nav">
          {guide.sections.map((s, i) => (
            <button
              key={i}
              className={`sg-pill${activeSection === i ? " sg-pill--active" : ""}`}
              onClick={() => setActiveSection(i)}
            >
              {s.title}
            </button>
          ))}
        </nav>

        {/* Body */}
        <main className="sg-body">
          <h2 className="sg-section-title">{section.title}</h2>

          {section.intro && (
            <p className="sg-intro">{section.intro}</p>
          )}

          {/* Table */}
          {section.table && (
            <div className="sg-table-wrap">
              <table className="sg-table">
                <thead>
                  <tr>
                    {section.table.columns.map((col, i) => (
                      <th key={i}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section.table.rows.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => (
                        <td key={ci}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Bullets */}
          {section.bullets && (
            <ul className="sg-bullets">
              {section.bullets.map((b, i) => (
                <li key={i} className="sg-bullet">
                  <span className="sg-bullet-dot" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Subsections */}
          {section.subsections && (
            <div>
              {section.subsections.map((sub, i) => (
                <div key={i} className="sg-subsection">
                  {sub.heading && (
                    <div className="sg-sub-heading">{sub.heading}</div>
                  )}
                  <p className="sg-sub-body">{sub.body}</p>
                  {sub.examples && sub.examples.length > 0 && (
                    <div className="sg-examples">
                      {sub.examples.map((ex, ei) => (
                        <div key={ei} className="sg-example">
                          <span className="sg-example-arrow">
                            <ChevronRightIcon />
                          </span>
                          <span>{ex}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Property cards */}
          {section.properties && (
            <div className="sg-props">
              {section.properties.map((prop, i) => (
                <div key={i} className="sg-prop-card">
                  <div className="sg-prop-name">{prop.name}</div>
                  {prop.formula && (
                    <div className="sg-prop-formula">{prop.formula}</div>
                  )}
                  <p className="sg-prop-explanation">{prop.explanation}</p>
                  <div className="sg-prop-example">Example: {prop.example}</div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Footer nav */}
        <div className="sg-footer max-w-screen-sm mx-auto">
          <button
            className="sg-foot-btn"
            disabled={activeSection === 0}
            onClick={() => {
              setActiveSection((p) => p - 1);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            ← Previous
          </button>
          <button
            className="sg-foot-btn sg-foot-btn--next"
            disabled={activeSection === guide.sections.length - 1}
            onClick={() => {
              setActiveSection((p) => p + 1);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Next →
          </button>
        </div>
      </div>
    </>
  );
};

export default StageGuide;