// hooks/useScrollDirection.ts
import { useEffect, useRef, useState } from "react";

export const useNavVisibility = (hideDelay = 2000) => {
  const [visible, setVisible] = useState(false);
  const lastScrollY = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;

      // Show nav on any scroll movement
      if (Math.abs(currentY - lastScrollY.current) > 5) {
        setVisible(true);
        lastScrollY.current = currentY;
      }

      // Reset the auto-hide timer on every scroll event
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setVisible(false), hideDelay);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [hideDelay]);

  return visible;
};