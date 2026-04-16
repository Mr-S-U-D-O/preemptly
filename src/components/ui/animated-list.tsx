"use client"

import React, {
  useMemo,
  type ComponentPropsWithoutRef,
} from "react"
import { AnimatePresence, motion, type MotionProps } from "motion/react"

import { cn } from "@/lib/utils"

export function AnimatedListItem({ children }: { children: React.ReactNode }) {
  const animations: MotionProps = {
    initial: { scale: 0.9, opacity: 0, x: 200 },
    animate: { scale: 1, opacity: 1, x: 0, originX: 1 },
    exit: { scale: 0.9, opacity: 0, x: 200 },
    transition: { type: "spring", stiffness: 300, damping: 30 },
  }

  return (
    <motion.div {...animations} layout className="mx-auto w-full">
      {children}
    </motion.div>
  )
}

export interface AnimatedListProps extends ComponentPropsWithoutRef<"div"> {
  children: React.ReactNode
}

export const AnimatedList = React.memo(
  ({ children, className, ...props }: AnimatedListProps) => {
    const childrenArray = useMemo(
      () => React.Children.toArray(children),
      [children]
    )

    return (
      <div
        className={cn(`flex flex-col items-center gap-4`, className)}
        {...props}
      >
        <AnimatePresence mode="popLayout">
          {childrenArray.map((item) => (
            <AnimatedListItem key={(item as React.ReactElement).key}>
              {item}
            </AnimatedListItem>
          ))}
        </AnimatePresence>
      </div>
    )
  }
)

AnimatedList.displayName = "AnimatedList"
