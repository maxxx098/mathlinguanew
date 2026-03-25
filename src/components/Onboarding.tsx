import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { BookOpen, Target, Trophy, Users, Heart, ArrowRight, ArrowLeft, Shield } from "lucide-react";

interface OnboardingProps {
  onComplete: () => void;
}

const slides = [
  {
    icon: BookOpen,
    iconBg: "bg-primary/10 text-primary",
    title: "Welcome to Algebra Bridge! 🎓",
    description: "Master algebraic translations step by step through fun, gamified lessons designed to make math enjoyable.",
  },
  {
    icon: Target,
    iconBg: "bg-success/10 text-success",
    title: "Learn at Your Pace 🎯",
    description: "Progress through stages and levels with multiple choice, fill-in-the-blank, and expression-building questions.",
  },
  {
    icon: Heart,
    iconBg: "bg-destructive/10 text-destructive",
    title: "Lives & Daily Challenges ❤️",
    description: "You have 5 lives that regenerate over time. Complete daily challenges to test your skills and earn bonus points!",
  },
  {
    icon: Trophy,
    iconBg: "bg-warning/10 text-warning",
    title: "Earn Badges & Track Progress 🏆",
    description: "Unlock achievements as you learn. From First Steps to Master Mind — collect them all!",
  },
  {
    icon: Users,
    iconBg: "bg-primary/10 text-primary",
    title: "Join a Class 👥",
    description: "Connect with your teacher and classmates. See how you rank on the progress board and cheer each other on!",
  },
];

const Onboarding = ({ onComplete }: OnboardingProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const isLastSlide = currentSlide === slides.length;
  const totalSteps = slides.length + 1; // slides + terms page

  const handleNext = () => {
    if (isLastSlide && acceptedTerms) {
      onComplete();
    } else if (!isLastSlide) {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentSlide > 0) setCurrentSlide(prev => prev - 1);
  };

  const slide = slides[currentSlide];
  const Icon = slide?.icon;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mb-8">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentSlide ? "w-6 bg-primary" : i < currentSlide ? "w-1.5 bg-primary/50" : "w-1.5 bg-muted"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {!isLastSlide && slide ? (
            <motion.div
              key={currentSlide}
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -40, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-8 text-center"
            >
              <div className="space-y-5">
                <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-2xl ${slide.iconBg} shadow-lg`}>
                  {Icon && <Icon className="h-10 w-10" />}
                </div>
                <div className="space-y-3">
                  <h2 className="font-display text-2xl font-bold tracking-tight">{slide.title}</h2>
                  <p className="text-muted-foreground leading-relaxed">{slide.description}</p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="terms"
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -40, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="text-center space-y-3">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-lg">
                  <Shield className="h-10 w-10" />
                </div>
                <h2 className="font-display text-2xl font-bold tracking-tight">Terms & Privacy</h2>
                <p className="text-muted-foreground text-sm">Please review and accept before continuing</p>
              </div>

              <div className="rounded-xl border bg-card p-4 space-y-3 max-h-48 overflow-y-auto text-left">
                <h3 className="font-semibold text-sm">Terms of Use</h3>
                <ul className="text-xs text-muted-foreground space-y-2 list-disc pl-4">
                  <li>Algebra Bridge is an educational platform for learning algebraic concepts.</li>
                  <li>You agree to use the app responsibly and respect other users in the community.</li>
                  <li>Your progress and data are stored securely to provide a personalized learning experience.</li>
                  <li>Do not share your account credentials with others.</li>
                </ul>
                <h3 className="font-semibold text-sm mt-3">Privacy Policy</h3>
                <ul className="text-xs text-muted-foreground space-y-2 list-disc pl-4">
                  <li>We collect your name, email, and learning progress to improve your experience.</li>
                  <li>Your data is never sold to third parties.</li>
                  <li>Teachers can view progress of students in their classes.</li>
                  <li>You can manage your privacy settings in your profile at any time.</li>
                </ul>
              </div>

              <div className="flex items-start gap-3 rounded-xl border bg-card p-4">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                  className="mt-0.5"
                />
                <label htmlFor="terms" className="text-sm cursor-pointer leading-relaxed">
                  I accept the <span className="font-semibold text-primary">Terms of Use</span> and{" "}
                  <span className="font-semibold text-primary">Privacy Policy</span>
                </label>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation buttons */}
        <div className="mt-8 flex gap-3">
          {currentSlide > 0 && (
            <Button variant="outline" size="lg" onClick={handleBack} className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          )}
          <Button
            size="lg"
            className="flex-1 gap-2 font-semibold"
            onClick={handleNext}
            disabled={isLastSlide && !acceptedTerms}
          >
            {isLastSlide ? "Get Started" : "Next"} {!isLastSlide && <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>

        {!isLastSlide && (
          <button
            onClick={() => setCurrentSlide(slides.length)}
            className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip to terms
          </button>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
