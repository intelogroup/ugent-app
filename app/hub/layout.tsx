import { Atkinson_Hyperlegible, Reenie_Beanie } from 'next/font/google';

export const dynamic = 'force-dynamic';

// Body hub has its own type: a hyper-legible face for findings and diagnoses, a scrawl only for margin notes.
const ui = Atkinson_Hyperlegible({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-hub-ui', display: 'swap' });
const hand = Reenie_Beanie({ weight: '400', subsets: ['latin'], variable: '--font-hub-hand', display: 'swap' });

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${ui.variable} ${hand.variable}`}>{children}</div>;
}
