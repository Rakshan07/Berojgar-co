// ─── Event Discovery Page ─────────────────────────────────────────────────
import { useState, useMemo } from 'react';
import { Search, Sparkles, Filter, X, Check, MapPin, Calendar, Users } from 'lucide-react';
import { useApp, useCurrentUser } from '../../app/AppContext';
import { EventCard } from '../../components/events/EventCard';
import { EmptyState } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EVENT_CATEGORIES } from '../../data/demoData';

const MODES = [
  { id: 'all', label: 'All Modes' },
  { id: 'remote', label: 'Remote' },
  { id: 'in-person', label: 'In-person' },
  { id: 'hybrid', label: 'Hybrid' },
];

export default function EventDiscoveryPage() {
  const { state } = useApp();
  const user = useCurrentUser();
  const [query, setQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [selectedMode, setSelectedMode] = useState('all');
  const [showOpen, setShowOpen] = useState(false);

  const myRegisteredIds = new Set(
    state.registrations.filter(r => r.participantId === user.id).map(r => r.eventId)
  );

  const filtered = useMemo(() => {
    return state.events.filter(event => {
      const q = query.toLowerCase();
      if (q && !event.title.toLowerCase().includes(q) && !event.description.toLowerCase().includes(q) && !event.tags.some(t => t.includes(q))) return false;
      if (selectedCat !== 'all' && event.category !== selectedCat) return false;
      if (selectedMode !== 'all' && event.mode !== selectedMode) return false;
      if (showOpen && event.status !== 'open') return false;
      return true;
    });
  }, [state.events, query, selectedCat, selectedMode, showOpen]);

  const hasFilters = query || selectedCat !== 'all' || selectedMode !== 'all' || showOpen;

  function clearFilters() {
    setQuery('');
    setSelectedCat('all');
    setSelectedMode('all');
    setShowOpen(false);
  }

  // Count events per category
  const categoryCounts = useMemo(() => {
    const counts = { all: state.events.length };
    state.events.forEach(e => {
      counts[e.category] = (counts[e.category] || 0) + 1;
    });
    return counts;
  }, [state.events]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* ─── Page Header with ambient badge ─── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[var(--sf-border)]/60 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider font-semibold bg-[var(--sf-panel)] text-[var(--sf-accent-text)] border border-[var(--sf-border)] shadow-sm shadow-[var(--sf-bg)]/50 mb-3">
            <Sparkles size={11} className="text-[var(--sf-accent-text)]" /> Skill-Matched Opportunities
          </div>
          <h1 className="text-3xl sm:text-4xl font-heading font-black text-ink tracking-tight">
            Discover <span className="text-gradient-purple">Events</span>
          </h1>
          <p className="text-sm text-[var(--sf-secondary)] mt-1 max-w-xl">
            Browse hackathons, debates, research sprints, and creative jams with live team requirement blueprints.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-[var(--sf-secondary)] bg-[var(--sf-panel)]/95 border border-[var(--sf-border)] px-3.5 py-2 rounded-xl backdrop-blur-md self-start md:self-auto shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[#C5ADE5] shadow-[0_0_8px_rgba(182,38,77,0.8)]" />
          <span className="font-bold text-[var(--sf-accent-text)]">{filtered.length}</span>
          <span>of {state.events.length} events active</span>
        </div>
      </div>

      {/* ─── Search and Controls Toolbar ─── */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--sf-accent-text)]" />
            <input
              className="w-full pl-10 pr-9 py-2.5 border border-[var(--sf-border)] rounded-xl bg-[var(--sf-panel)]/90 backdrop-blur-md text-sm text-[var(--sf-text)] placeholder:text-[var(--sf-muted)] focus:outline-none focus:border-[#C5ADE5] focus:ring-2 focus:ring-[#C5ADE5]/25 transition-all shadow-sm"
              placeholder="Search by event title, tags, or skill requirements..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--sf-muted)] hover:text-[var(--sf-text)] p-0.5 rounded-full hover:bg-white/10"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Mode Segmented Controls */}
          <div className="flex items-center p-1 bg-[var(--sf-panel)]/95 border border-[var(--sf-border)] rounded-xl backdrop-blur-md">
            {MODES.map(m => (
              <button
                key={m.id}
                onClick={() => setSelectedMode(m.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
                  selectedMode === m.id
                    ? 'bg-[#C5ADE5]/30 text-[var(--sf-text)] border border-[#C5ADE5]/60 shadow-sm font-bold'
                    : 'text-[var(--sf-muted)] hover:text-[var(--sf-text)] hover:bg-white/5 border border-transparent'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Open spots only filter */}
          <button
            onClick={() => setShowOpen(v => !v)}
            className={`px-3.5 py-2 rounded-xl border text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              showOpen
                ? 'bg-[#C5ADE5] text-[var(--sf-text)] border-[#C5ADE5] font-semibold shadow-md shadow-[#C5ADE5]/30'
                : 'bg-[var(--sf-panel)] border-[var(--sf-border)] text-[var(--sf-secondary)] hover:text-[var(--sf-text)] hover:border-[#C5ADE5] backdrop-blur-md'
            }`}
          >
            {showOpen && <Check size={13} className="stroke-[3]" />}
            <span>Open spots only</span>
          </button>

          {hasFilters && (
            <Button variant="ghost" size="sm" icon={<X size={13} />} onClick={clearFilters}>
              Reset
            </Button>
          )}
        </div>

        {/* ─── Category Filter Pills ─── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
          <button
            onClick={() => setSelectedCat('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono uppercase tracking-wider border transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              selectedCat === 'all'
                ? 'bg-[#C5ADE5] text-[var(--sf-text)] border-[#C5ADE5] font-semibold shadow-md shadow-[#C5ADE5]/30'
                : 'bg-[var(--sf-panel)]/90 border-[var(--sf-border)] text-[var(--sf-secondary)] hover:text-[var(--sf-text)] hover:border-[#C5ADE5]'
            }`}
          >
            <span>All Categories</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${selectedCat === 'all' ? 'bg-[var(--sf-bg)] text-[var(--sf-text)] font-bold' : 'bg-white/10 text-[var(--sf-secondary)]'}`}>
              {categoryCounts.all}
            </span>
          </button>

          {EVENT_CATEGORIES.map(cat => {
            const active = selectedCat === cat.id;
            const count = categoryCounts[cat.id] || 0;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCat(active ? 'all' : cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-mono uppercase tracking-wider border transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  active
                    ? 'bg-[#C5ADE5] text-[var(--sf-text)] border-[#C5ADE5] font-semibold shadow-sm shadow-[#C5ADE5]/30'
                    : 'bg-[var(--sf-panel)]/90 border-[var(--sf-border)] text-[var(--sf-secondary)] hover:text-[var(--sf-text)] hover:border-[#C5ADE5]'
                }`}
              >
                <span>{cat.label}</span>
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${active ? 'bg-[var(--sf-bg)] text-[var(--sf-text)] font-bold' : 'bg-white/10 text-[var(--sf-secondary)]'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Results Grid ─── */}
      <div>
        <div className="flex items-center justify-between text-xs text-slate-400 mb-4 px-1">
          <span>Showing {filtered.length} matching event{filtered.length !== 1 ? 's' : ''}</span>
          {hasFilters && (
            <span className="text-teal font-medium">Filters active</span>
          )}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Calendar size={22} />}
            title="No events match your criteria"
            description="Try clearing search keywords or switching category filters."
            action={<Button size="sm" variant="secondary" onClick={clearFilters}>Clear all filters</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(event => (
              <EventCard
                key={event.id}
                event={event}
                registered={myRegisteredIds.has(event.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
