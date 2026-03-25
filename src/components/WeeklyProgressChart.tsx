import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface WeekData {
  day: string;
  levels: number;
  score: number;
}

const WeeklyProgressChart = () => {
  const { user } = useAuth();
  const [data, setData] = useState<WeekData[]>([]);

  useEffect(() => {
    const fetchWeeklyData = async () => {
      if (!user) return;

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const { data: progress } = await supabase
        .from("user_progress")
        .select("completed_at, score, completed")
        .eq("user_id", user.id)
        .eq("completed", true)
        .gte("completed_at", weekAgo.toISOString());

      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const weekData: WeekData[] = [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dayStr = d.toISOString().split("T")[0];
        const dayItems = (progress || []).filter(
          (p) => p.completed_at && p.completed_at.startsWith(dayStr)
        );
        weekData.push({
          day: dayNames[d.getDay()],
          levels: dayItems.length,
          score: dayItems.reduce((sum, p) => sum + (p.score || 0), 0),
        });
      }

      setData(weekData);
    };

    fetchWeeklyData();
  }, [user]);

  if (data.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <h2 className="font-display text-sm font-bold">Weekly Progress</h2>
      <Tabs defaultValue="levels" className="w-full">
        <TabsList className="w-full grid grid-cols-2 h-8">
          <TabsTrigger value="levels" className="text-xs">Levels</TabsTrigger>
          <TabsTrigger value="scores" className="text-xs">Scores</TabsTrigger>
        </TabsList>
        <TabsContent value="levels" className="mt-3">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="levels" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </TabsContent>
        <TabsContent value="scores" className="mt-3">
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="hsl(var(--success))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--success))", r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WeeklyProgressChart;
