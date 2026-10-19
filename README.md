# Berojgar-co (TeamWeave)

An elegant, explainable skill-based teaming architecture and event management platform built with React, Vite, Tailwind CSS, and WebGL LightRays.

---

## ✨ Features

- **Skill-Based Teaming Matrix**: Deterministic matching algorithm reading actual participant skill proficiencies, required roles, and coverage gaps rather than black-box scores.
- **Living Weave Interactive Constellation**: Dynamic SVG visualization rendering participant nodes, capability coverage, and uncovered skill gaps in an orbit layout.
- **Luxury Purple & Obsidian Aesthetic**: Tailored deep obsidian background (`#07050D`), royal violet (`#8B5CF6`, `#A855F7`), and platinum typography without harsh neon effects.
- **Complete Auth & Persona System**:
  - Sign In and Sign Up modal & dedicated `/login` page.
  - 1-click test personas (*Alex Chen*, *Marcus Osei*, *Elena Rostova*, *Sarah Lin*).
  - Role-based views (*Participant* vs. *Event Host* / *Organizer*).
- **Interactive LightRays Canvas**: Smooth GPU-accelerated atmospheric light rays.
- **Full Event Lifecycle**:
  - Event discovery with live category filters, search, and mode filters.
  - Interactive Team Blueprint with role distributions and explanations.
  - Event creation wizard, participant roster management, and draft team publishing.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation
```bash
# Clone the repository
git clone https://github.com/Rakshan07/Berojgar-co.git

# Navigate to project directory
cd Berojgar-co

# Install dependencies
npm install

# Start development server
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

---

## 🛠️ Tech Stack

- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS + Custom Obsidian Purple Design Tokens
- **Icons**: Lucide React
- **Animations**: CSS Transforms & Custom GPU Shader LightRays
- **State Management**: React Context + Reducer Architecture with Session Persistence
