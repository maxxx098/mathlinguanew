import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Heart, MessageCircle, ClipboardList, Flame, Trophy, Users, X, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const fetchAndMarkRead = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("notifications").select("*").eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(30);
      if (data) {
        setNotifications(data);
        const unreadIds = data.filter(n => !n.read).map(n => n.id);
        if (unreadIds.length > 0) {
          await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
        }
      }
    };
    fetchAndMarkRead();
  }, [user]);

  const deleteOne = async (id: string) => {
     setNotifications(prev => prev.filter(n => n.id !== id));
     const { error } = await supabase.from("notifications").delete().eq("id", id);
     if (error) console.error("Delete failed:", error.message); // check browser console
   };

  const deleteAll = async () => {
    if (!user) return;
    setNotifications([]); // optimistic
    await supabase.from("notifications").delete().eq("user_id", user.id);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "reaction":      return { icon: Heart,         color: "text-destructive" };
      case "assignment":    return { icon: ClipboardList,  color: "text-primary" };
      case "comment":       return { icon: MessageCircle,  color: "text-success" };
      case "streak":        return { icon: Flame,          color: "text-warning" };
      case "level_complete":return { icon: Trophy,         color: "text-success" };
      case "member_joined": return { icon: Users,          color: "text-primary" };
      default:              return { icon: Bell,           color: "text-warning" };
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="pb-24 pt-4 px-4 space-y-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <h1 className="font-display text-2xl font-bold">Notifications</h1>
        {notifications.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground gap-1.5 hover:text-destructive"
            onClick={deleteAll}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear all
          </Button>
        )}
      </motion.div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {notifications.map((n, idx) => {
              const { icon: Icon, color } = getIcon(n.type);
              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 40, height: 0, marginBottom: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  exit-transition={{ duration: 0.2 }}
                >
                  <Card className={!n.read ? "border-primary/20 bg-primary/5" : "opacity-70"}>
                    <CardContent className="py-3 px-4 flex items-start gap-3">
                      <div className={`mt-0.5 ${color}`}><Icon className="h-4 w-4" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{n.content}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(n.created_at)}</p>
                      </div>
                      {!n.read && <Badge variant="default" className="text-[10px] px-1.5 py-0">New</Badge>}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => deleteOne(n.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default Notifications;