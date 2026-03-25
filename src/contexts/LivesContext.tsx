import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface LivesContextType {
  lives: number;
  maxLives: number;
  loseLife: () => Promise<boolean>; // returns false if no lives left
  refillLives: () => Promise<void>;
  nextRefillSeconds: number | null;
  loading: boolean;
}

const LivesContext = createContext<LivesContextType>({
  lives: 5,
  maxLives: 5,
  loseLife: async () => true,
  refillLives: async () => {},
  nextRefillSeconds: null,
  loading: true,
});

export const useLives = () => useContext(LivesContext);

const MAX_LIVES = 5;
const REFILL_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes per heart

const getRefillState = (currentLives: number, lastLost: string | null, now = Date.now()) => {
  if (currentLives >= MAX_LIVES || !lastLost) {
    return { lives: currentLives, nextRefillSeconds: null };
  }

  const elapsed = Math.max(0, now - new Date(lastLost).getTime());
  const recovered = Math.floor(elapsed / REFILL_INTERVAL_MS);
  const nextLives = Math.min(MAX_LIVES, currentLives + recovered);

  if (nextLives >= MAX_LIVES) {
    return { lives: nextLives, nextRefillSeconds: null };
  }

  const remainder = elapsed % REFILL_INTERVAL_MS;
  const msUntilNext = REFILL_INTERVAL_MS - remainder;

  return {
    lives: nextLives,
    nextRefillSeconds: Math.ceil(msUntilNext / 1000),
  };
};

export const LivesProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [lives, setLives] = useState(MAX_LIVES);
  const [lastLostAt, setLastLostAt] = useState<string | null>(null);
  const [nextRefillSeconds, setNextRefillSeconds] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const syncRefillState = useCallback((currentLives: number, lastLost: string | null, now = Date.now()) => {
    const refillState = getRefillState(currentLives, lastLost, now);
    setLives(refillState.lives);
    setLastLostAt(lastLost);
    setNextRefillSeconds(refillState.nextRefillSeconds);
    return refillState;
  }, []);

  const fetchLives = useCallback(async () => {
    if (!user) {
      setLives(MAX_LIVES);
      setLastLostAt(null);
      setNextRefillSeconds(null);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("user_lives")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      const refillState = syncRefillState(data.lives, data.last_lost_at);

      if (refillState.lives !== data.lives) {
        await supabase.from("user_lives").update({
          lives: refillState.lives,
          updated_at: new Date().toISOString(),
        }).eq("user_id", user.id);
      }
    } else {
      await supabase.from("user_lives").insert({
        user_id: user.id,
        lives: MAX_LIVES,
      });
      setLives(MAX_LIVES);
      setLastLostAt(null);
      setNextRefillSeconds(null);
    }

    setLoading(false);
  }, [user, syncRefillState]);

  useEffect(() => { fetchLives(); }, [fetchLives]);

  useEffect(() => {
    if (lives >= MAX_LIVES || !lastLostAt) {
      setNextRefillSeconds(null);
      return;
    }

    const tick = async () => {
      const refillState = getRefillState(lives, lastLostAt);
      setLives(refillState.lives);
      setNextRefillSeconds(refillState.nextRefillSeconds);

      if (user && refillState.lives !== lives) {
        await supabase.from("user_lives").update({
          lives: refillState.lives,
          updated_at: new Date().toISOString(),
        }).eq("user_id", user.id);
      }
    };

    void tick();
    const timer = window.setInterval(() => { void tick(); }, 1000);
    return () => window.clearInterval(timer);
  }, [lives, lastLostAt, user]);

  const loseLife = async () => {
    if (lives <= 0) return false;

    const newLives = lives - 1;
    const now = new Date().toISOString();
    const refillState = syncRefillState(newLives, now, Date.now());

    if (user) {
      await supabase.from("user_lives").update({
        lives: refillState.lives,
        last_lost_at: now,
        updated_at: now,
      }).eq("user_id", user.id);
    }

    return true;
  };

  const refillLives = async () => {
    setLives(MAX_LIVES);
    setLastLostAt(null);
    setNextRefillSeconds(null);

    if (user) {
      await supabase.from("user_lives").update({
        lives: MAX_LIVES,
        last_lost_at: null,
        updated_at: new Date().toISOString(),
      }).eq("user_id", user.id);
    }
  };

  return (
    <LivesContext.Provider value={{ lives, maxLives: MAX_LIVES, loseLife, refillLives, nextRefillSeconds, loading }}>
      {children}
    </LivesContext.Provider>
  );
};
