// ─── Event Card component ─────────────────────────────────────────────────
import { Calendar, MapPin, Users, Clock, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '../ui/Badge';
import { EVENT_CATEGORIES } from '../../data/demoData';

const MODE_LABEL = { hybrid: 'Hybrid', 'in-person': 'In-person', remote: 'Remote' };

export function EventCard({ event, registered = false }) {
  const catMeta = EVENT_CATEGORIES.find(c => c.id === event.category);
  const isFull = event.registeredCount >= event.maxParticipants;
  const isClosed = event.status === 'closed' || isFull;
  const pct = Math.min(100, Math.round((event.registeredCount / event.maxParticipants) * 100));

  return (
    <Link
      to={`/events/${event.id}`}
      className="group block h-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#a31c1b] focus-visible:rounded-2xl"
    >
      <div className="relative h-full flex flex-col justify-between p-5 rounded-2xl bg-[#171717]/95 hover:bg-[#1e1e1e] border border-[#333D38] hover:border-[#a31c1b]/70 transition-all duration-300 shadow-[0_4px_24px_rgba(0,0,0,0.7)] hover:shadow-[0_0_25px_rgba(163,28,27,0.25)] hover:-translate-y-1 backdrop-blur-md overflow-hidden">
        {/* Subtle Ambient Hover Glow */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-[#a31c1b]/20 via-[#a31c1b]/5 to-transparent rounded-bl-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="flex flex-col gap-3.5 h-full justify-between relative z-10">
          {/* Category & status header */}
          <div className="flex items-center justify-between gap-2">
            <Badge color={catMeta?.color ?? 'ink'}>{catMeta?.label ?? event.category}</Badge>
            <div className="flex items-center gap-1.5">
              {registered && <Badge color="teal" dot>Joined</Badge>}
              {isClosed ? (
                <Badge color="ink">Closed</Badge>
              ) : (
                <span className="text-[11px] font-mono text-[#E56E6D] font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  View <ArrowUpRight size={12} />
                </span>
              )}
            </div>
          </div>

          {/* Title */}
          <h3 className="font-heading font-bold text-white group-hover:text-[#E56E6D] transition-colors leading-snug text-base line-clamp-2">
            {event.title}
          </h3>

          {/* Description */}
          <p className="text-xs sm:text-sm text-[#C8D1CC] leading-relaxed line-clamp-2">
            {event.description}
          </p>

          {/* Metadata chips */}
          <div className="flex flex-wrap gap-2 text-xs text-[#C8D1CC] pt-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-[#333D38]/60 font-mono text-[11px]">
              <Calendar size={12} className="text-[#E56E6D] shrink-0" />
              <span>{formatDate(event.dates.start)}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-[#333D38]/60 font-mono text-[11px]">
              <MapPin size={12} className="text-[#E56E6D] shrink-0" />
              <span>{MODE_LABEL[event.mode] ?? event.mode}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-[#333D38]/60 font-mono text-[11px]">
              <Users size={12} className="text-[#C8D1CC] shrink-0" />
              <span>{event.teamSize.min}–{event.teamSize.max}/team</span>
            </span>
          </div>

          {/* Capacity Progress */}
          <div className="pt-2 border-t border-[#333D38]/60">
            <div className="flex justify-between items-center text-xs text-[#9EAAA4] mb-1.5">
              <span className="font-mono text-[11px] text-[#C8D1CC]">{event.registeredCount} / {event.maxParticipants} spots</span>
              <span className="font-mono text-[11px] text-[#E56E6D] font-semibold">{pct}%</span>
            </div>
            <div className="h-1.5 bg-[#06110C] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isClosed ? 'bg-slate-600' : pct > 80 ? 'bg-amber-400' : 'bg-gradient-to-r from-[#a31c1b] to-[#bf2625]'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Deadline */}
          {event.dates.registrationDeadline && (
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-0.5">
              <Clock size={11} className="text-slate-400" />
              <span>Register by {formatDate(event.dates.registrationDeadline)}</span>
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
