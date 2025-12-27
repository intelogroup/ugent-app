export default function UgentLogo({ className = "w-10 h-10" }: { className?: string }) {
  const primaryBlue = '#2563EB'; // Darker blue from AI recommendation card (primary-600)

  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Main rounded square */}
      <rect
        x="15"
        y="15"
        width="70"
        height="70"
        rx="16"
        fill={primaryBlue}
      />

      {/* Minimalist U shape cutout */}
      <path
        d="M 35 35 L 35 55 Q 35 65 45 65 L 55 65 Q 65 65 65 55 L 65 35"
        fill="none"
        stroke="white"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
