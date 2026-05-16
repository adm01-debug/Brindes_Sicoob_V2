import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Top loading progress bar that reacts to route changes.
 */
export function RouteLoadingBar() {
  const location = useLocation();
  const [isAnimating, setIsActive] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setIsActive(true);
    setProgress(30);

    const timer1 = setTimeout(() => setProgress(60), 200);
    const timer2 = setTimeout(() => setProgress(90), 400);
    const timer3 = setTimeout(() => {
      setProgress(100);
      setTimeout(() => {
        setIsActive(false);
        setProgress(0);
      }, 200);
    }, 600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [location.pathname]);

  return (
    <AnimatePresence>
      {isAnimating && (
        <motion.div
          initial={{ scaleX: 0, opacity: 1, originX: 0 }}
          animate={{ scaleX: progress / 100, opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="fixed top-0 left-0 right-0 h-[3px] bg-brand z-[100] shadow-[0_0_8px_rgba(var(--brand-rgb),0.5)]"
        />
      )}
    </AnimatePresence>
  );
}
