// ─── Daily Learning / Challenge Page ─────────────────────────────────────
import { useState } from 'react';
import { BookOpen, CheckCircle, XCircle, Flame, Award, Info } from 'lucide-react';
import { useApp } from '../../app/AppContext';
import { Card, SectionHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../hooks/useToast';

const BADGES = [
  { id: 'three-streak', label: '3-Day Streak', icon: '🔥', desc: 'Answered correctly 3 days in a row' },
  { id: 'seven-streak', label: '7-Day Streak', icon: '⚡', desc: 'Answered correctly 7 days in a row' },
];

export default function DailyChallengePage() {
  const { state, dispatch } = useApp();
  const toast = useToast();
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const challenge = state.dailyChallenges[0];
  const previousChallenges = state.dailyChallenges.slice(1);
  const alreadyDone = challenge && !!state.challengeHistory[challenge.id];
  const historyEntry = challenge && state.challengeHistory[challenge.id];

  function handleSubmit() {
    if (!selected || submitted || alreadyDone) return;
    const correct = selected === challenge.correctAnswer;
    dispatch({
      type: 'SUBMIT_CHALLENGE',
      payload: { challengeId: challenge.id, answer: selected, correct },
    });
    setSubmitted(true);
    if (correct) {
      toast.success(`Correct! Streak: ${state.streak + 1} days`);
    } else {
      toast.warn('Not quite — see the explanation below.');
    }
  }

  const effectiveSelected = alreadyDone ? historyEntry?.answer : selected;
  const isCorrect = alreadyDone ? historyEntry?.correct : (submitted && selected === challenge.correctAnswer);
  const showFeedback = submitted || alreadyDone;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-heading font-bold text-ink">Daily Challenge</h1>
        <p className="text-sm text-ink-secondary mt-1">One question per day on team dynamics, collaboration, and leadership. Demo-only streaks and badges.</p>
      </div>

      {/* Streak & badges */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 px-4 py-2 bg-gold-light border border-gold/20 rounded-xl">
          <Flame size={18} className="text-gold" />
          <span className="font-heading font-bold text-gold text-lg">{state.streak}</span>
          <span className="text-sm text-gold/80">day streak</span>
        </div>
        {state.badges.map(bid => {
          const b = BADGES.find(x => x.id === bid);
          if (!b) return null;
          return (
            <div key={bid} className="flex items-center gap-2 px-3 py-2 bg-violet-light border border-violet/20 rounded-xl text-sm">
              <span>{b.icon}</span>
              <span className="text-violet font-medium">{b.label}</span>
            </div>
          );
        })}
        {state.badges.length === 0 && (
          <span className="text-sm text-ink-muted">No badges yet — build a streak to earn one</span>
        )}
      </div>

      {/* Demo notice */}
      <div className="flex items-start gap-2 px-4 py-3 bg-paper border border-border rounded-lg text-xs text-ink-muted">
        <Info size={13} className="shrink-0 mt-0.5" />
        Streaks and badges are demonstration-only. They do not affect skill proficiency or team matching.
      </div>

      {/* Today's challenge */}
      {challenge && (
        <Card>
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <BookOpen size={16} className="text-teal" />
              <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Today · {challenge.category}</span>
            </div>
            <Badge color="teal" size="xs">+{challenge.points} pts</Badge>
          </div>

          <h2 className="text-base font-heading font-semibold text-ink mb-4 leading-snug">
            {challenge.question}
          </h2>

          {/* Options */}
          <div className="space-y-2 mb-4">
            {challenge.options.map(opt => {
              const isSelected = effectiveSelected === opt.id;
              const isAnswer = opt.id === challenge.correctAnswer;
              let style = 'bg-paper border-border text-ink-secondary hover:border-border-strong hover:text-ink';
              if (showFeedback) {
                if (isAnswer) style = 'bg-teal-pale border-teal text-teal-dark font-medium';
                else if (isSelected && !isAnswer) style = 'bg-red-50 border-red-300 text-red-700';
                else style = 'bg-paper border-border text-ink-muted opacity-70';
              } else if (isSelected) {
                style = 'bg-teal-pale border-teal text-teal-dark font-medium';
              }

              return (
                <button
                  key={opt.id}
                  disabled={showFeedback}
                  onClick={() => !showFeedback && setSelected(opt.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${style} disabled:cursor-default`}
                >
                  <span className="font-mono text-xs font-semibold mr-2 opacity-60">{opt.id.toUpperCase()}.</span>
                  {opt.text}
                </button>
              );
            })}
          </div>

          {/* Submit */}
          {!showFeedback && (
            <Button
              size="sm"
              disabled={!selected}
              onClick={handleSubmit}
            >
              Submit answer
            </Button>
          )}

          {/* Feedback */}
          {showFeedback && (
            <div className={`mt-4 p-4 rounded-xl border ${isCorrect ? 'bg-teal-pale border-teal/20' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                {isCorrect ? <CheckCircle size={15} className="text-teal" /> : <XCircle size={15} className="text-red-500" />}
                <span className={`text-sm font-semibold ${isCorrect ? 'text-teal-dark' : 'text-red-700'}`}>
                  {isCorrect ? 'Correct!' : 'Not quite.'}
                </span>
              </div>
              <p className="text-sm text-ink-secondary leading-relaxed">{challenge.explanation}</p>
            </div>
          )}
        </Card>
      )}

      {/* Previous challenges */}
      {previousChallenges.length > 0 && (
        <div>
          <SectionHeader title="Previous challenges" />
          <div className="space-y-3">
            {previousChallenges.map(ch => {
              const done = state.challengeHistory[ch.id];
              return (
                <Card key={ch.id} padding="sm" className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${done?.correct ? 'bg-teal-pale' : done ? 'bg-red-50' : 'bg-paper'}`}>
                    {done?.correct ? <CheckCircle size={14} className="text-teal" />
                      : done ? <XCircle size={14} className="text-red-500" />
                        : <BookOpen size={14} className="text-ink-muted" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{ch.question}</p>
                    <p className="text-xs text-ink-muted">{ch.category} · {ch.date}</p>
                  </div>
                  {done && (
                    <Badge color={done.correct ? 'teal' : 'red'} size="xs">
                      {done.correct ? 'Correct' : 'Missed'}
                    </Badge>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
