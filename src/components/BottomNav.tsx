import { useLocation, useNavigate } from "react-router-dom";
import { Home, Users, MessageCircle, Bell, User } from "lucide-react";
import { motion } from "framer-motion";

const tabs = [
  { path: "/", label: "Home", icon: Home },
  { path: "/class", label: "Class", icon: Users },
  { path: "/community", label: "Community", icon: MessageCircle },
  { path: "/notifications", label: "Alerts", icon: Bell },
  { path: "/profile", label: "Profile", icon: User },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-md safe-area-bottom">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2 h-16">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;
          return (
          <button
  key={tab.path}
  onClick={() => navigate(tab.path)}
  className={`nav-tab relative flex flex-col items-center justify-center w-16 h-full ${
    isActive ? "nav-tab-active" : ""
  }`}
>
  {isActive && (
    <motion.div
      layoutId="nav-indicator"
      className="absolute top-0 left-0 right-0 mx-auto h-0.5 w-6 rounded-full bg-primary"
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    />
  )}
  <Icon className="h-5 w-5" />
  <span className="text-[10px] mt-0.5">{tab.label}</span>
</button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;