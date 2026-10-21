import { AlertTriangle, X } from 'lucide-react';

// ─── Badge / Tag component ────────────────────────────────────────────────
const colorMap = {
  teal:   'bg-[#3A1524] text-[#F7C5D2] border-[#633044]',
  cobalt: 'bg-[#2C101C] text-[#F28BA8] border-[#633044]',
  coral:  'bg-[#4A1526] text-[#F28BA8] border-[#8C3B58]',
  gold:   'bg-amber-950/40 text-amber-200 border-amber-500/30',
  violet: 'bg-[#3A1524] text-[#F7C5D2] border-[#8C3B58]',
  ink:    'bg-[#2C101C] text-[#D7B7C2] border-[#633044]',
  red:    'bg-rose-950/50 text-rose-300 border-rose-500/50',
};

export function Badge({ children, color = 'ink', size = 'sm', dot = false, className = '' }) {
  const sizes = {
    xs: 'px-2 py-0.5 text-[10px] font-mono tracking-wider uppercase',
    sm: 'px-2.5 py-0.5 text-[11px] font-mono tracking-wider uppercase',
    md: 'px-3 py-1 text-xs font-mono tracking-wider uppercase',
  };
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-semibold rounded-lg border leading-none backdrop-blur-md
        ${colorMap[color] ?? colorMap.ink}
        ${sizes[size] ?? sizes.sm}
        ${className}
      `}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />}
      {children}
    </span>
  );
}

// ─── Skill Tag ─────────────────────────────────────────────────────────────
const CATEGORY_COLORS = {
  'Frontend': 'cobalt',
  'Backend': 'teal',
  'Data': 'teal',
  'AI/ML': 'violet',
  'Design': 'gold',
  'Creative': 'gold',
  'Research': 'cobalt',
  'Management': 'coral',
  'Soft Skills': 'coral',
  'Debate': 'coral',
  'DevOps': 'ink',
};

export function SkillTag({ name, category, proficiency, removable, onRemove, required, missing }) {
  const color = missing ? 'red'
    : required ? 'teal'
    : CATEGORY_COLORS[category] ?? 'ink';

  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border leading-none
        ${colorMap[color] ?? colorMap.ink}
        ${missing ? 'border-dashed' : ''}
      `}
    >
      {missing && <AlertTriangle size={11} className="opacity-80 shrink-0 text-red-500" />}
      {name}
      {proficiency && (
        <span className="opacity-60 font-normal">· {proficiency}</span>
      )}
      {removable && (
        <button
          onClick={onRemove}
          className="ml-0.5 hover:opacity-70 transition-opacity flex items-center justify-center"
          aria-label={`Remove ${name}`}
        >
          <X size={11} />
        </button>
      )}
    </span>
  );
}

// ─── Category color helper ─────────────────────────────────────────────────
export function categoryColor(category) {
  return CATEGORY_COLORS[category] ?? 'ink';
}
