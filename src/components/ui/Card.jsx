import { X, Check } from 'lucide-react';
import { Button } from './Button';

export function Card({ children, className = '', padding = 'md', hoverable = false, ...props }) {
  const pads = { sm: 'p-4', md: 'p-5', lg: 'p-6', xl: 'p-7' };
  return (
    <div
      className={`
        bg-[#210B16]/95 backdrop-blur-md border border-[#5E2A3D] rounded-2xl shadow-card
        ${pads[padding] ?? pads.md}
        ${hoverable ? 'hover:shadow-elevated hover:border-[#B6264D] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}

// Section Header
export function SectionHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`flex items-start justify-between gap-4 mb-5 ${className}`}>
      <div>
        <h2 className="text-xl font-heading font-semibold text-[#F7FAF8] tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-[#BCA2AD] mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// Divider
export function Divider({ label, className = '' }) {
  if (!label) return <hr className={`border-[#5E2A3D]/60 my-4 ${className}`} />;
  return (
    <div className={`flex items-center gap-3 my-4 ${className}`}>
      <span className="flex-1 border-t border-[#5E2A3D]/60" />
      <span className="text-xs text-[#BCA2AD] uppercase tracking-widest">{label}</span>
      <span className="flex-1 border-t border-[#5E2A3D]/60" />
    </div>
  );
}

// Empty State
export function EmptyState({ icon, title, description, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-14 px-6 ${className}`}>
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-[#13080E] border border-[#5E2A3D] flex items-center justify-center mb-4 text-[#B6264D] shadow-sm">
          {icon}
        </div>
      )}
      <h3 className="text-base font-heading font-semibold text-[#F7FAF8] mb-1">{title}</h3>
      {description && <p className="text-sm text-[#BCA2AD] max-w-sm leading-relaxed">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// Stat card
export function StatCard({ label, value, sub, color = 'ink', className = '' }) {
  const colors = { ink: 'text-[#F7FAF8]', teal: 'text-[#F4A7BB]', cobalt: 'text-[#E0CAD3]', coral: 'text-[#F4A7BB]', gold: 'text-amber-400' };
  const glows = {
    teal: 'border-[#B6264D]/30 bg-gradient-to-b from-[#B6264D]/15 to-[#210B16]/95 shadow-[#B6264D]/10',
    cobalt: 'border-[#5E2A3D] bg-gradient-to-b from-[#5E2A3D]/20 to-[#210B16]/95',
    coral: 'border-[#B6264D]/40 bg-gradient-to-b from-[#B6264D]/20 to-[#210B16]/95',
    gold: 'border-amber-500/25 bg-gradient-to-b from-amber-500/10 to-[#210B16]/95',
    ink: 'border-[#5E2A3D] bg-[#210B16]/95',
  };
  return (
    <div className={`border rounded-2xl p-5 shadow-card backdrop-blur-md transition-all hover:border-[#B6264D] ${glows[color] ?? glows.ink} ${className}`}>
      <p className="text-xs text-[#BCA2AD] uppercase tracking-wider mb-1 font-medium">{label}</p>
      <p className={`text-3xl font-heading font-bold tracking-tight ${colors[color] ?? colors.ink}`}>{value}</p>
      {sub && <p className="text-xs text-[#BCA2AD] mt-1">{sub}</p>}
    </div>
  );
}

// Confirmation Dialog
export function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel, danger = false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-[#210B16] border border-[#5E2A3D] rounded-2xl shadow-modal w-full max-w-sm p-6 animate-scaleIn backdrop-blur-xl">
        <div className="flex items-start justify-between mb-3">
          <h3 id="confirm-title" className="text-base font-heading font-semibold text-[#F7FAF8]">{title}</h3>
          <button onClick={onCancel} className="text-[#BCA2AD] hover:text-[#F7FAF8] -mt-0.5 -mr-1 p-1 rounded-lg hover:bg-white/5 cursor-pointer" aria-label="Close"><X size={16} /></button>
        </div>
        {description && <p className="text-sm text-[#E0CAD3] leading-relaxed mb-5">{description}</p>}
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={danger ? 'danger' : 'primary'} size="sm" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}

// Loading spinner
export function Spinner({ size = 20, className = '' }) {
  return (
    <div
      className={`rounded-full border-2 border-[#5E2A3D] border-t-[#B6264D] animate-spin ${className}`}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  );
}

// Progress steps
export function ProgressSteps({ steps, current }) {
  return (
    <nav aria-label="Progress" className="flex items-center gap-0">
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all
                  ${done ? 'bg-[#B6264D] border-[#B6264D] text-white shadow-sm' : active ? 'border-[#B6264D] text-[#F4A7BB] bg-[#B6264D]/15' : 'border-[#5E2A3D] text-[#BCA2AD] bg-[#210B16]'}
                `}
              >
                {done ? <Check size={12} className="stroke-[3]" /> : i + 1}
              </div>
              <span className={`text-xs mt-1 hidden sm:block text-center max-w-16 leading-tight ${active ? 'text-[#F7FAF8] font-medium' : done ? 'text-[#E0CAD3]' : 'text-[#BCA2AD]'}`}>
                {step}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 w-8 sm:w-12 mx-1 mb-4 transition-all ${done ? 'bg-[#B6264D]' : 'bg-[#5E2A3D]'}`} />
            )}
          </div>
        );
      })}
    </nav>
  );
}

// Coverage bar
export function CoverageBar({ label, covered, total, required }) {
  const pct = total > 0 ? Math.round((covered / total) * 100) : 0;
  const color = pct === 100 ? 'bg-[#B6264D]' : pct >= 60 ? 'bg-amber-400' : 'bg-rose-500';
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs text-[#E0CAD3]">{label}</span>
        <span className={`text-xs font-mono font-medium ${pct === 100 ? 'text-[#F4A7BB]' : pct >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
          {covered}/{total}
        </span>
      </div>
      <div className="h-1.5 bg-[#13080E] rounded-full overflow-hidden border border-[#5E2A3D]/40">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// Proficiency pip display
export function ProficiencyPips({ level, max = 4 }) {
  return (
    <span className="inline-flex gap-1" aria-label={`Proficiency: ${level} of ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={`w-2 h-2 rounded-full ${i < level ? 'bg-[#B6264D] shadow-[0_0_6px_rgba(182,38,77,0.5)]' : 'bg-[#5E2A3D]'}`}
        />
      ))}
    </span>
  );
}

// Avatar
const AVATAR_COLORS = [
  'bg-[#B6264D]/20 text-[#F4A7BB] border border-[#B6264D]/35',
  'bg-[#5E2A3D] text-[#F7FAF8] border border-[#5E2A3D]',
  'bg-[#13080E] text-[#E0CAD3] border border-[#5E2A3D]',
  'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  'bg-[#B6264D]/30 text-[#F7FAF8] border border-[#B6264D]/50',
];

export function Avatar({ initials, size = 'md', index = 0, className = '' }) {
  const sizes = { xs: 'w-6 h-6 text-xs', sm: 'w-8 h-8 text-sm', md: 'w-9 h-9 text-sm', lg: 'w-11 h-11 text-base', xl: 'w-14 h-14 text-lg' };
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
  return (
    <div
      className={`rounded-full flex items-center justify-center font-semibold shrink-0 font-heading shadow-sm ${sizes[size] ?? sizes.md} ${color} ${className}`}
    >
      {initials?.slice(0, 2).toUpperCase() ?? '??'}
    </div>
  );
}
