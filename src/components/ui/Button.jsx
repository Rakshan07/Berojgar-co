// ─── Reusable Button component ───────────────────────────────────────────
const variants = {
  primary:   'bg-[#B92345] text-[#FFF4F6] hover:bg-[#D23357] active:scale-[0.98] shadow-sm shadow-[#B92345]/30',
  secondary: 'bg-[#220B15] text-[#FFF4F6] border border-[#633044] hover:bg-[#3A1524] hover:border-[#8C3B58] active:scale-[0.98]',
  ghost:     'bg-transparent text-[#D7B7C2] hover:bg-[#2C101C] hover:text-[#FFF4F6] active:scale-[0.98]',
  danger:    'bg-red-600 text-white hover:bg-red-700 active:scale-[0.98]',
  outline:   'bg-transparent text-[#F28BA8] border border-[#B92345] hover:bg-[#B92345]/15 active:scale-[0.98]',
};

const sizes = {
  xs:  'px-2.5 py-1 text-xs gap-1',
  sm:  'px-3.5 py-1.5 text-sm gap-1.5',
  md:  'px-4 py-2 text-sm gap-2',
  lg:  'px-5 py-2.5 text-base gap-2',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  disabled = false,
  loading = false,
  className = '',
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center font-medium rounded-xl
        transition-all duration-150 cursor-pointer select-none
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F7A5BD]
        ${variants[variant] ?? variants.primary}
        ${sizes[size] ?? sizes.md}
        ${className}
      `}
      style={{ fontFamily: 'var(--font-body)' }}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
      {iconRight && !loading && <span className="shrink-0">{iconRight}</span>}
    </button>
  );
}

// ─── Icon Button ──────────────────────────────────────────────────────────
export function IconButton({ icon, label, variant = 'ghost', size = 'sm', className = '', ...props }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={`
        inline-flex items-center justify-center rounded-md transition-all duration-150
        ${variant === 'ghost' ? 'text-ink-muted hover:text-ink hover:bg-paper' : ''}
        ${variant === 'primary' ? 'bg-teal text-white hover:bg-teal-dark' : ''}
        ${size === 'sm' ? 'w-8 h-8' : size === 'md' ? 'w-9 h-9' : 'w-10 h-10'}
        ${className}
      `}
      {...props}
    >
      {icon}
    </button>
  );
}
