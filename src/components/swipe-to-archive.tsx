"use client";

import { useRef } from "react";
import { motion } from "motion/react";
import { Archive, ArchiveRestore } from "lucide-react";
import { cn } from "@/lib/utils";

// How far (px) or how fast (px/s) a card must be dragged sideways to count.
const SWIPE_DISTANCE = 110;
const SWIPE_VELOCITY = 600;

interface SwipeToArchiveProps {
  // True when the item is already archived: the swipe then restores it.
  archived?: boolean;
  onArchive: () => void;
  // Renders the card as is, with no swipe (when archiving is not offered).
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

// Wraps a list card so that dragging it to either side archives it.
export function SwipeToArchive({
  archived = false,
  onArchive,
  disabled = false,
  className,
  children,
}: SwipeToArchiveProps) {
  // A drag ends with a click on whatever is under the finger; this swallows it.
  const dragged = useRef(false);
  const Icon = archived ? ArchiveRestore : Archive;
  const label = archived ? "Desarquivar" : "Arquivar";

  if (disabled) return <div className={className}>{children}</div>;

  return (
    <div className={cn("relative overflow-hidden rounded-xl", className)}>
      <div className="absolute inset-0 flex items-center justify-between rounded-xl bg-muted px-4 text-xs font-medium text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Icon className="h-4 w-4" />
          {label}
        </span>
        <span className="flex items-center gap-1.5">
          {label}
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        dragSnapToOrigin
        onDragStart={() => {
          dragged.current = true;
        }}
        onDragEnd={(_event, info) => {
          setTimeout(() => {
            dragged.current = false;
          }, 0);
          if (
            Math.abs(info.offset.x) > SWIPE_DISTANCE ||
            Math.abs(info.velocity.x) > SWIPE_VELOCITY
          ) {
            onArchive();
          }
        }}
        onClickCapture={(event) => {
          if (dragged.current) {
            event.stopPropagation();
            event.preventDefault();
          }
        }}
        className="relative rounded-xl bg-background"
      >
        {children}
      </motion.div>
    </div>
  );
}
