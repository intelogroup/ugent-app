/** Ugent mark: a U whose right stem stops short, with a signal dot above it. Reads as a person, a pulse, a cue. */
export default function UgentLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ugent">
      <rect x="4" y="4" width="92" height="92" rx="30" fill="#111111" />
      <path
        d="M35 26 V54 A15 15 0 0 0 65 54 V44"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="65" cy="27" r="7" fill="#F26B21" />
    </svg>
  );
}
