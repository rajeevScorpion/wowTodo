import { motion } from "motion/react"
import { SectionWrapper } from "@/components/SectionWrapper"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { User, Share2, Mic, CheckCircle2, Check } from "lucide-react"

export function Delegation() {
  return (
    <SectionWrapper id="how-it-works" className="py-32">
      <div className="text-center max-w-3xl mx-auto mb-20">
        <h2 className="text-4xl md:text-5xl font-semibold tracking-tight mb-6">
          Create once. <br />
          <span className="text-muted-foreground">Share cleanly.</span>
        </h2>
        <p className="text-xl text-muted-foreground">
          Delegation usually means a long messy text message and three follow-up calls.
          WowTodo turns your intent into a shared workspace instantly.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {/* Step 1 */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0 }}
            className="flex flex-col items-center text-center space-y-6"
        >
            <div className="w-16 h-16 rounded-2xl bg-background border border-border/50 flex items-center justify-center text-foreground shadow-soft">
                <Mic size={32} />
            </div>
            <h3 className="text-xl font-semibold">1. Speak your intent</h3>
            <p className="text-muted-foreground">
                "Ask Sarah to prepare the Q3 slides by Friday and schedule a review."
            </p>
        </motion.div>

        {/* Step 2 */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center text-center space-y-6"
        >
            <div className="w-16 h-16 rounded-2xl bg-background border border-border/50 flex items-center justify-center text-foreground shadow-soft">
                <Share2 size={32} />
            </div>
            <h3 className="text-xl font-semibold">2. Share the link</h3>
            <p className="text-muted-foreground">
                WowTodo structures it into a clear project and gives you a magic link.
            </p>
        </motion.div>

        {/* Step 3 */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="flex flex-col items-center text-center space-y-6"
        >
            <div className="w-16 h-16 rounded-2xl bg-background border border-border/50 flex items-center justify-center text-foreground shadow-soft">
                <CheckCircle2 size={32} />
            </div>
            <h3 className="text-xl font-semibold">3. Done together</h3>
            <p className="text-muted-foreground">
                Sarah sees clear steps. You see progress. No back-and-forth.
            </p>
        </motion.div>
      </div>

      {/* Visual Demo of Sharing */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="mt-24 max-w-4xl mx-auto bg-card rounded-3xl shadow-2xl border border-border overflow-hidden"
      >
        <div className="bg-muted/50 p-4 border-b border-border flex items-center gap-2">
            <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                <div className="w-3 h-3 rounded-full bg-green-400/80" />
            </div>
            <div className="ml-4 bg-background px-3 py-1 rounded-md text-xs text-muted-foreground flex-1 text-center font-mono">
                wowtodo.app/shared/project-q3-slides
            </div>
        </div>
        <div className="p-8 md:p-12 grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        You
                    </div>
                    <div className="text-sm text-muted-foreground">
                        assigned to <span className="font-semibold text-foreground">Sarah</span>
                    </div>
                </div>
                <h4 className="text-2xl font-semibold mb-2">Q3 Presentation Prep</h4>
                <p className="text-muted-foreground mb-6">Due Friday, Oct 24</p>
                <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl">
                        <div className="w-5 h-5 rounded border-2 border-primary bg-primary flex items-center justify-center">
                            <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                        <span className="line-through text-muted-foreground">Draft outline</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-background rounded-xl border border-border shadow-sm">
                        <div className="w-5 h-5 rounded border-2 border-muted-foreground/30" />
                        <span>Gather Q3 metrics</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-background rounded-xl border border-border shadow-sm">
                        <div className="w-5 h-5 rounded border-2 border-muted-foreground/30" />
                        <span>Finalize slide deck</span>
                    </div>
                </div>
            </div>
            <div className="flex flex-col justify-center items-center border-l border-border pl-12">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto bg-background border border-border/50 rounded-full flex items-center justify-center text-foreground shadow-soft">
                        <CheckCircle2 size={32} />
                    </div>
                    <h3 className="text-lg font-medium">Sarah completed a task</h3>
                    <p className="text-sm text-muted-foreground">
                        "Draft outline" was marked as done just now.
                    </p>
                    <Button variant="outline" size="sm" className="rounded-full">
                        Send "Great job!"
                    </Button>
                </div>
            </div>
        </div>
      </motion.div>
    </SectionWrapper>
  )
}


