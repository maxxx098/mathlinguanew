import { useState, useEffect } from "react";
import { Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const JoinClassCard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [hasClass, setHasClass] = useState<boolean | null>(null);

  // Check if user already has a class
  useEffect(() => {
    if (!user) return;
    supabase
      .from("class_members")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .then(({ data }) => {
        setHasClass(data && data.length > 0);
      });
  }, [user]);

  const handleJoin = async () => {
    if (!user || !code.trim()) return;
    setJoining(true);
    try {
      const { data: classLookup } = await supabase.rpc("get_class_by_code", {
        _class_code: code.trim().toUpperCase(),
      });
      const classData = classLookup?.[0];
      if (!classData) {
        toast.error("Class not found. Check the code and try again.");
        setJoining(false);
        return;
      }
      const { error } = await supabase.from("class_members").insert({
        class_id: classData.id,
        user_id: user.id,
      });
      if (error) {
        if (error.code === "23505") toast.info("You're already in this class!");
        else toast.error("Failed to join class.");
      } else {
        toast.success(`Joined "${classData.name}"! 🎉`);
        setHasClass(true);
        navigate("/class");
      }
    } catch {
      toast.error("Something went wrong.");
    }
    setJoining(false);
  };

  // Don't show if already in a class or still loading
  if (hasClass !== false) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-black text-foreground">Join a Class</p>
          <p className="text-[11px] font-semibold text-muted-foreground">
            Connect with your teacher & classmates
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Enter class code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="font-bold tracking-widest text-center uppercase"
          maxLength={7}
        />
        <Button
          size="sm"
          onClick={handleJoin}
          disabled={!code.trim() || joining}
          className="gap-1 px-4"
        >
          Join <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default JoinClassCard;
