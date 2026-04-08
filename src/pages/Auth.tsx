import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BookOpen, GraduationCap, Users, ArrowRight, ArrowLeft,
  Eye, EyeOff, MailCheck, Mail, Lock, User,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Onboarding from "@/components/Onboarding";

type AuthView = "welcome" | "login" | "register" | "role-select" | "onboarding" | "verify-email";
type UserRole = "teacher" | "learner";

/* ── Logo ── */
const MathlinguaLogo = ({ dark = false }: { dark?: boolean }) => (
  <div className="flex items-center gap-2">
    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${dark ? "bg-primary-foreground/20" : "bg-primary"}`}>
      <BookOpen className="h-5 w-5 text-primary-foreground" />
    </div>
    <span className={`text-sm font-bold tracking-tight ${dark ? "text-primary-foreground" : ""}`}>Mathlingua</span>
  </div>
);

/* ── Dark panel watermark ── */
const LargeWatermark = () => (
  <div className="absolute inset-0 flex items-center justify-center opacity-[0.08] pointer-events-none select-none">
    <svg viewBox="0 0 100 100" className="w-[85%] h-[85%] fill-primary-foreground">
      <path d="M50 5 L95 95 L5 95 Z" />
      <path d="M50 5 L75 95 L25 95 Z" className="opacity-50" />
      <path d="M50 35 L60 95 L40 95 Z" className="opacity-30" />
    </svg>
  </div>
);

/* ── Diagonal accent lines ── */
const AccentLines = () => (
  <div className="absolute top-0 right-0 w-full h-full pointer-events-none overflow-hidden">
    <div className="absolute top-20 right-[-100px] w-[400px] h-[2px] bg-gradient-to-l from-primary-foreground/20 to-transparent rotate-[-35deg]" />
    <div className="absolute top-40 right-[-150px] w-[600px] h-[4px] bg-gradient-to-l from-primary-foreground/10 to-transparent rotate-[-35deg]" />
  </div>
);

export default function Auth() {
  const navigate = useNavigate();
  const { user, setIsGuest } = useAuth();
  const [view, setView] = useState<AuthView>("welcome");
  const [role, setRole] = useState<UserRole | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [classCode, setClassCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  const handleGuestMode = () => {
    localStorage.setItem("algebra-bridge-guest", "true");
    setIsGuest(true);
    navigate("/");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const form = e.target as HTMLFormElement;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { toast.error(error.message); setLoading(false); return; }
    toast.success("Welcome back!");
    navigate("/");
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const form = e.target as HTMLFormElement;
    const firstName = (form.elements.namedItem("firstName") as HTMLInputElement).value;
    const lastName = (form.elements.namedItem("lastName") as HTMLInputElement).value;
    const email = (form.elements.namedItem("reg-email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("reg-password") as HTMLInputElement).value;

    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { display_name: `${firstName} ${lastName}` },
        emailRedirectTo: `https://mathlingua.vercel.app/`,
      },
    });

    if (error) { toast.error(error.message); setLoading(false); return; }

    if (data.user) {
      const needsVerification = !data.session;
      await supabase.from("user_roles").insert({ user_id: data.user.id, role: (role || "learner") as any });
      await supabase.from("profiles").update({
        first_name: firstName, last_name: lastName,
        display_name: `${firstName} ${lastName}`,
      }).eq("user_id", data.user.id);

      if (classCode.trim() && role === "learner") {
        const { data: classLookup } = await supabase.rpc("get_class_by_code", { _class_code: classCode.trim().toUpperCase() });
        const classData = classLookup?.[0];
        if (classData) await supabase.from("class_members").insert({ class_id: classData.id, user_id: data.user.id });
      }

      if (needsVerification) { setRegisteredEmail(email); setView("verify-email"); toast.success("Check your email!"); }
      else setView("onboarding");
    }
    setLoading(false);
  };

  const handleOnboardingComplete = async () => {
    if (user) await supabase.from("profiles").update({ onboarding_completed: true }).eq("user_id", user.id);
    navigate("/");
  };

  const slide = { enter: { x: 30, opacity: 0 }, center: { x: 0, opacity: 1 }, exit: { x: -30, opacity: 0 } };

  if (view === "onboarding") return <Onboarding onComplete={handleOnboardingComplete} />;

  /* ── Shared right panel ── */
  const RightPanel = () => (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}
      className="hidden lg:flex flex-col w-1/2 p-10 bg-background"
    >
      <div className="relative h-full w-full bg-primary rounded-[48px] overflow-hidden p-16 flex flex-col justify-between shadow-2xl">
        <LargeWatermark />
        <AccentLines />

        {/* Top */}
        <div className="relative z-10 space-y-10">
          <MathlinguaLogo dark />
          <div className="space-y-4">
            <h2 className="text-5xl font-bold text-primary-foreground leading-[1.1] tracking-tight">
              {view === "welcome" && <>Welcome to<br />Mathlingua</>}
              {view === "login" && <>Good to see<br />you again</>}
              {view === "role-select" && <>Join our<br />community</>}
              {view === "register" && <>Start your<br />journey</>}
              {view === "verify-email" && <>Almost<br />there!</>}
            </h2>
            <p className="text-primary-foreground/60 max-w-sm text-sm font-medium leading-relaxed">
              {view === "welcome" && "Mathlingua helps students master algebraic translations step by step. Join thousands of learners and teachers building math confidence every day."}
              {view === "login" && "Continue where you left off. Your lessons, progress, and classes are waiting for you."}
              {view === "role-select" && "Whether you're here to learn or to teach, Mathlingua adapts to your role and helps you achieve your goals."}
              {view === "register" && "Create your account and start translating word problems into equations with confidence and clarity."}
              {view === "verify-email" && "Verify your email to unlock all features and start mastering algebraic translations step by step."}
            </p>
          </div>
          <p className="text-primary-foreground/40 text-sm font-bold">
            More than 5k students already learning
          </p>
        </div>

        {/* Bottom curvy card */}
        <div className="relative z-10 mt-auto">
          <div className="relative">
            <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 400 230">
              <path
                d="M40,0 H250 C270,0 280,10 280,30 V38 C280,65 292,75 320,75 H360 C385,75 400,90 400,115 V190 C400,212 382,230 360,230 H40 C18,230 0,212 0,190 V40 C0,18 18,0 40,0 Z"
                fill="rgba(255,255,255,0.12)"
              />
            </svg>
            <div className="relative p-10 pt-12 space-y-5 min-h-[230px]">
              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-primary-foreground leading-tight max-w-[260px]">
                  {view === "register" && role === "teacher"
                    ? "Create classes and track student progress"
                    : "Learn algebra through real word problems"}
                </h3>
                <p className="text-primary-foreground/50 text-sm font-medium max-w-[260px] leading-relaxed">
                  {view === "register" && role === "teacher"
                    ? "Set up your classroom, assign lessons, and monitor every student's growth."
                    : "Step-by-step guidance that builds real understanding, not just memorization."}
                </p>
              </div>
              <div className="flex -space-x-2">
                {[GraduationCap, Users, BookOpen].map((Icon, i) => (
                  <div key={i} className="w-9 h-9 rounded-full bg-primary-foreground/20 border-2 border-primary flex items-center justify-center">
                    <Icon className="h-4 w-4 text-primary-foreground" />
                  </div>
                ))}
                <div className="w-9 h-9 rounded-full bg-primary-foreground/10 border-2 border-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                  +2k
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  /* ── Verify email ── */
  if (view === "verify-email") {
    return (
      <div className="flex min-h-screen bg-[#f8f8f8] font-sans selection:bg-primary selection:text-primary-foreground">
        <motion.div
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col justify-center w-full px-8 py-12 lg:w-1/2 xl:px-32 bg-white"
        >
          <div className="max-w-sm mx-auto w-full space-y-8 text-center">
            <div className="flex justify-start"><MathlinguaLogo /></div>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
              <MailCheck className="h-10 w-10 text-success" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Check your email</h1>
              <p className="text-muted-foreground text-sm">
                We sent a verification link to{" "}
                <span className="font-semibold text-foreground">{registeredEmail}</span>
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Click the link in your email to verify your account, then come back here to log in.
            </p>
            <Button
              className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl"
              onClick={() => setView("login")}
            >
              Go to Login
            </Button>
            <button
              className="w-full text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              onClick={async () => {
                const { error } = await supabase.auth.resend({ type: "signup", email: registeredEmail });
                if (error) toast.error(error.message); else toast.success("Verification email resent!");
              }}
            >
              Resend verification email
            </button>
          </div>
        </motion.div>
        <RightPanel />
      </div>
    );
  }

  /* ── Main layout ── */
  return (
    <div className="flex min-h-screen bg-[#f8f8f8] font-sans selection:bg-primary selection:text-primary-foreground ">

      {/* Left white form */}
      <motion.div
        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-col justify-center w-full px-8 py-12 lg:w-1/2 xl:px-32 bg-background"
      >
        <div className="max-w-sm mx-auto w-full space-y-10">

          <MathlinguaLogo />

          <AnimatePresence mode="wait">

            {/* ── Welcome ── */}
            {view === "welcome" && (
              <motion.div key="welcome" variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="space-y-6">
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold tracking-tight">Welcome</h1>
                  <p className="text-muted-foreground text-sm">Master algebraic translations step by step</p>
                </div>
                <div className="space-y-3 pt-2">
                  <Button
                    className="w-full h-14 bg-[#141414] hover:bg-black text-white font-bold rounded-xl transition-all active:scale-[0.98] text-sm"
                    onClick={() => setView("login")}
                  >
                    Log In <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full h-14 font-bold rounded-xl border-gray-200 transition-all active:scale-[0.98] text-sm"
                    onClick={() => setView("role-select")}
                  >
                    Create Account
                  </Button>
                  <div className="relative py-1">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-100" /></div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-3 text-muted-foreground">or</span>
                    </div>
                  </div>
                  <button
                    className="w-full h-14 flex items-center justify-center text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors rounded-xl border border-gray-100 hover:bg-gray-50 shadow-sm"
                    onClick={handleGuestMode}
                  >
                    Continue as Guest
                  </button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Guest mode shows a limited preview. Create an account for full access.
                </p>
              </motion.div>
            )}

            {/* ── Login ── */}
            {view === "login" && (
              <motion.div key="login" variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="space-y-8">
                <button onClick={() => setView("welcome")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold tracking-tight">Sign in</h1>
                </div>
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-bold text-gray-900 uppercase tracking-wider">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input id="email" name="email" type="email" placeholder="you@example.com" required
                        className="pl-11 h-14 bg-white border-gray-100 rounded-xl focus:ring-1 focus:ring-primary focus:border-primary transition-all shadow-sm" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-xs font-bold text-gray-900 uppercase tracking-wider">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input id="password" name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" required
                        className="pl-11 h-14 bg-white border-gray-100 rounded-xl focus:ring-1 focus:ring-primary focus:border-primary transition-all shadow-sm" />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="remember" className="w-5 h-5 border-gray-300 rounded-md data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                    <label htmlFor="remember" className="text-sm font-semibold text-gray-800 cursor-pointer">Remember me</label>
                  </div>
                  <Button type="submit" disabled={loading}
                    className="w-full h-14 bg-[#141414] hover:bg-black text-white font-bold rounded-xl transition-all active:scale-[0.98] text-sm"
                  >
                    {loading ? "Signing in..." : "Sign in"}
                  </Button>
                </form>
                <div className="flex flex-col items-center space-y-3 text-sm">
                  <p className="text-gray-400 font-medium">
                    Don't have an account?{" "}
                    <button onClick={() => setView("role-select")} className="font-bold text-gray-600 hover:text-black transition-colors">Sign up</button>
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── Role Select ── */}
            {view === "role-select" && (
              <motion.div key="role-select" variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="space-y-8">
                <button onClick={() => setView("welcome")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold tracking-tight">I am a...</h1>
                  <p className="text-muted-foreground text-sm">Choose your role to get started</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => { setRole("learner"); setView("register"); }}
                    className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-gray-100 p-6 transition-all hover:border-success hover:shadow-md active:scale-[0.98] bg-white shadow-sm"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success transition-transform group-hover:scale-110">
                      <GraduationCap className="h-7 w-7" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-sm">Learner</p>
                      <p className="text-xs text-muted-foreground">Study & practice</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { setRole("teacher"); setView("register"); }}
                    className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-gray-100 p-6 transition-all hover:border-primary hover:shadow-md active:scale-[0.98] bg-white shadow-sm"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110">
                      <Users className="h-7 w-7" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-sm">Teacher</p>
                      <p className="text-xs text-muted-foreground">Manage classes</p>
                    </div>
                  </button>
                </div>
                <p className="text-center text-sm text-gray-400 font-medium">
                  Already have an account?{" "}
                  <button onClick={() => setView("login")} className="font-bold text-gray-600 hover:text-black transition-colors">Log in</button>
                </p>
              </motion.div>
            )}

            {/* ── Register ── */}
            {view === "register" && (
              <motion.div key="register" variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="space-y-6">
                <button onClick={() => setView("role-select")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold tracking-tight">Create account</h1>
                  <p className="text-muted-foreground text-sm">
                    Signing up as a <span className="font-semibold text-foreground">{role === "teacher" ? "Teacher" : "Learner"}</span>
                  </p>
                </div>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-xs font-bold text-gray-900 uppercase tracking-wider">First name</Label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input id="firstName" name="firstName" placeholder="Juan" required
                          className="pl-11 h-14 bg-white border-gray-100 rounded-xl focus:ring-1 focus:ring-primary shadow-sm" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-xs font-bold text-gray-900 uppercase tracking-wider">Last name</Label>
                      <Input id="lastName" name="lastName" placeholder="Dela Cruz" required
                        className="h-14 bg-white border-gray-100 rounded-xl focus:ring-1 focus:ring-primary shadow-sm" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email" className="text-xs font-bold text-gray-900 uppercase tracking-wider">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input id="reg-email" name="reg-email" type="email" placeholder="you@example.com" required
                        className="pl-11 h-14 bg-white border-gray-100 rounded-xl focus:ring-1 focus:ring-primary shadow-sm" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password" className="text-xs font-bold text-gray-900 uppercase tracking-wider">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input id="reg-password" name="reg-password" type={showPassword ? "text" : "password"} placeholder="••••••••" required
                        className="pl-11 h-14 bg-white border-gray-100 rounded-xl focus:ring-1 focus:ring-primary shadow-sm" />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  {role === "learner" && (
                    <div className="space-y-2">
                      <Label htmlFor="classCode" className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                        Class Code <span className="normal-case font-normal text-gray-400">(optional)</span>
                      </Label>
                      <Input id="classCode" placeholder="e.g. ABC-1234" value={classCode} onChange={(e) => setClassCode(e.target.value)}
                        className="h-14 bg-white border-gray-100 rounded-xl focus:ring-1 focus:ring-primary shadow-sm" />
                      <p className="text-xs text-muted-foreground">Enter a code from your teacher to join a class, or skip to study independently.</p>
                    </div>
                  )}
                  <Button type="submit" disabled={loading}
                    className="w-full h-14 bg-[#141414] hover:bg-black text-white font-bold rounded-xl transition-all active:scale-[0.98] text-sm"
                  >
                    {loading ? "Creating..." : "Create Account"}
                  </Button>
                </form>
                <p className="text-center text-sm text-gray-400 font-medium">
                  Already have an account?{" "}
                  <button onClick={() => setView("login")} className="font-bold text-gray-600 hover:text-black transition-colors">Log in</button>
                </p>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>

      {/* Right dark rounded panel */}
      <RightPanel />
    </div>
  );
}