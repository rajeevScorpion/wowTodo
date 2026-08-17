import { useState } from "react"
import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { AmbientBackground } from "@/components/AmbientBackground"
import { SectionWrapper } from "@/components/SectionWrapper"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Check } from "lucide-react"

export function Pricing() {
  const [isYearly, setIsYearly] = useState(false)

  const monthlyPrice = 115
  const yearlyPricePerMonth = Math.round(monthlyPrice * 0.8) // 92
  const yearlyTotal = yearlyPricePerMonth * 12 // 1104

  return (
    <>
      <AmbientBackground />
      <Navbar />
      <main className="relative z-10 pt-32 pb-24">
        <SectionWrapper>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="text-4xl md:text-6xl font-semibold tracking-tight mb-6">
              Simple, transparent pricing.
            </h1>
            <p className="text-xl text-muted-foreground">
              Start for free. Upgrade when you need more power.
            </p>
          </div>

          <div className="flex justify-center mb-12">
            <div className="bg-secondary/50 p-1 rounded-full flex items-center border border-border/50 shadow-inner-soft">
              <button
                onClick={() => setIsYearly(false)}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${!isYearly ? 'bg-background shadow-soft text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsYearly(true)}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${isYearly ? 'bg-background shadow-soft text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Yearly <span className="text-[10px] bg-green-500 text-white dark:bg-green-600 px-2 py-0.5 rounded-full font-bold tracking-wide">Save 20%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <Card className="p-8 border-border/50 bg-background/50 backdrop-blur-sm flex flex-col">
              <h3 className="text-2xl font-semibold mb-2">Free</h3>
              <p className="text-muted-foreground mb-6">Perfect for personal use and small projects.</p>
              <div className="mb-8">
                <span className="text-5xl font-semibold">INR 0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>10 AI transcriptions (task creations) per day</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>Share tasks with up to 10 people</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>Basic analytics</span>
                </li>
              </ul>
              <Button variant="outline" className="w-full rounded-xl h-12">Get Started for Free</Button>
            </Card>

            {/* Paid Plan */}
            <Card className="p-8 border-primary/20 bg-card shadow-2xl relative flex flex-col">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">
                Most Popular
              </div>
              <h3 className="text-2xl font-semibold mb-2">Pro</h3>
              <p className="text-muted-foreground mb-6">For power users and teams who need more.</p>
              <div className="mb-8">
                <span className="text-5xl font-semibold">INR {isYearly ? yearlyPricePerMonth : monthlyPrice}</span>
                <span className="text-muted-foreground">/month</span>
                {isYearly && <div className="text-sm text-muted-foreground mt-1">Billed INR {yearlyTotal} yearly</div>}
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>30 AI transcriptions (task creations) per day</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>Share tasks with unlimited people</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>Make task copies and share with different people</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>Advanced analytics</span>
                </li>
              </ul>
              <Button className="w-full rounded-xl h-12 shadow-lg shadow-primary/20">Upgrade to Pro</Button>
            </Card>
          </div>

          {/* FAQ Section */}
          <div className="max-w-3xl mx-auto mt-32">
            <h2 className="text-3xl font-semibold text-center mb-12">Frequently Asked Questions</h2>
            <div className="space-y-6">
              {[
                {
                  q: "What counts as an AI transcription?",
                  a: "Every time you use your voice or type a messy thought and WowTodo structures it into a task list, that counts as one transcription."
                },
                {
                  q: "Can I cancel my subscription anytime?",
                  a: "Yes, you can cancel your Pro subscription at any time from your account settings. You'll continue to have access until the end of your billing period."
                },
                {
                  q: "What happens if I hit my daily limit?",
                  a: "On the Free plan, if you hit your 10 transcriptions, you'll need to wait until the next day to create more tasks using AI. You can always upgrade to Pro for 30 transcriptions per day."
                },
                {
                  q: "How does sharing work on the Free plan?",
                  a: "You can share your task lists with up to 10 unique people. If you need to collaborate with a larger team, the Pro plan offers unlimited sharing."
                }
              ].map((faq, i) => (
                <div key={i} className="bg-card p-6 rounded-2xl border border-border/50 shadow-sm">
                  <h4 className="text-lg font-medium mb-2">{faq.q}</h4>
                  <p className="text-muted-foreground">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </SectionWrapper>
      </main>
      <Footer />
    </>
  )
}
