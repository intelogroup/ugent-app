import SimulatorsClient from './SimulatorsClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Interactive Bio Sketchbook Labs | Ugent USMLE",
  description: "Master complex USMLE Step 1 concepts in Biochemistry, Genetics, and Cell Biology with cozy, hand-drawn vector notebook simulators.",
};

export default function Page() {
  return <SimulatorsClient />;
}
