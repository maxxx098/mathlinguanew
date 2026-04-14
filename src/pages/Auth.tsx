import { useState, useEffect } from "react";
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
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Onboarding from "@/components/Onboarding";
import Logo from "@/assets/logo.png"

type AuthView = "welcome" | "login" | "register" | "role-select" | "onboarding" | "verify-email" | "forgot-password" | "reset-email-sent";
type UserRole = "teacher" | "learner";

/* ── Logo ── */
const MathlinguaLogo = ({ dark = false }: { dark?: boolean }) => (
  <div className="flex items-center gap-2">
    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${dark ? "bg-primary-foreground/20" : "bg-white"}`}>
      <img src={Logo} alt="Mathlingua Logo" className="h-7 w-7 text-primary-foreground" />
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
  const [resetEmail, setResetEmail] = useState("");
  const [stats, setStats] = useState({ users: 0, lessons: 0 });

  // Handle OTP expired / access_denied errors from email verification links
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("error=access_denied") || hash.includes("otp_expired")) {
      const params = new URLSearchParams(hash.replace("#", ""));
      const desc = params.get("error_description") || "Email link is invalid or has expired";
      toast.error(desc);
      setView("login");
      // Clean up the URL hash
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      const { count: userCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      const { count: lessonCount } = await supabase
        .from("assignment_submissions")
        .select("*", { count: "exact", head: true });
      setStats({
        users: userCount || 0,
        lessons: lessonCount || 0,
      });
    };
    fetchStats();
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1000) return `${Math.floor(num / 1000)}k+`;
    return num;
  };

  const handleGoogleSignIn = async () => {
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) {
      toast.error("Google sign-in failed. Please try again.");
    }
  };

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
        data: { display_name: `${firstName} ${lastName}`, role: role || "learner", first_name: firstName, last_name: lastName },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) { toast.error(error.message); setLoading(false); return; }

    // Detect duplicate email (Supabase returns a fake user with empty identities)
    if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
      toast.error("An account with this email already exists. Please log in instead.");
      setLoading(false);
      return;
    }

    if (data.user) {
      const selectedRole = role || "learner";
      const needsVerification = !data.session;
      
      // Update profile with role and name information
      const { error: roleError } = await supabase.from("profiles").upsert({
        user_id: data.user.id,
        first_name: firstName,
        last_name: lastName,
        display_name: `${firstName} ${lastName}`,
        role: selectedRole,
      }, { onConflict: "user_id" });

        if (roleError) {
          console.warn("Profile upsert failed (role in metadata as fallback):", roleError.message);
          // Don't return — the role is already saved in user_metadata from signUp
        }

      if (data.session) {
        // Profile already updated above
      }

      if (classCode.trim() && selectedRole === "learner" && data.session) {
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
              {(view === "forgot-password" || view === "reset-email-sent") && <>Reset your<br />password</>}
            </h2>
            <p className="text-primary-foreground/60 max-w-sm text-sm font-medium leading-relaxed">
              {view === "welcome" && "Mathlingua helps students master algebraic translations step by step. Join thousands of learners and teachers building math confidence every day."}
              {view === "login" && "Continue where you left off. Your lessons, progress, and classes are waiting for you."}
              {view === "role-select" && "Whether you're here to learn or to teach, Mathlingua adapts to your role and helps you achieve your goals."}
              {view === "register" && "Create your account and start translating word problems into equations with confidence and clarity."}
              {view === "verify-email" && "Verify your email to unlock all features and start mastering algebraic translations step by step."}
              {view === "forgot-password" && "Enter your email and we'll send you a reset link."}
              {view === "reset-email-sent" && "Check your inbox for the reset link."}
            </p>
          </div>
          <p className="text-primary-foreground/40 text-sm font-bold">
            {view === "welcome" && `Join ${formatNumber(stats.users)} users mastering algebra`}
            {view === "login" && `${stats.lessons.toLocaleString()} lessons completed`}
            {view === "role-select" && `Thousands of teachers and learners`}
            {view === "register" && `Join our growing community`}
            {view === "verify-email" && `Excited to have you on board!`}
            {(view === "forgot-password" || view === "reset-email-sent") && `We'll help you get back in`}
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
      <div className="flex min-h-screen bg-background">
        <motion.div
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col justify-center w-full px-8 py-12 lg:w-1/2 xl:px-32 bg-background"
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
    <div className="flex min-h-screen bg-background font-sans selection:bg-primary selection:text-primary-foreground">

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
                    className="w-full h-14 bg-foreground hover:bg-foreground/90 text-background font-bold rounded-xl transition-all active:scale-[0.98] text-sm"
                    onClick={() => setView("login")}
                  >
                    Log In <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full h-14 font-bold rounded-xl border-border transition-all active:scale-[0.98] text-sm"
                    onClick={() => setView("role-select")}
                  >
                    Create Account
                  </Button>
                  <div className="relative py-1">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-3 text-muted-foreground">or</span>
                    </div>
                  </div>
                  <button
                    className="w-full h-14 flex items-center justify-center text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors rounded-xl border border-border hover:bg-muted shadow-sm"
                    onClick={handleGuestMode}
                  >
                    Continue as Guest
                  </button>
                  <div className="relative py-1">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-3 text-muted-foreground">or sign in with</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full h-14 font-bold rounded-xl border-border transition-all active:scale-[0.98] text-sm gap-2"
                    onClick={handleGoogleSignIn}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    Continue with Google
                  </Button>
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
                    <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="email" name="email" type="email" placeholder="you@example.com" required
                        className="pl-11 h-14 bg-background border-border rounded-xl focus:ring-1 focus:ring-primary focus:border-primary transition-all shadow-sm" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="password" name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" required
                        className="pl-11 h-14 bg-background border-border rounded-xl focus:ring-1 focus:ring-primary focus:border-primary transition-all shadow-sm" />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="remember" className="w-5 h-5 border-border rounded-md data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                      <label htmlFor="remember" className="text-sm font-semibold cursor-pointer">Remember me</label>
                    </div>
                    <button type="button" onClick={() => setView("forgot-password")} className="text-xs text-primary hover:underline font-semibold">
                      Forgot password?
                    </button>
                  </div>
                  <Button type="submit" disabled={loading}
                    className="w-full h-14 bg-foreground hover:bg-foreground/90 text-background font-bold rounded-xl transition-all active:scale-[0.98] text-sm"
                  >
                    {loading ? "Signing in..." : "Sign in"}
                  </Button>
                </form>
                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-3 text-muted-foreground">or</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full h-14 font-bold rounded-xl border-border transition-all active:scale-[0.98] text-sm gap-2"
                  onClick={handleGoogleSignIn}
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  Continue with Google
                </Button>
                <div className="flex flex-col items-center space-y-3 text-sm">
                  <p className="text-muted-foreground font-medium">
                    Don't have an account?{" "}
                    <button onClick={() => setView("role-select")} className="font-bold text-foreground hover:text-primary transition-colors">Sign up</button>
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
                    className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-border p-6 transition-all hover:border-success hover:shadow-md active:scale-[0.98] bg-card shadow-sm"
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
                    className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-border p-6 transition-all hover:border-primary hover:shadow-md active:scale-[0.98] bg-card shadow-sm"
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
                <p className="text-center text-sm text-muted-foreground font-medium">
                  Already have an account?{" "}
                  <button onClick={() => setView("login")} className="font-bold text-foreground hover:text-primary transition-colors">Log in</button>
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
                      <Label htmlFor="firstName" className="text-xs font-bold uppercase tracking-wider">First name</Label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="firstName" name="firstName" placeholder="Juan" required
                          className="pl-11 h-14 bg-background border-border rounded-xl focus:ring-1 focus:ring-primary shadow-sm" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-xs font-bold uppercase tracking-wider">Last name</Label>
                      <Input id="lastName" name="lastName" placeholder="Dela Cruz" required
                        className="h-14 bg-background border-border rounded-xl focus:ring-1 focus:ring-primary shadow-sm" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email" className="text-xs font-bold uppercase tracking-wider">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="reg-email" name="reg-email" type="email" placeholder="you@example.com" required
                        className="pl-11 h-14 bg-background border-border rounded-xl focus:ring-1 focus:ring-primary shadow-sm" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password" className="text-xs font-bold uppercase tracking-wider">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="reg-password" name="reg-password" type={showPassword ? "text" : "password"} placeholder="••••••••" required
                        className="pl-11 h-14 bg-background border-border rounded-xl focus:ring-1 focus:ring-primary shadow-sm" />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  {role === "learner" && (
                    <div className="space-y-2">
                      <Label htmlFor="classCode" className="text-xs font-bold uppercase tracking-wider">
                        Class Code <span className="normal-case font-normal text-muted-foreground">(optional)</span>
                      </Label>
                      <Input id="classCode" placeholder="e.g. ABC-1234" value={classCode} onChange={(e) => setClassCode(e.target.value)}
                        className="h-14 bg-background border-border rounded-xl focus:ring-1 focus:ring-primary shadow-sm" />
                      <p className="text-xs text-muted-foreground">Enter a code from your teacher to join a class, or skip to study independently.</p>
                    </div>
                  )}
                  <Button type="submit" disabled={loading}
                    className="w-full h-14 bg-foreground hover:bg-foreground/90 text-background font-bold rounded-xl transition-all active:scale-[0.98] text-sm"
                  >
                    {loading ? "Creating..." : "Create Account"}
                  </Button>
                </form>
                <p className="text-center text-sm text-muted-foreground font-medium">
                  Already have an account?{" "}
                  <button onClick={() => setView("login")} className="font-bold text-foreground hover:text-primary transition-colors">Log in</button>
                </p>
              </motion.div>
            )}

            {/* ── Forgot Password ── */}
            {view === "forgot-password" && (
              <motion.div key="forgot-password" variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="space-y-8">
                <button onClick={() => setView("login")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="h-4 w-4" /> Back to login
                </button>
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold tracking-tight">Reset password</h1>
                  <p className="text-muted-foreground text-sm">Enter your email and we'll send you a reset link</p>
                </div>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setLoading(true);
                  const email = (e.target as HTMLFormElement).elements.namedItem("reset-email") as HTMLInputElement;
                  const { error } = await supabase.auth.resetPasswordForEmail(email.value, {
                    redirectTo: `${window.location.origin}/reset-password`,
                  });
                  if (error) { toast.error(error.message); setLoading(false); return; }
                  setResetEmail(email.value);
                  setView("reset-email-sent");
                  setLoading(false);
                }} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email" className="text-xs font-bold uppercase tracking-wider">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="reset-email" name="reset-email" type="email" placeholder="you@example.com" required
                        className="pl-11 h-14 bg-background border-border rounded-xl focus:ring-1 focus:ring-primary shadow-sm" />
                    </div>
                  </div>
                  <Button type="submit" disabled={loading}
                    className="w-full h-14 bg-foreground hover:bg-foreground/90 text-background font-bold rounded-xl transition-all active:scale-[0.98] text-sm"
                  >
                    {loading ? "Sending..." : "Send Reset Link"}
                  </Button>
                </form>
              </motion.div>
            )}

            {/* ── Reset Email Sent Confirmation ── */}
            {view === "reset-email-sent" && (
              <motion.div key="reset-email-sent" variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="space-y-8">
                <div className="space-y-2 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-2">
                    <MailCheck className="h-7 w-7 text-primary" />
                  </div>
                  <h1 className="text-4xl font-bold tracking-tight">Check your email</h1>
                  <p className="text-muted-foreground text-sm">
                    We sent a password reset link to <span className="font-semibold text-foreground">{resetEmail}</span>
                  </p>
                  <p className="text-muted-foreground text-xs pt-2">Click the link in your email to set a new password. Check spam if you don't see it.</p>
                </div>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full h-14 rounded-xl font-bold text-sm"
                    onClick={async () => {
                      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
                        redirectTo: `${window.location.origin}/reset-password`,
                      });
                      if (error) toast.error(error.message);
                      else toast.success("Reset link resent!");
                    }}
                  >
                    Resend link
                  </Button>
                  <button
                    onClick={() => setView("login")}
                    className="w-full text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Back to login
                  </button>
                </div>
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
