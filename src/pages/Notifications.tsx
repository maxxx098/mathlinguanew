import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Heart, MessageCircle, ClipboardList, Flame, Trophy, Users, X, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
};

const getIcon = (type: string) => {
  switch (type) {
    case "reaction":       return { icon: Heart,        color: "text-rose-500",    bg: "bg-rose-500/10"    };
    case "assignment":     return { icon: ClipboardList, color: "text-blue-500",    bg: "bg-blue-500/10"    };
    case "comment":        return { icon: MessageCircle, color: "text-emerald-500", bg: "bg-emerald-500/10" };
    case "streak":         return { icon: Flame,         color: "text-orange-500",  bg: "bg-orange-500/10"  };
    case "level_complete": return { icon: Trophy,        color: "text-emerald-500", bg: "bg-emerald-500/10" };
    case "member_joined":  return { icon: Users,         color: "text-blue-500",    bg: "bg-blue-500/10"    };
    default:               return { icon: Bell,          color: "text-muted-foreground", bg: "bg-muted"     };
  }
};

const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const fetchAndMarkRead = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);
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
    await supabase.from("notifications").delete().eq("id", id);
  };

  const deleteAll = async () => {
    if (!user) return;
    setNotifications([]);
    await supabase.from("notifications").delete().eq("user_id", user.id);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="pb-28 min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.42, 0, 0.58, 1] }}
        className="px-5 pt-7 pb-4 border-b border-border/50 flex items-end justify-between"
      >
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {unreadCount} new
            </p>
          )}
        </div>
        {notifications.length > 0 && (
          <button
            onClick={deleteAll}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors pb-1"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            Clear all
          </button>
        )}
      </motion.div>

      {/* Empty state */}
      {notifications.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col items-center justify-center py-24 px-8 text-center gap-3"
        >
          <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center">
            <Bell className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
          </div>
          <p className="text-sm text-muted-foreground">You're all caught up</p>
        </motion.div>
      )}

      {/* List */}
      <div className="px-5 pt-2">
        <AnimatePresence initial={false}>
          {notifications.map((n, idx) => {
            const { icon: Icon, color, bg } = getIcon(n.type);
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: "hidden" }}
                transition={{
                  duration: 0.25,
                  delay: idx * 0.03,
                  ease: [0.42, 0, 0.58, 1],
                }}
                className={`flex items-start gap-3 py-4 border-b border-border/40 last:border-0 ${!n.read ? "" : "opacity-60"}`}
              >
                {/* Icon pill */}
                <div className={`h-8 w-8 rounded-xl ${bg} flex items-center justify-center shrink-0 mt-0.5`}>
                  <Icon className={`h-3.5 w-3.5 ${color}`} strokeWidth={1.75} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug">{n.content}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-muted-foreground">{timeAgo(n.created_at)}</span>
                    {!n.read && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                </div>

                {/* Dismiss */}
                <button
                  onClick={() => deleteOne(n.id)}
                  className="text-muted-foreground/40 hover:text-muted-foreground transition-colors p-1 -mr-1 shrink-0 mt-0.5"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Notifications;