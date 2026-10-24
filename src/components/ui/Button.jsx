// ─── Reusable Button component ───────────────────────────────────────────
const variants = {
  primary:   'bg-[#a31c1b] text-[#F7FAF8] hover:bg-[#bf2625] hover:shadow-lg hover:shadow-[#a31c1b]/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] shadow-sm shadow-[#a31c1b]/30',
  secondary: 'bg-[#171717] text-[#F7FAF8] border border-[#333D38] hover:bg-[#222624] hover:border-[#45524B] hover:shadow-md hover:shadow-black/60 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]',
  ghost:     'bg-transparent text-[#C8D1CC] hover:bg-[#171717] hover:text-[#F7FAF8] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]',
  danger:    'bg-[#a31c1b] text-white hover:bg-[#bf2625] hover:shadow-lg hover:shadow-[#a31c1b]/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]',
  outline:   'bg-transparent text-[#E56E6D] border border-[#a31c1b] hover:bg-[#a31c1b]/20 hover:border-[#E56E6D] hover:shadow-sm hover:shadow-[#a31c1b]/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]',
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
        transition-all duration-200 cursor-pointer select-none
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a31c1b]
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
