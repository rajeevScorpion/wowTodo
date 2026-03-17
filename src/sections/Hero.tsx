import { motion } from "motion/react"
import { Button } from "@/components/ui/button"
import { ArrowRight, Mic } from "lucide-react"
import { SectionWrapper } from "@/components/SectionWrapper"

export function Hero() {
  return (
    <SectionWrapper className="pt-32 pb-20 md:pt-48 md:pb-32 min-h-screen flex flex-col justify-center items-center text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-4xl mx-auto space-y-8"
      >
        <h1 className="text-5xl md:text-7xl font-semibold tracking-tight leading-[1.1] text-foreground">
          We have things to do.
          <br />
          <span className="text-muted-foreground">
            And we need people to do things for us.
          </span>
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto font-light">
          We’re just trying to make both easy.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
          <Button size="lg" className="rounded-full px-8 text-lg h-14 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all" asChild>
            <a href="/#cta" className="flex items-center">
              Try WowTodo
              <ArrowRight className="ml-2 w-5 h-5" />
            </a>
          </Button>
          <Button variant="ghost" size="lg" className="rounded-full px-8 text-lg h-14 hover:bg-secondary/50" asChild>
            <a href="/#how-it-works">
              See how it works
            </a>
          </Button>
        </div>
      </motion.div>

      {/* Hero Visual */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
        className="mt-20 relative w-full max-w-3xl mx-auto"
      >
        <div className="relative aspect-[16/10] bg-card/50 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-white/5 shadow-2xl overflow-hidden flex flex-col items-center justify-center p-8">
            {/* Abstract UI Representation */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent dark:from-white/5 pointer-events-none" />
            
            <motion.div 
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-8 relative"
            >
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-20" />
                <Mic className="w-8 h-8 text-primary" />
            </motion.div>

            <div className="space-y-4 w-full max-w-md">
                <div className="flex items-center justify-center gap-1 h-8 mb-2">
                  {[...Array(12)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 bg-primary rounded-full"
                      animate={{ height: ["20%", "100%", "20%"] }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: i * 0.15,
                      }}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-sm text-muted-foreground font-medium">
                    <span>Listening...</span>
                    <span>0:04</span>
                </div>
                <div className="text-2xl font-medium text-center pt-4">
                    "Plan a launch party for next Friday"
                </div>
            </div>
        </div>
        
        {/* Floating Elements */}
        <motion.div
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute -top-12 -right-12 w-24 h-24 bg-card rounded-2xl shadow-xl border border-white/20 dark:border-white/5 flex items-center justify-center z-10"
        >
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <span className="text-2xl">🎉</span>
            </div>
        </motion.div>

        <motion.div
            animate={{ y: [0, 20, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="absolute -bottom-8 -left-8 w-64 h-16 bg-card rounded-xl shadow-xl border border-white/20 dark:border-white/5 flex items-center px-4 gap-3 z-10"
        >
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400">
                JD
            </div>
            <div className="flex-1 h-2 bg-foreground/5 rounded-full" />
            <div className="w-4 h-4 rounded-full border-2 border-foreground/20" />
        </motion.div>

      </motion.div>
    </SectionWrapper>
  )
}
