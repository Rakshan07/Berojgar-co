# TeamWeave — Design System

## Brand Identity: Living Weave

TeamWeave's visual identity is built around the metaphor of weaving — individual strands (people with skills) interlock to form a resilient, balanced structure (a team).

---

## Color Palette

| Token | Hex | Usage |
|---|---|---|
| `--color-paper` | `#F6F4ED` | App background (warm, not pure white) |
| `--color-surface` | `#FFFDF8` | Card surfaces, dialogs |
| `--color-ink` | `#182724` | Primary text, headings |
| `--color-ink-secondary` | `#68746E` | Secondary text, labels |
| `--color-ink-muted` | `#87918B` | Placeholder text, metadata |
| `--color-border` | `#E2E3DB` | Dividers, card outlines |
| **Brand** | | |
| `--color-teal` | `#17A982` | Primary actions, coverage, success |
| `--color-teal-light` | `#DDF4E9` | Teal tint backgrounds |
| `--color-teal-pale` | `#F0FAF5` | Very light teal backgrounds |
| **Accents** | | |
| `--color-cobalt` | `#536FF1` | Organizer UI, AI suggestions, info |
| `--color-coral` | `#ED8B76` | Warnings, management skills |
| `--color-gold` | `#D5A747` | Caution, preferred (not required) |
| `--color-violet` | `#8676D8` | AI/ML category, badges |

### Semantic Color Rules
- **Teal** = covered, success, participant, registered
- **Cobalt** = organizer, suggested, informational
- **Coral** = management, warnings, partial coverage
- **Gold** = preferred skills, streaks, attention (not critical)
- **Red** = critical gaps, errors, departures

---

## Typography

| Role | Font | Weight | Notes |
|---|---|---|---|
| Headings (h1–h6) | Space Grotesk | 600–700 | Tracking: -0.02em |
| Body text | Inter | 400–500 | Line height: 1.6 |
| Monospace | DM Mono | 400–500 | IDs, metadata only |

### Type Scale
- `text-xs` — metadata, labels (12px)
- `text-sm` — body, descriptions (14px)
- `text-base` — primary body (15px)
- `text-lg` — card titles (18px)
- `text-xl` — section headers (20px)
- `text-2xl` — page titles (24px)

---

## Logo / Brand Mark

The brand mark (`BrandMark.jsx`) is a pure SVG of three interlocking strands:
- **Teal strand** (#17A982) — curves downward
- **Cobalt strand** (#536FF1) — middle wave
- **Coral strand** (#ED8B76) — curves upward

They cross at a central knot node (dark circle). The `BrandWordmark` combines the mark with "Team**Weave**" in Space Grotesk.

---

## Component Catalogue

### UI Primitives (`src/components/ui/`)

| Component | File | Description |
|---|---|---|
| `Button` | `Button.jsx` | Variants: primary, secondary, ghost, danger, outline. Sizes: xs/sm/md/lg |
| `IconButton` | `Button.jsx` | Square icon-only button |
| `Badge` | `Badge.jsx` | Colored label. Colors: teal/cobalt/coral/gold/violet/ink/red |
| `SkillTag` | `Badge.jsx` | Skill chip with category color, optional proficiency |
| `Card` | `Card.jsx` | Surface container. Padding: sm/md/lg/xl |
| `SectionHeader` | `Card.jsx` | Title + optional subtitle + optional action slot |
| `EmptyState` | `Card.jsx` | Icon + title + description + optional action |
| `StatCard` | `Card.jsx` | Labeled metric display |
| `ConfirmDialog` | `Card.jsx` | Accessible confirmation modal |
| `Spinner` | `Card.jsx` | Loading indicator |
| `ProgressSteps` | `Card.jsx` | Wizard step indicator |
| `CoverageBar` | `Card.jsx` | Required/preferred skill coverage progress |
| `ProficiencyPips` | `Card.jsx` | 4-dot proficiency level display |
| `Avatar` | `Card.jsx` | Initials-based avatar with color cycling |
| `Divider` | `Card.jsx` | Horizontal rule with optional label |
| `ToastContainer` | `ToastContainer.jsx` | Fixed-position toast notification list |

### Team Components (`src/components/teams/`)

| Component | File | Description |
|---|---|---|
| `LivingWeaveViz` | `LivingWeaveViz.jsx` | Data-driven SVG: member nodes → skill nodes → connections + gaps |
| `TeamBlueprint` | `TeamBlueprint.jsx` | Full team card: members, coverage, gaps, reasons, status |

### Event Components (`src/components/events/`)

| Component | File | Description |
|---|---|---|
| `EventCard` | `EventCard.jsx` | Linked event summary card for discovery grid |

### Layout (`src/components/layout/`)

| Component | File | Description |
|---|---|---|
| `AppShell` | `AppShell.jsx` | Sticky header + role switcher + mobile drawer + footer |

---

## Proficiency Levels

1. **Exploring** — Aware of the concept, limited practice
2. **Developing** — Can apply with guidance
3. **Independent** — Works confidently without supervision
4. **Advanced / Can mentor** — Deep expertise, guides others

Stored as integers 1–4. Never label a skill "verified" without an actual verification process.

---

## Event Category Colors

| Category | Color Token |
|---|---|
| Hackathon | Cobalt |
| Debate | Coral |
| Research | Teal |
| Creative | Gold |
| Academic | Violet |
| Startup | Coral |

---

## Animation Classes

Defined in `index.css`:
- `.animate-fadeIn` — page/section entrances
- `.animate-slideInRight` — mobile drawer
- `.animate-scaleIn` — modals and dialogs
- `.animate-toastIn` — toast notifications
- `.animate-pulse-soft` — loading skeletons

All animations respect `prefers-reduced-motion`.

---

## Design Principles

1. **Requirements-first** — Every recommendation traces to a specific event requirement
2. **Gaps are visible** — A missing critical skill is never hidden behind a score
3. **No random groupings** — Teams are formed from actual skill data
4. **Reusable profiles** — Participants fill in skills once; every event reuses them
5. **Domain-agnostic** — Requirements are configurable data, not hardcoded programmer/designer/presenter roles
