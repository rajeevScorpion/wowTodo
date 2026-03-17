import { motion } from "motion/react"
import { SectionWrapper } from "@/components/SectionWrapper"
import { Card } from "@/components/ui/card"
import { Check, ArrowRight } from "lucide-react"

export function ProblemSolution() {
  return (
    <SectionWrapper id="features" className="py-32 bg-secondary/30">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
        
        {/* Left: The Problem */}
        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight mb-6">
              Thoughts are messy. <br />
              <span className="text-muted-foreground">Execution shouldn’t be.</span>
            </h2>
            <p className="text-xl text-muted-foreground leading-relaxed">
              We usually capture tasks in a panic. A scribbled note. A voice memo while driving. A text to ourselves.
              <br /><br />
              But raw thoughts aren't actionable. They're just noise until they're structured.
            </p>
          </motion.div>

          <div className="relative p-8 bg-background rounded-3xl border border-border shadow-sm rotate-[-2deg] max-w-md mx-auto lg:mx-0">
            <div className="font-handwriting text-2xl text-muted-foreground/80 leading-loose font-serif italic">
              "Need to plan my sister's bday dinner next week, maybe italian? invite mom and dad, check if they're free tuesday, also need to order a cake... gluten free"
            </div>
            <div className="absolute -top-4 -right-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-1 rounded-full text-sm font-medium transform rotate-12">
              Messy Input
            </div>
          </div>
        </div>

        {/* Right: The Solution (Transformation) */}
        <div className="relative">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="h-px bg-border flex-1" />
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
                Becomes
              </div>
              <div className="h-px bg-border flex-1" />
            </div>

            <Card className="p-0 overflow-hidden border-primary/10 shadow-2xl bg-card/80 backdrop-blur-sm">
              <div className="bg-primary/5 p-4 border-b border-primary/5 flex justify-between items-center">
                <span className="font-semibold text-sm">Sister's Birthday Plan</span>
                <span className="text-xs text-muted-foreground bg-primary/10 px-2 py-1 rounded-md">Project</span>
              </div>
              <div className="divide-y divide-border/40">
                {[
                  "Check parents' availability for Tuesday",
                  "Research Italian restaurants with GF options",
                  "Make dinner reservation",
                  "Order gluten-free cake",
                  "Send calendar invites"
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 + (i * 0.1) }}
                    className="p-4 flex items-start gap-3 hover:bg-primary/5 transition-colors group cursor-pointer"
                  >
                    <div className="mt-1 w-5 h-5 rounded-full border-2 border-muted-foreground/30 group-hover:border-primary transition-colors flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <span className="text-foreground/80 group-hover:text-foreground transition-colors">{item}</span>
                  </motion.div>
                ))}
              </div>
            </Card>
            
            <div className="text-center">
                <p className="text-sm text-muted-foreground mt-4">
                    WowTodo understands intent, dependencies, and context.
                </p>
            </div>
          </motion.div>
        </div>

      </div>
    </SectionWrapper>
  )
}
