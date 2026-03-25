import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import LearningPath from "@/components/LearningPath";
import DailyChallenge from "@/components/DailyChallenge";
import { 
  Flame, Users, ClipboardList, TrendingUp, BookOpen, 
  Plus, Home, User, Bookmark, LayoutGrid, Award, Target, HelpCircle
} from "lucide-react";
import HeartsDisplay from "@/components/HeartsDisplay";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

const TeacherDashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ classCount: 0, studentCount: 0, assignmentCount: 0 });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    const fetchTeacherStats = async () => {
      if (!user) return;

      const [classesRes, assignmentsRes] = await Promise.all([
        supabase.from("classes").select("id").eq("teacher_id", user.id),
        supabase.from("assignments").select("id").eq("teacher_id", user.id),
      ]);

      const classIds = (classesRes.data || []).map(c => c.id);
      let studentCount = 0;

      if (classIds.length > 0) {
        const { data: members } = await supabase
          .from("class_members")
          .select("id")
          .in("class_id", classIds);
        studentCount = members?.length || 0;

        const { data: feed } = await supabase
          .from("class_feed")
          .select("*")
          .in("class_id", classIds)
          .order("created_at", { ascending: false })
          .limit(5);

        if (feed && feed.length > 0) {
          const userIds = [...new Set(feed.map(f => f.user_id))];
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, display_name")
            .in("user_id", userIds);
          const profileMap = Object.fromEntries(
            (profiles || []).map(p => [p.user_id, p.display_name])
          );
          setRecentActivity(feed.map(f => ({
            ...f,
            display_name: profileMap[f.user_id] || "Unknown",
          })));
        }
      }

      setStats({
        classCount: classesRes.data?.length || 0,
        studentCount,
        assignmentCount: assignmentsRes.data?.length || 0,
      });
    };
    fetchTeacherStats();
  }, [user]);

  const displayName = profile?.display_name || profile?.first_name || "Teacher";

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container max-w-2xl px-4 py-4">
          <motion.div 
            initial={{ opacity: 0, y: -8 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Welcome back</p>
              <h1 className="font-display text-xl font-bold mt-0.5">{displayName}</h1>
            </div>
            <div className="flex items-center gap-2">
              <HeartsDisplay />
              <Badge variant="secondary" className="gap-1">
                <Flame className="h-3.5 w-3.5 text-warning" />
                <span className="font-display text-xs font-bold">{stats.studentCount}</span>
              </Badge>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/guide")}>
                <HelpCircle className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container max-w-2xl px-4 py-6 space-y-6">
        {/* Main Stats Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-secondary">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardDescription>Your Overview</CardDescription>
                  <CardTitle className="text-xl">Teaching Dashboard</CardTitle>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{stats.studentCount}</div>
                  <p className="text-xs text-muted-foreground">Students</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-primary">{stats.classCount}</span>
                  <span className="text-sm text-muted-foreground">Classes</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-primary">{stats.assignmentCount}</span>
                  <span className="text-sm text-muted-foreground">Assignments</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Quick Actions</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => navigate("/class")}>
              <CardContent className="pt-6">
                <Users className="h-8 w-8 text-primary mb-3" />
                <h4 className="font-semibold mb-1">Classes</h4>
                <p className="text-xs text-muted-foreground">{stats.classCount} active</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => navigate("/class")}>
              <CardContent className="pt-6">
                <ClipboardList className="h-8 w-8 text-primary mb-3" />
                <h4 className="font-semibold mb-1">Assignments</h4>
                <p className="text-xs text-muted-foreground">{stats.assignmentCount} total</p>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="font-semibold mb-4">Recent Activity</h3>
          {recentActivity.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No activity yet</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                {recentActivity.map((item, index) => (
                  <div key={item.id}>
                    <div className="flex items-center gap-3 p-4">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{item.display_name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.display_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.content || item.action_type}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{timeAgo(item.created_at)}</span>
                    </div>
                    {index < recentActivity.length - 1 && <Separator />}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
};

const LearnerHome = () => {
  const { user, profile, isGuest } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ completed: 0, currentLevel: 1, total: 20 });
  const [showDailyChallenge, setShowDailyChallenge] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("user_progress")
        .select("level_id, completed")
        .eq("user_id", user.id)
        .eq("completed", true);

      if (data) {
        setStats(s => ({ ...s, completed: data.length, currentLevel: data.length + 1 }));
      }
    };
    fetchStats();
  }, [user]);

  const displayName = profile?.display_name || profile?.first_name || (isGuest ? "Guest" : "Learner");
  const progress = Math.round((stats.completed / stats.total) * 100);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container max-w-2xl px-4 py-4">
     <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Welcome back</p>
          <h1 className="font-display text-xl font-bold mt-0.5">{displayName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <HeartsDisplay />
          <Badge variant="secondary" className="gap-1">
            <Flame className="h-3.5 w-3.5 text-warning" />
            <span className="font-display text-xs font-bold">{stats.completed}</span>
          </Badge>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/guide")}>
            <HelpCircle className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
        </div>
      </div>

      <div className="container max-w-2xl px-4 py-6 space-y-6">
        {/* Main Course Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-secondary">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardDescription>Continue Learning</CardDescription>
                  <CardTitle className="text-xl">Algebra Course</CardTitle>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{progress}%</div>
                  <p className="text-xs text-muted-foreground">Complete</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-primary">{stats.total}</span>
                  <span className="text-sm text-muted-foreground">Lessons</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-primary">{stats.completed}/{stats.total}</span>
                  <span className="text-sm text-muted-foreground">Progress</span>
                </div>
              </div>
              <Progress value={progress} />
            </CardContent>
          </Card>
        </motion.div>

        {/* Daily Challenge Modal */}
        <DailyChallenge 
          open={showDailyChallenge} 
          onOpenChange={setShowDailyChallenge}
        />

        {/* Today's Challenge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Today's Challenge</h3>
            <Button variant="ghost" size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <Card className="cursor-pointer hover:bg-accent transition-colors">
              <CardContent className="pt-6">
                <div className="aspect-square bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                  <Award className="h-10 w-10 text-primary" />
                </div>
                <h4 className="font-semibold mb-1">Practice</h4>
                <p className="text-xs text-muted-foreground">{stats.currentLevel} problems</p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => setShowDailyChallenge(true)}
            >
              <CardContent className="pt-6">
                <div className="aspect-square bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                  <Target className="h-10 w-10 text-primary" />
                </div>
                <h4 className="font-semibold mb-1">Quiz</h4>
                <p className="text-xs text-muted-foreground">1 question</p>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Learning Path */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="font-semibold mb-4">Learning Path</h3>
          <LearningPath />
        </motion.div>
      </div>
    </div>
  );
};

const Index = () => {
  const { userRole } = useAuth();

  if (userRole === "teacher") {
    return <TeacherDashboard />;
  }

  return <LearnerHome />;
};

export default Index;