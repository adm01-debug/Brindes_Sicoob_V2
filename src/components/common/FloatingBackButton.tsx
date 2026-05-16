import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BackButton } from "./BackButton";
import { useScrollDirection } from "@/hooks/useScroll";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

/**
 * Floating Back Button for mobile.
 * Appears when scrolling up or on deep navigation pages.
 */
export function FloatingBackButton() {
  const scrollDirection = useScrollDirection(50);
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  
  const isHome = location.pathname === "/";
  const isDeepPage = location.pathname.split("/").filter(Boolean).length >= 2;

  useEffect(() => {
    // Show if scrolling up and not on home, or always on deep pages when scrolling up
    const shouldShow = !isHome && (scrollDirection === "up" || window.scrollY < 100);
    setIsVisible(shouldShow);
  }, [scrollDirection, isHome, isDeepPage]);

  if (isHome) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="fixed bottom-24 left-4 z-50 sm:hidden"
        >
          <BackButton 
            variant="secondary" 
            size="lg" 
            showLabel={false}
            className={cn(
              "h-12 w-12 rounded-full shadow-lg border border-primary/20 bg-background/90 backdrop-blur-md",
              "ring-2 ring-primary/5 active:scale-90 transition-transform"
            )}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
