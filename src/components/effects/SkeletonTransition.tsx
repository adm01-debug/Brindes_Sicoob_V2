import { type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SkeletonTransitionProps {
  children: ReactNode;
  isLoading: boolean;
  fallback: ReactNode;
}

/**
 * SkeletonTransition
 * ------------------
 * Transição suave entre o estado de carregamento (skeleton) e o conteúdo real.
 * Evita o "flash" de conteúdo ao carregar e suaviza a troca de layout.
 */
export function SkeletonTransition({
  children,
  isLoading,
  fallback,
}: SkeletonTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div
          key="skeleton"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full"
        >
          {fallback}
        </motion.div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0, scale: 0.99, filter: "blur(2px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-full"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
