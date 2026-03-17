import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { AmbientBackground } from "@/components/AmbientBackground"
import { SectionWrapper } from "@/components/SectionWrapper"

export function Privacy() {
  return (
    <>
      <AmbientBackground />
      <Navbar />
      <main className="relative z-10 pt-32 pb-24">
        <SectionWrapper>
          <div className="max-w-3xl mx-auto bg-card p-8 md:p-12 rounded-3xl border border-border/50 shadow-soft">
            <h1 className="text-4xl font-semibold tracking-tight mb-8">Privacy Policy</h1>
            <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-muted-foreground">
              <p>Last updated: {new Date().toLocaleDateString()}</p>
              
              <h2 className="text-2xl font-medium text-foreground mt-8 mb-4">1. Information We Collect</h2>
              <p>
                We collect information you provide directly to us, such as when you create an account, use our voice transcription features, or communicate with us. This may include your name, email address, and the content of your tasks and transcriptions.
              </p>

              <h2 className="text-2xl font-medium text-foreground mt-8 mb-4">2. How We Use Your Information</h2>
              <p>
                We use the information we collect to provide, maintain, and improve our services, to process your transactions, and to communicate with you. Your voice and text inputs are processed by our AI models solely for the purpose of generating structured tasks for you.
              </p>

              <h2 className="text-2xl font-medium text-foreground mt-8 mb-4">3. Data Sharing and Security</h2>
              <p>
                We do not sell your personal data. We may share your information with third-party vendors who need access to such information to carry out work on our behalf (such as hosting providers and payment processors). We take reasonable measures to help protect information about you from loss, theft, misuse, and unauthorized access.
              </p>

              <h2 className="text-2xl font-medium text-foreground mt-8 mb-4">4. Your Choices</h2>
              <p>
                You may update, correct, or delete your account information at any time by logging into your account settings. You can also contact us to request access to or deletion of your personal data.
              </p>

              <h2 className="text-2xl font-medium text-foreground mt-8 mb-4">5. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us at privacy@wowtodo.app.
              </p>
            </div>
          </div>
        </SectionWrapper>
      </main>
      <Footer />
    </>
  )
}
