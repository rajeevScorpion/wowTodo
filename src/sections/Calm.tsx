import { motion } from "motion/react"
import { SectionWrapper } from "@/components/SectionWrapper"

export function Calm() {
  return (
    <SectionWrapper className="py-40 bg-gradient-to-b from-background to-secondary/20">
      <div className="max-w-4xl mx-auto text-center space-y-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        >
          <h2 className="text-4xl md:text-6xl font-light tracking-tight text-foreground/80">
            When tasks are clear, <br />
            <span className="font-serif italic text-foreground">life feels lighter.</span>
          </h2>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, delay: 0.5 }}
          className="w-24 h-24 mx-auto rounded-full bg-blue-50 dark:bg-blue-900/10 blur-xl animate-pulse"
        />
        
        <p className="text-lg md:text-xl text-muted-foreground font-light max-w-2xl mx-auto">
            No more mental clutter. No more forgotten promises. <br />
            Just a calm, clear path forward.
        </p>
      </div>
    </SectionWrapper>
  )
}
