import Image from 'next/image'
import Link from 'next/link'
import { Newsreader, Plus_Jakarta_Sans } from 'next/font/google'
import {
  ArrowRight,
  CalendarCheck2,
  Check,
  Mic2,
} from 'lucide-react'
import UgentLogo from '@/components/UgentLogo'
import SocialProof from '@/components/SocialProof'
import styles from './landing.module.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
})

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  display: 'swap',
})

const platformFeatures = [
  {
    title: 'Question-bank driven',
    text: 'Topic frequency and dependencies shape your 19-week curriculum.',
  },
  {
    title: 'Three focused blocks',
    text: 'Each block has one task, one resource, and 50 minutes.',
  },
  {
    title: 'Progress at a glance',
    text: 'Track completed blocks and practice accuracy.',
  },
]

export default function Home() {
  return (
    <main className={`${styles.page} ${jakarta.variable} ${newsreader.variable} ${jakarta.className}`}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="Ugent home">
          <UgentLogo className={styles.logo} />
          <span>Ugent</span>
        </Link>

        <nav className={styles.nav} aria-label="Landing page navigation">
          <a href="#platform">Platform</a>
          <a href="#clea">Clea AI</a>
        </nav>

        <div className={styles.headerActions}>
          <Link href="/auth/login" className={styles.signIn}>Sign in</Link>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroCopy}>
          <h1>
            <span className={styles.heroTitleLead}>Prepare your USMLE</span>
            <span className={styles.heroTitleSecond}>
              with a <span className={styles.heroTitleAccent}>clear route forward.</span>
            </span>
          </h1>
          <p className={styles.heroLead}>
            Ugent turns the question bank into a focused 19-week plan, with clear study blocks, contextual tutoring, and progress you can see.
          </p>
          <div className={styles.heroSocialProof}>
            <SocialProof />
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="Medical student using the Ugent study platform">
          <div className={styles.portraitFrame}>
            <Image
              src="/images/landing/hero-med-student.webp"
              alt="Medical student holding a tablet and study notebook"
              width={1024}
              height={1536}
              className={styles.heroPortrait}
              priority
              sizes="(max-width: 1000px) 80vw, 45vw"
            />
          </div>

          <div className={`${styles.heroFloatCard} ${styles.planFloat}`}>
            <span className={styles.floatIcon}><CalendarCheck2 size={19} /></span>
            <div><small>YOUR ROUTE</small><strong>19-week plan</strong></div>
            <span className={styles.floatStatus}><Check size={13} /> Ready</span>
          </div>

          <div className={`${styles.heroFloatCard} ${styles.cleaFloat}`}>
            <Image src="/clea2-avatar-photo.png" alt="" width={44} height={44} />
            <div><small>ASK CLEA</small><strong>Answers in context</strong></div>
            <Mic2 size={17} />
          </div>

        </div>
      </section>

      <section className={styles.platform} id="platform">
        <div className={styles.platformShowcase}>
          <div className={styles.sectionIntro}>
            <h2>Know what to study next.</h2>
          </div>

          <div className={styles.curriculumPreview} aria-label="Example of a Ugent daily study plan">
            <div className={styles.previewHeader}>
              <strong>Week 8 of 19</strong>
              <span>Step 1 curriculum</span>
            </div>
            <div className={styles.previewProgress}><i /></div>
            <div className={styles.previewDay}>
              <strong>Today’s plan</strong>
              <span>3 blocks · 150 min</span>
            </div>
            <div className={styles.previewBlocks}>
              <div>
                <small>Reading</small>
                <strong>Review assigned resources</strong>
                <span>50 min</span>
              </div>
              <div>
                <small>Questions</small>
                <strong>Practice topic questions</strong>
                <span>50 min</span>
              </div>
              <div>
                <small>Review</small>
                <strong>Review missed concepts</strong>
                <span>50 min</span>
              </div>
            </div>
          </div>

          <div className={styles.platformFeatureList}>
            {platformFeatures.map(({ title, text }) => (
              <article key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.cleaSection} id="clea">
        <div className={styles.cleaVisual}>
          <div className={styles.cleaHalo} />
          <div className={styles.cleaPortrait}>
            <Image src="/clea2-avatar-photo.png" alt="Clea AI study companion" width={270} height={270} priority={false} />
          </div>
          <div className={styles.waveCard}>
            <Mic2 size={18} />
            <div className={styles.waveform} aria-hidden="true">
              {[10, 18, 28, 16, 34, 24, 13, 30, 20, 11, 25, 15].map((height, index) => (
                <i key={index} style={{ height }} />
              ))}
            </div>
            <span>Voice mode</span>
          </div>
        </div>
        <div className={styles.cleaCopy}>
          <h2>Talk through the concept until it clicks.</h2>
          <p>
            Ask a follow-up, request a simpler explanation, or turn the topic into a quick recall drill out loud and routed in textbook knowledge.
          </p>
          <Link href="/auth/signup" className={styles.darkCta}>Try Clea <ArrowRight size={17} /></Link>
        </div>
      </section>

      <section className={styles.finalCta}>
        <div className={styles.finalGlow} />
        <h2>Give every study hour a purpose.</h2>
        <p>Start with a clear plan for what to study next.</p>
        <div>
          <Link href="/auth/signup" className={styles.lightCta}>Start studying free <ArrowRight size={18} /></Link>
          <Link href="/auth/login" className={styles.ghostCta}>Sign in</Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerMain}>
          <div className={styles.footerBrand}>
            <Link href="/" className={styles.brand}><UgentLogo className={styles.logo} /><span>Ugent</span></Link>
            <p>A focused curriculum, contextual tutoring, and clear progress for USMLE Step 1.</p>
          </div>

          <nav className={styles.footerNav} aria-label="Footer navigation">
            <div>
              <strong>Product</strong>
              <a href="#platform">Platform</a>
              <a href="#clea">Clea AI</a>
              <Link href="/curriculum">Curriculum</Link>
            </div>
            <div>
              <strong>Account</strong>
              <Link href="/auth/signup">Create account</Link>
              <Link href="/auth/login">Sign in</Link>
            </div>
            <div>
              <strong>Legal</strong>
              <Link href="/terms">Terms</Link>
              <Link href="/privacy">Privacy</Link>
            </div>
          </nav>
        </div>

        <div className={styles.footerBottom}>
          <span>© {new Date().getFullYear()} Ugent. All rights reserved.</span>
          <span>Built for focused USMLE Step 1 preparation.</span>
        </div>
      </footer>
    </main>
  )
}
