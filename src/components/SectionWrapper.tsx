import React from "react"
import { cn } from "@/lib/utils"
import { motion } from "motion/react"

interface SectionWrapperProps {
  children: React.ReactNode
  className?: string
  id?: string
  fullWidth?: boolean
}

export function SectionWrapper({
  children,
  className,
  id,
  fullWidth = false,
}: SectionWrapperProps) {
  return (
    <section
      id={id}
      className={cn("py-24 relative overflow-hidden", className)}
    >
      <div
        className={cn(
          "mx-auto px-6 relative z-10",
          fullWidth ? "max-w-none" : "max-w-7xl"
        )}
      >
        {children}
      </div>
    </section>
  )
}
