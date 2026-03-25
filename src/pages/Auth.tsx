import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, GraduationCap, Users, ArrowRight, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Onboarding from "@/components/Onboarding";

type AuthView = "welcome" | "login" | "register" | "role-select" | "onboarding";
type UserRole = "teacher" | "learner";

const Auth = () => {
  const navigate = useNavigate();
  const { user, setIsGuest } = useAuth();
  const [view, setView] = useState<AuthView>("welcome");
  const [role, setRole] = useState<UserRole | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [classCode, setClassCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGuestMode = () => {
    localStorage.setItem("algebra-bridge-guest", "true");
    setIsGuest(true);
    navigate("/");
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
      email,
      password,
      options: {
        data: { display_name: `${firstName} ${lastName}` },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase.from("user_roles").insert({ user_id: data.user.id, role: (role || "learner") as any });

      await supabase.from("profiles").update({
        first_name: firstName,
        last_name: lastName,
        display_name: `${firstName} ${lastName}`,
      }).eq("user_id", data.user.id);

      if (classCode.trim() && role === "learner") {
        const { data: classLookup } = await supabase
          .rpc("get_class_by_code", { _class_code: classCode.trim().toUpperCase() });
        const classData = classLookup?.[0];
        if (classData) {
          await supabase.from("class_members").insert({
            class_id: classData.id,
            user_id: data.user.id,
          });
        }
      }

      toast.success("Account created! Check your email to verify.");
      setView("onboarding");
    }
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const form = e.target as HTMLFormElement;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success("Welcome back!");
    navigate("/");
    setLoading(false);
  };

  const slideVariants = {
    enter: { x: 40, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -40, opacity: 0 },
  };

  const handleOnboardingComplete = async () => {
    if (user) {
      await supabase.from("profiles").update({ onboarding_completed: true }).eq("user_id", user.id);
    }
    navigate("/");
  };

  if (view === "onboarding") {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          {view === "welcome" && (
            <motion.div key="welcome" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="space-y-6 text-center">
              <div className="space-y-3">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25">
                  <BookOpen className="h-8 w-8 text-primary-foreground" />
                </div>
                <h1 className="font-display text-3xl font-bold tracking-tight">Mathlingua</h1>
                <p className="text-sm text-muted-foreground">Master algebraic translations step by step</p>
              </div>
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <Button size="lg" className="w-full gap-2 font-semibold" onClick={() => setView("login")}>
                    Log In <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button size="lg" variant="outline" className="w-full gap-2 font-semibold" onClick={() => setView("role-select")}>
                    Create Account
                  </Button>
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-3 text-muted-foreground">or</span></div>
                  </div>
                  <Button size="lg" variant="ghost" className="w-full text-muted-foreground" onClick={handleGuestMode}>
                    Continue as Guest
                  </Button>
                </CardContent>
              </Card>
              <p className="text-xs text-muted-foreground">Guest mode lets you try a few levels. Create an account to save progress.</p>
            </motion.div>
          )}

          {view === "login" && (
            <motion.div key="login" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
              <button onClick={() => setView("welcome")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Welcome back</CardTitle>
                  <CardDescription>Log in to continue learning</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" name="email" type="email" placeholder="you@example.com" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input id="password" name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" required />
                        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <Button type="submit" size="lg" className="w-full font-semibold" disabled={loading}>
                      {loading ? "Logging in..." : "Log In"}
                    </Button>
                  </form>
                  <p className="text-center text-sm text-muted-foreground mt-4">
                    Don't have an account?{" "}
                    <button onClick={() => setView("role-select")} className="text-primary font-medium hover:underline">Sign up</button>
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {view === "role-select" && (
            <motion.div key="role-select" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
              <button onClick={() => setView("welcome")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">I am a...</CardTitle>
                  <CardDescription>Choose your role to get started</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => { setRole("learner"); setView("register"); }}
                      className="group flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all hover:border-primary hover:shadow-md border-border">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success transition-transform group-hover:scale-110">
                        <GraduationCap className="h-7 w-7" />
                      </div>
                      <div className="text-center">
                        <p className="font-display font-bold">Learner</p>
                        <p className="text-xs text-muted-foreground">Study & practice</p>
                      </div>
                    </button>
                    <button onClick={() => { setRole("teacher"); setView("register"); }}
                      className="group flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all hover:border-primary hover:shadow-md border-border">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110">
                        <Users className="h-7 w-7" />
                      </div>
                      <div className="text-center">
                        <p className="font-display font-bold">Teacher</p>
                        <p className="text-xs text-muted-foreground">Manage classes</p>
                      </div>
                    </button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {view === "register" && (
            <motion.div key="register" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
              <button onClick={() => setView("role-select")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Create your {role === "teacher" ? "Teacher" : "Learner"} account</CardTitle>
                  <CardDescription>Fill in your details to get started</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2"><Label htmlFor="firstName">First name</Label><Input id="firstName" name="firstName" placeholder="Juan" required /></div>
                      <div className="space-y-2"><Label htmlFor="lastName">Last name</Label><Input id="lastName" name="lastName" placeholder="Dela Cruz" required /></div>
                    </div>
                    <div className="space-y-2"><Label htmlFor="reg-email">Email</Label><Input id="reg-email" name="reg-email" type="email" placeholder="you@example.com" required /></div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-password">Password</Label>
                      <div className="relative">
                        <Input id="reg-password" name="reg-password" type={showPassword ? "text" : "password"} placeholder="••••••••" required />
                        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    {role === "learner" && (
                      <div className="space-y-2">
                        <Label htmlFor="classCode">Class Code (optional)</Label>
                        <Input id="classCode" placeholder="e.g. ABC-1234" value={classCode} onChange={(e) => setClassCode(e.target.value)} />
                        <p className="text-xs text-muted-foreground">Enter a code from your teacher to join a class, or skip to study independently.</p>
                      </div>
                    )}
                    <Button type="submit" size="lg" className="w-full font-semibold" disabled={loading}>
                      {loading ? "Creating..." : "Create Account"}
                    </Button>
                  </form>
                  <p className="text-center text-sm text-muted-foreground mt-4">
                    Already have an account?{" "}
                    <button onClick={() => setView("login")} className="text-primary font-medium hover:underline">Log in</button>
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Auth;
