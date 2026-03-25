import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Settings = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);

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

      <Button className="w-full gap-2" onClick={handleSave} disabled={saving}>
        <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
};

export default Settings;
