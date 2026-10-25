// ─── TeamWeave Brand Mark SVG ─────────────────────────────────────────────
// Three interlocking strands that weave into one structure.
export function BrandMark({ size = 32, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-label="TeamWeave mark"
      className={className}
    >
      {/* Strand 1 — Primary Crimson #B6264D */}
      <path
        d="M6 28 C6 18, 16 12, 20 20 C24 28, 34 22, 34 12"
        stroke="#B6264D"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Strand 2 — Highlight Coral-Crimson */}
      <path
        d="M6 20 C10 10, 20 8, 20 20 C20 32, 30 30, 34 20"
        stroke="#F4A7BB"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.9"
      />
      {/* Strand 3 — Garnet highlight */}
      <path
        d="M6 12 C6 22, 16 28, 20 20 C24 12, 34 18, 34 28"
        stroke="#D13D65"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.85"
      />
      {/* Weave knot center node */}
      <circle cx="20" cy="20" r="2.5" fill="#F7FAF8" />
    </svg>
  );
}

export function BrandWordmark({ size = 28, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-2 font-heading font-bold tracking-tight select-none ${className}`}
      style={{ fontSize: size }}
    >
      <BrandMark size={size * 1.15} />
      <span className="text-[#F7FAF8]">
        Team<span className="text-[#B6264D]">Weave</span>
      </span>
    </span>
  );
}
