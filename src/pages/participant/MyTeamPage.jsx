// ─── Participant Skillfy ─────────────────────────────────────────────────
import { useApp, useCurrentUser } from '../../app/AppContext';
import { TeamBlueprint } from '../../components/teams/TeamBlueprint';
import { LivingWeaveViz } from '../../components/teams/LivingWeaveViz';
import { Card, SectionHeader, EmptyState } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';

export default function ParticipantTeamPage() {
  const { state } = useApp();
  const user = useCurrentUser();

  const myTeams = state.teams.filter(t => t.members.some(m => m.participantId === user.id));

  if (myTeams.length === 0) {
    return (
      <div className="animate-fadeIn">
        <h1 className="text-2xl font-heading font-bold text-ink mb-6">My Team</h1>
        <EmptyState
          icon={<Users size={18} />}
          title="No team assigned yet"
          description="Team assignments are proposed after registration closes. Join an event first, and the organizer will generate team suggestions."
          action={<Link to="/events"><Button size="sm">Browse events</Button></Link>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-heading font-bold text-ink">My Team{myTeams.length > 1 ? 's' : ''}</h1>
        <p className="text-sm text-ink-secondary mt-1">
          Demo recommendations based on sample data — not results from a real AI or matching engine.
        </p>
      </div>

      {myTeams.map(team => {
        const event = state.events.find(e => e.id === team.eventId);
        return (
          <div key={team.id} className="space-y-4">
            <SectionHeader title={event?.title ?? 'Event'} subtitle={`Team: ${team.name}`} />

            {/* Living Weave */}
            <Card>
              <h3 className="text-sm font-semibold text-ink mb-3">Team Connections</h3>
              <LivingWeaveViz
                team={team}
                participants={state.participants}
                requirements={event?.requirements ?? []}
              />
            </Card>

            {/* Blueprint */}
            <TeamBlueprint
              team={team}
              participants={state.participants}
              event={event}
              showReasons
            />
          </div>
        );
      })}
    </div>
  );
}
