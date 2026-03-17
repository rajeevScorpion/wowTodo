import { Navbar } from "@/components/Navbar"
import { Hero } from "@/sections/Hero"
import { ProblemSolution } from "@/sections/ProblemSolution"
import { Delegation } from "@/sections/Delegation"
import { Calm } from "@/sections/Calm"
import { UseCases } from "@/sections/UseCases"
import { CTA } from "@/sections/CTA"
import { Footer } from "@/components/Footer"
import { AmbientBackground } from "@/components/AmbientBackground"

export function Home() {
  return (
    <>
      <AmbientBackground />
      <Navbar />
      <main className="relative z-10">
        <Hero />
        <ProblemSolution />
        <Delegation />
        <Calm />
        <UseCases />
        <CTA />
      </main>
      <Footer />
    </>
  )
}
