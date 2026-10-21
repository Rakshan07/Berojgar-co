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
      className="group block h-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F7A5BD] focus-visible:rounded-2xl"
    >
      <div className="relative h-full flex flex-col justify-between p-5 rounded-2xl bg-[#220B15]/90 hover:bg-[#2C101C] border border-[#633044] hover:border-[#B92345]/60 transition-all duration-300 shadow-[0_4px_24px_rgba(0,0,0,0.7)] hover:shadow-[0_0_25px_rgba(185,35,69,0.2)] hover:-translate-y-1 backdrop-blur-md overflow-hidden">
        {/* Subtle Ambient Hover Glow */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-[#B92345]/15 via-[#8C1538]/5 to-transparent rounded-bl-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="flex flex-col gap-3.5 h-full justify-between relative z-10">
          {/* Category & status header */}
          <div className="flex items-center justify-between gap-2">
            <Badge color={catMeta?.color ?? 'ink'}>{catMeta?.label ?? event.category}</Badge>
            <div className="flex items-center gap-1.5">
              {registered && <Badge color="teal" dot>Joined</Badge>}
              {isClosed ? (
                <Badge color="ink">Closed</Badge>
              ) : (
                <span className="text-[11px] font-mono text-[#F28BA8] font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  View <ArrowUpRight size={12} />
                </span>
              )}
            </div>
          </div>

          {/* Title */}
          <h3 className="font-heading font-bold text-white group-hover:text-[#F28BA8] transition-colors leading-snug text-base line-clamp-2">
            {event.title}
          </h3>

          {/* Description */}
          <p className="text-xs sm:text-sm text-[#D7B7C2] leading-relaxed line-clamp-2">
            {event.description}
          </p>

          {/* Metadata chips */}
          <div className="flex flex-wrap gap-2 text-xs text-[#D7B7C2] pt-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-[#633044]/50 font-mono text-[11px]">
              <Calendar size={12} className="text-[#F28BA8] shrink-0" />
              <span>{formatDate(event.dates.start)}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-[#633044]/50 font-mono text-[11px]">
              <MapPin size={12} className="text-[#F7C5D2] shrink-0" />
              <span>{MODE_LABEL[event.mode] ?? event.mode}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-[#633044]/50 font-mono text-[11px]">
              <Users size={12} className="text-[#D7B7C2] shrink-0" />
              <span>{event.teamSize.min}–{event.teamSize.max}/team</span>
            </span>
          </div>

          {/* Capacity Progress */}
          <div className="pt-2 border-t border-[#633044]/50">
            <div className="flex justify-between items-center text-xs text-[#B68F9E] mb-1.5">
              <span className="font-mono text-[11px] text-[#D7B7C2]">{event.registeredCount} / {event.maxParticipants} spots</span>
              <span className="font-mono text-[11px] text-[#F28BA8] font-semibold">{pct}%</span>
            </div>
            <div className="h-1.5 bg-[#17080F] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isClosed ? 'bg-slate-600' : pct > 80 ? 'bg-amber-400' : 'bg-gradient-to-r from-[#B92345] to-[#D23357]'
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
