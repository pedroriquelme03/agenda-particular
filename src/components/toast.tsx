"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";

export interface ToastMessage {
  id: number;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: (id: number) => void;
  // Seconds on screen; the bar at the bottom drains over this time.
  duration?: number;
}

// Short confirmation that slides up from the bottom and removes itself.
// Dragging it down dismisses it early.
export function Toast({ toast, onDismiss, duration = 2.5 }: ToastProps) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          role="status"
          initial={{ y: 48, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 48, opacity: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.7 }}
          onDragEnd={(_event, info) => {
            if (info.offset.y > 40 || info.velocity.y > 300) onDismiss(toast.id);
          }}
          className="touch-none fixed inset-x-4 bottom-[calc(9.5rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-sm overflow-hidden rounded-xl bg-foreground text-background shadow-lg"
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 500, damping: 18 }}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background text-foreground"
            >
              <Check className="h-3.5 w-3.5" />
            </motion.span>
            <span className="min-w-0 flex-1 text-sm font-medium">{toast.text}</span>
            {toast.actionLabel && toast.onAction && (
              <button
                onClick={toast.onAction}
                className="shrink-0 text-sm font-semibold underline underline-offset-2"
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
          <motion.div
            className="h-1 origin-left bg-background/60"
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration, ease: "linear" }}
            onAnimationComplete={() => onDismiss(toast.id)}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
