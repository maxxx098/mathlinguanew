import { useState } from "react";

interface OnboardingProps {
  onComplete: () => void;
}

const slides = [
  {
    num: "01",
    title: "Welcome to Sal'Tech!",
    desc: `Where "salin" (to translate) meets technology—helping you master algebraic translations step by step through fun, gamified lessons that turn real-life situations into clear, engaging mathematical expressions.`,
  },
  {
    num: "02",
    title: "Learn at Your Pace",
    desc: "Progress through stages and levels with multiple-choice and identification tasks, where you'll either select the correct answer or create your own algebraic translations.",
  },
  {
    num: "03",
    title: "Lives & Daily Challenges",
    desc: "Five lives regenerate over time. Complete daily challenges to test your skills and earn bonus points at the end of each session.",
  },
  {
    num: "04",
    title: "Earn Badges & Track Progress",
    desc: "Unlock achievements as you learn. From First Steps to Master Mind — each badge marks a real milestone in your journey.",
  },
  {
    num: "05",
    title: "Join a Class",
    desc: "Connect with your teacher and classmates. See how you progress alongside peers and celebrate each other's achievements.",
  },
];

const TOTAL = slides.length + 1;

const Onboarding = ({ onComplete }: OnboardingProps) => {
  const [current, setCurrent] = useState(0);
  const [accepted, setAccepted] = useState(false);

  const isTerms = current === slides.length;
  const slide = slides[current];

  const goNext = () => {
    if (isTerms && accepted) {
      onComplete();
    } else if (!isTerms) {
      setCurrent((p) => p + 1);
    }
  };

  const goBack = () => {
    if (current > 0) setCurrent((p) => p - 1);
  };

  const skipToTerms = () => setCurrent(slides.length);

  return (
    <div
      style={{
        fontFamily: "var(--font-display, 'Montserrat', sans-serif)",
        background: "hsl(var(--background))",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          padding: "48px 40px 40px",
          position: "relative",
          overflow: "hidden",
          borderRadius: 0,
        }}
      >
        {/* Top accent line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: "hsl(var(--primary))",
          }}
        />

        {/* Step row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 40,
          }}
        >
          <span
            style={{
              fontSize: "0.6875rem",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "hsl(var(--primary))",
            }}
          >
            Step {current + 1} of {TOTAL}
          </span>

          {/* Progress ticks */}
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {Array.from({ length: TOTAL }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 2,
                  width: i === current ? 26 : 14,
                  background:
                    i < current
                      ? "hsl(var(--primary) / 0.45)"
                      : i === current
                      ? "hsl(var(--primary))"
                      : "hsl(var(--border))",
                  transition: "background 0.3s, width 0.3s",
                }}
              />
            ))}
          </div>
        </div>

        {/* Slide content */}
        {!isTerms && slide ? (
          <div key={current} style={{ animation: "obIn 0.3s cubic-bezier(0.16,1,0.3,1) both" }}>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "5rem",
                fontWeight: 300,
                fontStyle: "italic",
                lineHeight: 1,
                color: "hsl(var(--primary))",
                opacity: 0.18,
                marginBottom: 8,
                letterSpacing: "-0.02em",
                userSelect: "none",
              }}
            >
              {slide.num}
            </div>

            <h2
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "clamp(1.5rem, 4vw, 2rem)",
                fontWeight: 400,
                fontStyle: "italic",
                lineHeight: 1.2,
                color: "hsl(var(--foreground))",
                marginBottom: 14,
              }}
            >
              {slide.title}
            </h2>

            <div
              style={{
                width: 32,
                height: 1.5,
                background: "hsl(var(--primary))",
                margin: "16px 0 20px",
                opacity: 0.5,
              }}
            />

            <p
              style={{
                fontSize: "0.875rem",
                lineHeight: 1.7,
                color: "hsl(var(--muted-foreground))",
              }}
            >
              {slide.desc}
            </p>
          </div>
        ) : (
          /* Terms slide */
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <div
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: "5rem",
                  fontWeight: 300,
                  fontStyle: "italic",
                  lineHeight: 1,
                  color: "hsl(var(--primary))",
                  opacity: 0.18,
                  marginBottom: 8,
                  userSelect: "none",
                }}
              >
                06
              </div>
              <h2
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: "clamp(1.5rem, 4vw, 2rem)",
                  fontWeight: 400,
                  fontStyle: "italic",
                  color: "hsl(var(--foreground))",
                  marginBottom: 4,
                }}
              >
                Terms & Privacy
              </h2>
              <div
                style={{
                  width: 32,
                  height: 1.5,
                  background: "hsl(var(--primary))",
                  opacity: 0.5,
                  margin: "16px 0 6px",
                }}
              />
              <p style={{ fontSize: "0.8125rem", color: "hsl(var(--muted-foreground))" }}>
                Please review and accept before continuing.
              </p>
            </div>

            {/* Scrollable terms */}
            <div
              style={{
                border: "1px solid hsl(var(--border))",
                padding: 20,
                maxHeight: 156,
                overflowY: "auto",
                background: "hsl(var(--accent))",
              }}
            >
              <p
                style={{
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  letterSpacing: "0.09em",
                  textTransform: "uppercase",
                  color: "hsl(var(--foreground))",
                  marginBottom: 8,
                }}
              >
                Terms of Use
              </p>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {[
                  "Sal'Tech is an educational platform for learning algebraic concepts.",
                  "You agree to use the app responsibly and respect other community members.",
                  "Your progress and data are stored securely for a personalised experience.",
                  "Do not share your account credentials with others.",
                ].map((item, i) => (
                  <li
                    key={i}
                    style={{
                      fontSize: "0.8125rem",
                      lineHeight: 1.6,
                      color: "hsl(var(--muted-foreground))",
                      padding: "2px 0 2px 14px",
                      position: "relative",
                    }}
                  >
                    <span style={{ position: "absolute", left: 0, color: "hsl(var(--border))" }}>—</span>
                    {item}
                  </li>
                ))}
              </ul>

              <p
                style={{
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  letterSpacing: "0.09em",
                  textTransform: "uppercase",
                  color: "hsl(var(--foreground))",
                  marginTop: 14,
                  marginBottom: 8,
                }}
              >
                Privacy Policy
              </p>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {[
                  "We collect your name, email, and learning progress to improve your experience.",
                  "Your data is never sold to third parties.",
                  "Teachers can view the progress of students in their classes.",
                  "Manage your privacy settings in your profile at any time.",
                ].map((item, i) => (
                  <li
                    key={i}
                    style={{
                      fontSize: "0.8125rem",
                      lineHeight: 1.6,
                      color: "hsl(var(--muted-foreground))",
                      padding: "2px 0 2px 14px",
                      position: "relative",
                    }}
                  >
                    <span style={{ position: "absolute", left: 0, color: "hsl(var(--border))" }}>—</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Accept checkbox */}
            <div
              onClick={() => setAccepted((a) => !a)}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                padding: "14px 16px",
                border: `1px solid ${accepted ? "hsl(var(--primary))" : "hsl(var(--border))"}`,
                cursor: "pointer",
                background: "hsl(var(--card))",
                transition: "border-color 0.2s",
              }}
            >
              <div
                style={{
                  width: 17,
                  height: 17,
                  border: `1.5px solid ${accepted ? "hsl(var(--primary))" : "hsl(var(--border))"}`,
                  flexShrink: 0,
                  marginTop: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: accepted ? "hsl(var(--primary))" : "transparent",
                  transition: "border-color 0.2s, background 0.2s",
                  borderRadius: 0,
                }}
              >
                {accepted && (
                  <svg width="10" height="8" fill="none" stroke="white" strokeWidth="2.2" viewBox="0 0 10 8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M1 4L3.5 6.5L9 1" />
                  </svg>
                )}
              </div>
              <span style={{ fontSize: "0.875rem", lineHeight: 1.55, color: "hsl(var(--muted-foreground))", cursor: "pointer" }}>
                I accept the{" "}
                <strong style={{ color: "hsl(var(--primary))", fontWeight: 600 }}>Terms of Use</strong> and{" "}
                <strong style={{ color: "hsl(var(--primary))", fontWeight: 600 }}>Privacy Policy</strong>
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 10 }}>
            {current > 0 && (
              <button
                onClick={goBack}
                style={{
                  background: "none",
                  border: "1px solid hsl(var(--border))",
                  color: "hsl(var(--muted-foreground))",
                  padding: "13px 18px",
                  fontFamily: "var(--font-display, 'Montserrat', sans-serif)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  borderRadius: 0,
                  whiteSpace: "nowrap",
                }}
              >
                ← Back
              </button>
            )}
            <button
              onClick={goNext}
              disabled={isTerms && !accepted}
              style={{
                flex: 1,
                background: "hsl(var(--primary))",
                color: "hsl(var(--primary-foreground))",
                border: "none",
                padding: "13px 28px",
                fontFamily: "var(--font-display, 'Montserrat', sans-serif)",
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                cursor: isTerms && !accepted ? "not-allowed" : "pointer",
                opacity: isTerms && !accepted ? 0.35 : 1,
                borderRadius: 0,
              }}
            >
              {isTerms ? "Get Started" : "Continue"}
            </button>
          </div>

          {!isTerms && (
            <button
              onClick={skipToTerms}
              style={{
                textAlign: "center",
                fontSize: "0.75rem",
                fontWeight: 500,
                letterSpacing: "0.04em",
                color: "hsl(var(--muted-foreground))",
                cursor: "pointer",
                border: "none",
                background: "none",
                fontFamily: "var(--font-display, 'Montserrat', sans-serif)",
              }}
            >
              Skip to terms
            </button>
          )}
        </div>

        <style>{`
          @keyframes obIn {
            from { opacity: 0; transform: translateX(18px); }
            to   { opacity: 1; transform: translateX(0); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default Onboarding;