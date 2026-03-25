import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { LivesProvider } from "@/contexts/LivesContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import AppLayout from "@/layouts/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Class from "./pages/Class";
import Community from "./pages/Community";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import Badges from "./pages/Badges";
import Activity from "./pages/Activity";
import Settings from "./pages/Settings";
import StudentProfile from "./pages/StudentProfile";
import Guide from "./pages/Guide";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <LivesProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/activity/:levelId" element={<Activity />} />
              <Route element={<AppLayout />}>
                <Route path="/" element={<Index />} />
                <Route path="/class" element={<Class />} />
                <Route path="/community" element={<Community />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/badges" element={<Badges />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/guide" element={<Guide />} />
                <Route path="/student/:userId" element={<StudentProfile />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
            </LivesProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
