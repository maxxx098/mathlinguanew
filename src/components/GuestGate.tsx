import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface GuestGateProps {
  children: (handleAction: () => boolean) => React.ReactNode;
}

const GuestGate = ({ children }: GuestGateProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const handleAction = (): boolean => {
    if (user) return true;
    setOpen(true);
    return false;
  };

  return (
    <>
      {children(handleAction)}
      <GuestGateDialog open={open} onOpenChange={setOpen} />
    </>
  );
};

export const GuestGateDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) => {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader className="items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
            <Lock className="h-7 w-7" />
          </div>
          <DialogTitle className="font-display text-lg">Oops! Login Required</DialogTitle>
          <DialogDescription className="text-sm">
            You need to create an account or log in to access this feature. It only takes a moment!
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-2">
          <Button className="w-full gap-2" onClick={() => { onOpenChange(false); navigate("/auth"); }}>
            <LogIn className="h-4 w-4" /> Sign Up / Log In
          </Button>
          <Button variant="ghost" className="w-full text-sm" onClick={() => onOpenChange(false)}>
            Continue Browsing
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const useGuestGate = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const checkAuth = useCallback((): boolean => {
    if (user) return true;
    setOpen(true);
    return false;
  }, [user]);

  return { checkAuth, gateOpen: open, setGateOpen: setOpen };
};

export default GuestGate;
