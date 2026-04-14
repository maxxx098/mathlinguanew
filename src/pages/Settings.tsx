import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Settings = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    display_name: "", first_name: "", last_name: "",
    age_range: "", motivation: "",
    privacy_show_progress: true, privacy_show_stats: true,
  });

  useEffect(() => {
    if (profile) {
      setForm({
        display_name: profile.display_name || "",
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        age_range: profile.age_range || "",
        motivation: profile.motivation || "",
        privacy_show_progress: profile.privacy_show_progress ?? true,
        privacy_show_stats: profile.privacy_show_stats ?? true,
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: form.display_name, first_name: form.first_name,
      last_name: form.last_name, age_range: form.age_range,
      motivation: form.motivation, privacy_show_progress: form.privacy_show_progress,
      privacy_show_stats: form.privacy_show_stats,
    }).eq("user_id", user.id);
    setSaving(false);
    if (error) { toast.error("Failed to save settings"); }
    else { toast.success("Settings saved!"); await refreshProfile(); }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Not authenticated"); setDeleting(false); return; }

      const res = await supabase.functions.invoke("delete-account", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.error) {
        toast.error("Failed to delete account");
        setDeleting(false);
        return;
      }

      toast.success("Account deleted successfully");
      await signOut();
      navigate("/auth");
    } catch {
      toast.error("Something went wrong");
      setDeleting(false);
    }
  };

  return (
    <div className="pb-24 pt-4 px-4 space-y-4">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-display text-xl font-bold">Settings & Privacy</h1>
      </motion.div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Profile Information</CardTitle>
          <CardDescription>Update how others see you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display_name">Display Name</Label>
            <Input id="display_name" value={form.display_name} onChange={(e) => setForm(f => ({ ...f, display_name: e.target.value }))} placeholder="How others see you" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input id="first_name" value={form.first_name} onChange={(e) => setForm(f => ({ ...f, first_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input id="last_name" value={form.last_name} onChange={(e) => setForm(f => ({ ...f, last_name: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="age_range">Age Range</Label>
            <Input id="age_range" value={form.age_range} onChange={(e) => setForm(f => ({ ...f, age_range: e.target.value }))} placeholder="e.g. 13-17, 18-24" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="motivation">Motivation</Label>
            <Input id="motivation" value={form.motivation} onChange={(e) => setForm(f => ({ ...f, motivation: e.target.value }))} placeholder="Why are you learning algebra?" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Privacy Settings</CardTitle>
          <CardDescription>Control what others can see</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Show Progress to Classmates</p>
              <p className="text-xs text-muted-foreground">Others can see your learning progress</p>
            </div>
            <Switch checked={form.privacy_show_progress} onCheckedChange={(v) => setForm(f => ({ ...f, privacy_show_progress: v }))} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Show Stats on Leaderboard</p>
              <p className="text-xs text-muted-foreground">Your scores appear on class leaderboards</p>
            </div>
            <Switch checked={form.privacy_show_stats} onCheckedChange={(v) => setForm(f => ({ ...f, privacy_show_stats: v }))} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Appearance</CardTitle>
          <CardDescription>Customize the look of the app</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>

      <Button className="w-full gap-2" onClick={handleSave} disabled={saving}>
        <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Changes"}
      </Button>

      {/* Danger Zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-sm text-destructive">Danger Zone</CardTitle>
          <CardDescription>Permanently delete your account and all data</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full gap-2" disabled={deleting}>
                <Trash2 className="h-4 w-4" /> {deleting ? "Deleting..." : "Delete My Account"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete your account, progress, badges, and all associated data. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Yes, Delete My Account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
