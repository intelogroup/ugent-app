import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service — Ugent',
}

export default function TermsPage() {
  return (
    <main className="min-h-screen px-4 py-16">
      <div className="max-w-2xl mx-auto card p-8 space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-neutral-900">Terms of Service</h1>
          <p className="text-sm text-neutral-500 mt-1">Last updated: August 2026</p>
        </header>

        <section>
          <h2>1. The service</h2>
          <p>
            Ugent provides a USMLE Step 1 study platform: a question bank, a 19-week
            curriculum, progress analytics, and an AI study assistant (&quot;Clea&quot;). By
            creating an account or using the service you agree to these terms.
          </p>
        </section>

        <section>
          <h2>2. Accounts</h2>
          <p>
            You must provide a valid email address and keep your credentials secure.
            You are responsible for all activity under your account. You may not share
            your account, create accounts to circumvent limits, or use the service to
            train competing or derivative products.
          </p>
        </section>

        <section>
          <h2>3. Acceptable use</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Use the service only for your own personal study.</li>
            <li>
              Do not bulk-download, scrape, or redistribute the question bank, content,
              or curriculum data.
            </li>
            <li>
              Do not attempt to access another user&apos;s account, data, or the underlying
              infrastructure.
            </li>
          </ul>
        </section>

        <section>
          <h2>4. Intellectual property</h2>
          <p>
            Ugent and its content (question bank, curriculum, images, branding, &quot;Clea&quot;)
            are the property of Ugent. We grant you a limited, non-exclusive,
            non-transferable right to use the service for your personal study. You retain
            any content you submit through Clea or study tools.
          </p>
        </section>

        <section>
          <h2>5. Medical disclaimer</h2>
          <p>
            Ugent is an educational tool for USMLE Step 1 preparation. It is not medical
            advice, a diagnosis, a treatment plan, or a substitute for consultation with a
            licensed physician or other qualified professional. Clea&apos;s answers may be
            incomplete or incorrect; verify clinically critical information against
            authoritative sources.
          </p>
        </section>

        <section>
          <h2>6. AI assistant</h2>
          <p>
            Clea uses large language models and can produce inaccurate or outdated
            information. You are responsible for how you use its output. Voice audio you
            send is transcribed and processed to answer your questions; see the{' '}
            <Link href="/privacy" className="text-primary-600 font-medium hover:underline">
              Privacy Policy
            </Link>{' '}
            for details.
          </p>
        </section>

        <section>
          <h2>7. Liability</h2>
          <p>
            The service is provided &quot;as is&quot; without warranties of any kind. To the maximum
            extent permitted by law, Ugent is not liable for indirect, incidental, or
            consequential damages, including study outcomes or lost data. Nothing in these
            terms limits liability that cannot be limited by law.
          </p>
        </section>

        <section>
          <h2>8. Termination</h2>
          <p>
            You may stop using the service and delete your data at any time. We may suspend
            or terminate access for violations of these terms, breach of the acceptable-use
            rules, or conduct that harms the service or other users.
          </p>
        </section>

        <section>
          <h2>9. Changes</h2>
          <p>
            We may update these terms as the service evolves. Material changes will be
            posted here with a new &quot;last updated&quot; date. Continued use after changes means
            you accept the revised terms.
          </p>
        </section>

        <footer className="text-sm text-neutral-500 pt-2 border-t border-neutral-200">
          Questions about these terms?{' '}
          <Link href="/privacy" className="text-primary-600 font-medium hover:underline">
            See the Privacy Policy
          </Link>{' '}
          or contact us via the email on your account.
        </footer>
      </div>
    </main>
  )
}
