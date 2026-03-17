import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { AmbientBackground } from "@/components/AmbientBackground"
import { SectionWrapper } from "@/components/SectionWrapper"

export function Terms() {
  return (
    <>
      <AmbientBackground />
      <Navbar />
      <main className="relative z-10 pt-32 pb-24">
        <SectionWrapper>
          <div className="max-w-3xl mx-auto bg-card p-8 md:p-12 rounded-3xl border border-border/50 shadow-soft">
            <h1 className="text-4xl font-semibold tracking-tight mb-8">Terms and Conditions</h1>
            <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-muted-foreground">
              <p>Last updated: {new Date().toLocaleDateString()}</p>
              
              <h2 className="text-2xl font-medium text-foreground mt-8 mb-4">1. Acceptance of Terms</h2>
              <p>
                By accessing or using WowTodo, you agree to be bound by these Terms and Conditions and our Privacy Policy. If you do not agree to these terms, please do not use our services.
              </p>

              <h2 className="text-2xl font-medium text-foreground mt-8 mb-4">2. Description of Service</h2>
              <p>
                WowTodo is an intelligent execution companion that allows users to create, manage, and share structured task lists using text and voice inputs. We reserve the right to modify or discontinue the service at any time.
              </p>

              <h2 className="text-2xl font-medium text-foreground mt-8 mb-4">3. User Accounts</h2>
              <p>
                You are responsible for safeguarding the password that you use to access the service and for any activities or actions under your password. You agree not to disclose your password to any third party.
              </p>

              <h2 className="text-2xl font-medium text-foreground mt-8 mb-4">4. Acceptable Use</h2>
              <p>
                You agree not to use the service for any unlawful purpose or in any way that interrupts, damages, or impairs the service. You retain all rights to the content you submit, but grant us a license to use it to provide the service.
              </p>

              <h2 className="text-2xl font-medium text-foreground mt-8 mb-4">5. Subscription and Billing</h2>
              <p>
                Some features of WowTodo are billed on a subscription basis ("Pro Plan"). You will be billed in advance on a recurring and periodic basis (monthly or annually). Your subscription will automatically renew unless cancelled.
              </p>

              <h2 className="text-2xl font-medium text-foreground mt-8 mb-4">6. Limitation of Liability</h2>
              <p>
                In no event shall WowTodo, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
              </p>
            </div>
          </div>
        </SectionWrapper>
      </main>
      <Footer />
    </>
  )
}
