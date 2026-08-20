import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { AmbientBackground } from "@/components/AmbientBackground"
import { SectionWrapper } from "@/components/SectionWrapper"

/**
 * Google Play requires a publicly reachable page describing how to delete an
 * account and what happens to the data — reachable WITHOUT installing the app or
 * signing in, which is why it lives on the marketing site rather than in-app.
 * The URL goes in the Play Console under Data safety → Data deletion.
 *
 * Everything stated here is what the code actually does. The in-app steps match
 * app/(app)/settings.tsx, and the deleted/retained lists match the cascade
 * asserted by app/scripts/verify-account-deletion.mjs. If either changes, this
 * page has to change with it — an inaccurate data-deletion page is itself a
 * policy violation.
 */

const SUPPORT_EMAIL = "privacy@wowtodo.app"

const DELETED = [
  "Your account and sign-in credentials",
  "All tasks, todos and branches you created",
  "Your task groups",
  "Your profile — name, avatar, date of birth, profession, city and bio",
  "Your reminder settings and every scheduled reminder",
  "Your notifications",
  "Every share you created or received, so tasks you shared stop being visible to the people you shared them with",
]

const RETAINED = [
  "Notifications in another user's inbox that were caused by you — for example “Alex shared a task with you”. These belong to that user's account, so they are kept, but the link back to your account is permanently removed and your name no longer appears.",
  "Encrypted infrastructure backups held by our hosting provider, which are overwritten on their normal rotation schedule.",
  "Request logs held by OpenAI, our AI provider, which they state are retained for up to 30 days for abuse monitoring and then deleted. This applies to text and voice you sent for processing.",
]

export function DeleteAccount() {
  return (
    <>
      <AmbientBackground />
      <Navbar />
      <main className="relative z-10 pt-32 pb-24">
        <SectionWrapper>
          <div className="max-w-3xl mx-auto bg-card p-8 md:p-12 rounded-3xl border border-border/50 shadow-soft">
            <h1 className="text-4xl font-semibold tracking-tight mb-4">
              Delete your WowTodo account
            </h1>
            <p className="text-muted-foreground mb-8">
              You can delete your WowTodo account and all of its data at any time. You do
              not need to contact us first, and there is no waiting period.
            </p>

            <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-muted-foreground">
              <h2 className="text-2xl font-medium text-foreground mt-8 mb-4">
                Delete it yourself, from the app
              </h2>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Open WowTodo and go to <strong className="text-foreground">Settings</strong>.</li>
                <li>Scroll to <strong className="text-foreground">Delete account</strong> at the bottom.</li>
                <li>Tap <strong className="text-foreground">Delete my account</strong>.</li>
                <li>Type <strong className="text-foreground">DELETE</strong> to confirm.</li>
              </ol>
              <p>
                Deletion happens immediately and cannot be undone. You will be signed out
                as soon as it completes.
              </p>

              <h2 className="text-2xl font-medium text-foreground mt-8 mb-4">
                Request deletion by email
              </h2>
              <p>
                If you no longer have the app installed, or cannot sign in, email{" "}
                <a
                  href={`mailto:${SUPPORT_EMAIL}?subject=Delete%20my%20WowTodo%20account`}
                  className="text-foreground underline underline-offset-4"
                >
                  {SUPPORT_EMAIL}
                </a>{" "}
                from the address you signed in with. We will verify that the request comes
                from the account owner and delete the account within 30 days.
              </p>

              <h2 className="text-2xl font-medium text-foreground mt-8 mb-4">
                What is deleted
              </h2>
              <p>Deleting your account permanently removes:</p>
              <ul className="list-disc pl-5 space-y-2">
                {DELETED.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <h2 className="text-2xl font-medium text-foreground mt-8 mb-4">
                What is kept, and why
              </h2>
              <ul className="list-disc pl-5 space-y-2">
                {RETAINED.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p>
                None of the above can be used to sign in, and none of it is linked to your
                identity once your account is gone.
              </p>

              <h2 className="text-2xl font-medium text-foreground mt-8 mb-4">Questions</h2>
              <p>
                Write to{" "}
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="text-foreground underline underline-offset-4"
                >
                  {SUPPORT_EMAIL}
                </a>
                . Our{" "}
                <a href="/privacy" className="text-foreground underline underline-offset-4">
                  Privacy Policy
                </a>{" "}
                describes what we collect and why.
              </p>
            </div>
          </div>
        </SectionWrapper>
      </main>
      <Footer />
    </>
  )
}
