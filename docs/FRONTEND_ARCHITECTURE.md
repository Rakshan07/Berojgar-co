# TeamWeave — Frontend Architecture

## Running the app

```bash
npm install       # install dependencies
npm run dev       # start dev server → http://localhost:5173/
npm run build     # production build (verify correctness)
npm run lint      # lint check
```

The landing page is at `/`. Enter the app via **"Enter app"** or the nav links.

---

## Tech Stack

| Tool | Version | Role |
|---|---|---|
| React | 19 | UI framework |
| Vite | 8 | Build tool + dev server |
| React Router v7 | latest | Client-side routing |
| Tailwind CSS v4 | latest | Utility CSS (via @tailwindcss/vite) |
| Lucide React | latest | Icon system |
| JavaScript (ES modules) | — | No TypeScript yet |

---

## Directory Structure

```
src/
  app/
    AppContext.jsx         ← Global state (useReducer + context + localStorage)
  components/
    layout/
      AppShell.jsx         ← Header, nav, mobile drawer, demo banner
    ui/
      BrandMark.jsx        ← SVG logo + wordmark
      Button.jsx           ← Button, IconButton
      Badge.jsx            ← Badge, SkillTag
      Card.jsx             ← Card, EmptyState, StatCard, Dialog, Spinner,
                             ProgressSteps, CoverageBar, ProficiencyPips, Avatar
      ToastContainer.jsx   ← Toast notification system
    teams/
      LivingWeaveViz.jsx   ← SVG team visualization
      TeamBlueprint.jsx    ← Full team detail card
    events/
      EventCard.jsx        ← Discovery grid card
  data/
    demoData.js            ← All fictional demo records (participants, events, teams…)
  hooks/
    useToast.js            ← Toast dispatch helper
  pages/
    public/
      LandingPage.jsx
    participant/
      Dashboard.jsx
      ProfilePage.jsx
      EventDiscovery.jsx
      EventDetail.jsx
      MyTeamPage.jsx
      DailyChallenge.jsx
    organizer/
      OrganizerDashboard.jsx
      OrganizerEvents.jsx
      CreateEventWizard.jsx
      ParticipantRoster.jsx
      TeamFormation.jsx
  services/
    matchingService.js     ← Demo team formation logic (replaceable module)
  App.jsx                  ← Router + AppProvider
  main.jsx                 ← React entry point
  index.css                ← Global styles + design tokens (@theme)
docs/
  DESIGN_SYSTEM.md
  FRONTEND_ARCHITECTURE.md
```

---

## Application State

All state lives in `AppContext.jsx` using `useReducer`. It is persisted to `localStorage` under the key `teamweave_demo_state` on every render.

### State shape

```js
{
  currentRole: 'participant' | 'organizer',
  currentUserId: 'p1',          // demo participant

  participants: [...],          // editable
  events: [...],                // editable
  teams: [...],                 // proposed + published
  registrations: [...],
  dailyChallenges: [...],
  challengeHistory: {},
  streak: 0,
  badges: [],

  organizerEventId: 'ev1',      // which event organizer is viewing
  generatedTeams: [],           // last generate run (not persisted)
  toasts: [],                   // not persisted
}
```

### Key actions

| Action type | Effect |
|---|---|
| `SET_ROLE` | Switch between participant / organizer view |
| `RESET_DEMO` | Restore all demo data to defaults |
| `UPDATE_PROFILE` | Edit a participant's profile fields |
| `ADD_SKILL` / `UPDATE_SKILL` / `REMOVE_SKILL` | Manage profile skills |
| `ADD_EVENT` | Create a new event (from wizard) |
| `REGISTER` / `UNREGISTER` | Join or leave an event |
| `SET_GENERATED_TEAMS` | Store last generate run in memory |
| `SAVE_TEAMS` | Persist generated teams to `state.teams` |
| `PUBLISH_TEAM` | Mark a team as published |
| `REMOVE_TEAM_MEMBER` | Remove member (triggers replacement flow) |
| `ADD_TEAM_MEMBER` | Add replacement member |
| `SUBMIT_CHALLENGE` | Record challenge answer, update streak |
| `ADD_TOAST` / `REMOVE_TOAST` | Show/hide notifications |

---

## Demo Data (`src/data/demoData.js`)

All fictional. Never present as real.

| Export | Contents |
|---|---|
| `PARTICIPANTS` | 6 diverse profiles (p1–p6) with varied skills, proficiency, availability |
| `EVENTS` | 5 events across hackathon, debate, research, creative, academic categories |
| `TEAMS` | 2 pre-proposed teams (one good coverage, one with gaps) |
| `REGISTRATIONS` | Who has joined which event |
| `DAILY_CHALLENGES` | 2 sample questions |
| `SKILL_LIBRARY` | ~35 searchable skills |
| `PROFICIENCY_LEVELS` | Levels 1–4 with labels and descriptions |
| `AI_DEMO_SUGGESTIONS` | Sample suggestions per category for the event wizard assistant |
| `EVENT_CATEGORIES` | Labels + colors for the 7 event types |

---

## Service Modules

### `matchingService.js`

**This is a demo service.** It contains no AI. It is deterministic frontend logic.

Exports:
- `generateTeamSuggestions(event, participants)` → `Promise<Team[]>`
  - Reads `event.requirements` and `participants[].skills`
  - Scores participants against requirements
  - Fills teams greedily, prioritising required capabilities and complementarity
  - Returns coverage notes, match reasons, and missing requirements
  - Simulates async latency (1.2s)

- `computeReplacementSuggestions(team, removedId, allParticipants, event)`
  - Recalculates coverage after removal
  - Returns `{ newGaps, candidates }` ranked by gap coverage

**To connect the backend:** Replace the body of both functions with `fetch()` calls to your FastAPI endpoints. The return type shapes must match.

---

## Page Routes

| Path | Page | Role |
|---|---|---|
| `/` | LandingPage | Public |
| `/dashboard` | ParticipantDashboard | Participant |
| `/profile` | ProfilePage | Participant |
| `/events` | EventDiscovery | Participant |
| `/events/:eventId` | EventDetail | Participant |
| `/my-team` | MyTeamPage | Participant |
| `/challenge` | DailyChallenge | Participant |
| `/organizer` | OrganizerDashboard | Organizer |
| `/organizer/events` | OrganizerEvents | Organizer |
| `/organizer/create` | CreateEventWizard | Organizer |
| `/organizer/roster` | ParticipantRoster | Organizer |
| `/organizer/teams` | TeamFormation | Organizer |

The role switcher in the header lets you switch views without a real auth system.

---

## Connecting the Backend

When a Python/FastAPI backend is ready:

1. **Replace service functions** in `matchingService.js` with `fetch()` calls.
2. **Replace AppContext data** loading with API calls (e.g. `GET /api/events`, `GET /api/participants/me`).
3. **Add an auth layer**: replace the role switcher with real JWT or session auth.
4. **Keep the data shapes**: the frontend expects the same object structures — don't rename fields.

Suggested FastAPI endpoints to implement first:
- `POST /api/teams/generate` — accepts event + participants, returns team suggestions
- `GET /api/events` / `POST /api/events`
- `GET /api/participants/me` / `PATCH /api/participants/me`
- `POST /api/events/{id}/register` / `DELETE /api/events/{id}/register`
- `POST /api/teams/{id}/publish`

---

## Demo Reset

Use the **"Reset demo"** button in the header or the role menu. This calls `dispatch({ type: 'RESET_DEMO' })` which restores all state to `defaultState` (the original demo data) and clears localStorage.

---

## What Is and Isn't Real

| Feature | Status |
|---|---|
| Navigation, routing | ✅ Real |
| Profile editing | ✅ Real (localStorage) |
| Event joining/leaving | ✅ Real (localStorage) |
| Skill management | ✅ Real (localStorage) |
| Event creation wizard | ✅ Real (localStorage) |
| Team Blueprint | ✅ Real (from demo data) |
| Living Weave visualization | ✅ Real (data-driven SVG) |
| Team generation | ✅ Demo logic (not AI) |
| Member departure + replacement | ✅ Demo logic |
| Daily challenge interaction | ✅ Real (localStorage) |
| Streak & badges | ✅ Demo-only |
| AI event suggestions | ❌ Demo panel only (no real model) |
| Authentication | ❌ Role switcher only |
| Backend API | ❌ All data is local |
| Email / notifications | ❌ Not implemented |
