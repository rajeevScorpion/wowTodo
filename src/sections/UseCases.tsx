import { motion } from "motion/react"
import { SectionWrapper } from "@/components/SectionWrapper"
import { Card } from "@/components/ui/card"
import { Briefcase, GraduationCap, Home, Users } from "lucide-react"

const useCases = [
  {
    icon: <Briefcase className="w-6 h-6" />,
    title: "Professionals",
    description: "Delegate updates to your team without scheduling a meeting.",
    example: "Ask John to update the Q3 report by Friday."
  },
  {
    icon: <Home className="w-6 h-6" />,
    title: "Parents",
    description: "Coordinate household chaos into a shared plan.",
    example: "Plan the weekend trip and share the packing list."
  },
  {
    icon: <GraduationCap className="w-6 h-6" />,
    title: "Students",
    description: "Break down big assignments into manageable steps.",
    example: "Help me plan my thesis research schedule."
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "Founders",
    description: "Turn rapid-fire ideas into structured execution.",
    example: "Outline the launch strategy for next month."
  }
]

export function UseCases() {
  return (
    <SectionWrapper id="use-cases" className="py-32">
      <div className="mb-20">
        <h2 className="text-4xl md:text-5xl font-semibold tracking-tight mb-6">
          Built for real life.
        </h2>
        <p className="text-xl text-muted-foreground max-w-2xl">
          Whether you're managing a team or a household, WowTodo adapts to your context.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {useCases.map((useCase, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="h-full p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-secondary/10 border-border/50">
              <div className="w-12 h-12 rounded-xl bg-background shadow-sm flex items-center justify-center mb-6 text-foreground">
                {useCase.icon}
              </div>
              <h3 className="text-xl font-semibold mb-3">{useCase.title}</h3>
              <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
                {useCase.description}
              </p>
              <div className="bg-background/50 p-3 rounded-lg text-xs font-mono text-muted-foreground border border-border/50">
                "{useCase.example}"
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </SectionWrapper>
  )
}
