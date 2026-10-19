import { createContext, useContext, useReducer, useEffect } from 'react';
import {
  PARTICIPANTS,
  EVENTS,
  TEAMS,
  REGISTRATIONS,
  DAILY_CHALLENGES,
} from '../data/demoData';

// ─── Initial User Profile & Templates ─────────────────────────────────────
export const INITIAL_USER_PROFILE = {
  id: 'user-me',
  name: '',
  avatar: null,
  initials: 'YOU',
  tagline: '',
  bio: '',
  skills: [], // Empty by default: person creates their own profile from scratch
  interests: [],
  preferredRoles: [],
  availability: { hoursPerWeek: 15, timezone: 'UTC+0', constraints: [] },
  links: { github: '', portfolio: '', linkedin: '' },
  joinedAt: new Date().toISOString().split('T')[0],
  evidenceCount: 0,
  isCustomProfile: true,
  isNew: true,
};

export const PROFILE_TEMPLATES = [
  {
    id: 'blank',
    name: 'Blank Canvas (Start from 0)',
    description: 'Clear everything out and craft your profile completely from scratch.',
    data: {
      name: '',
      tagline: '',
      bio: '',
      skills: [],
      interests: [],
      preferredRoles: [],
    },
  },
  {
    id: 'frontend',
    name: 'Frontend Developer',
    description: 'Specializes in UI/UX architecture, React, modern CSS and performance.',
    data: {
      name: 'Alex Chen',
      tagline: 'Frontend developer passionate about snappy interactions and clean components.',
      bio: 'Enjoys crafting accessible, responsive user interfaces and partnering with designers and backend teams.',
      skills: [
        { id: 's-t1', name: 'React', category: 'Frontend', proficiency: 3 },
        { id: 's-t2', name: 'TypeScript', category: 'Frontend', proficiency: 2 },
        { id: 's-t3', name: 'CSS', category: 'Frontend', proficiency: 3 },
        { id: 's-t4', name: 'Vite', category: 'Frontend', proficiency: 2 },
      ],
      interests: ['Design Systems', 'Developer Tooling', 'Web Performance'],
      preferredRoles: ['Frontend Lead', 'Full-stack Engineer'],
    },
  },
  {
    id: 'fullstack',
    name: 'Full-Stack Engineer',
    description: 'Bridges user interfaces, RESTful APIs, and relational databases.',
    data: {
      name: 'Samira Khan',
      tagline: 'Full-stack builder moving fast from concept to working prototype.',
      bio: 'Comfortable across React, Node.js, and databases. Excited about team sprints and hackathons.',
      skills: [
        { id: 's-t1', name: 'React', category: 'Frontend', proficiency: 3 },
        { id: 's-t2', name: 'Node.js', category: 'Backend', proficiency: 3 },
        { id: 's-t3', name: 'Python', category: 'Backend', proficiency: 2 },
        { id: 's-t4', name: 'SQL', category: 'Data', proficiency: 2 },
      ],
      interests: ['Hackathons', 'SaaS Products', 'Open Source'],
      preferredRoles: ['Full-stack Engineer', 'Team Lead'],
    },
  },
  {
    id: 'ai_ml',
    name: 'AI & Machine Learning Specialist',
    description: 'Model pipelines, LLM prompt engineering, and Python backend services.',
    data: {
      name: 'Elena Rostova',
      tagline: 'ML researcher integrating intelligent algorithms into real applications.',
      bio: 'Working with Python, vector retrieval, and model fine-tuning. Looking for teams with interesting domain problems.',
      skills: [
        { id: 's-t1', name: 'Python', category: 'Backend', proficiency: 4 },
        { id: 's-t2', name: 'PyTorch', category: 'AI/ML', proficiency: 3 },
        { id: 's-t3', name: 'Data Visualization', category: 'Data', proficiency: 3 },
        { id: 's-t4', name: 'FastAPI', category: 'Backend', proficiency: 3 },
      ],
      interests: ['AI/ML', 'Generative Agents', 'Data Pipelines'],
      preferredRoles: ['AI/ML Engineer', 'Data Engineer'],
    },
  },
  {
    id: 'design',
    name: 'Product & UI/UX Designer',
    description: 'Design systems, user flows, wireframes, and high-fidelity Figma prototypes.',
    data: {
      name: 'Jordan Lee',
      tagline: 'Product designer focused on intuitive UX and thoughtful craft.',
      bio: 'Turns ambiguous requirements into clear, delightful interfaces. Deeply appreciates design tokens and developer handoff.',
      skills: [
        { id: 's-t1', name: 'UX Design', category: 'Design', proficiency: 4 },
        { id: 's-t2', name: 'Figma', category: 'Design', proficiency: 4 },
        { id: 's-t3', name: 'User Research', category: 'Design', proficiency: 3 },
        { id: 's-t4', name: 'Design Systems', category: 'Design', proficiency: 3 },
      ],
      interests: ['Design Systems', 'Micro-interactions', 'Accessibility'],
      preferredRoles: ['UI/UX Designer', 'Creative Director'],
    },
  },
];

// ─── Initial State ────────────────────────────────────────────────────────
const STORAGE_KEY = 'teamweave_demo_state';

const defaultState = {
  // Session
  currentRole: 'participant', // 'participant' | 'organizer'
  currentUserId: 'user-me',   // active personal user profile (not dummy pre-filled)

  // Data
  participants: [INITIAL_USER_PROFILE, ...PARTICIPANTS],
  events: EVENTS,
  teams: TEAMS,
  registrations: [
    { eventId: 'ev1', participantId: 'user-me', registeredAt: '2025-10-01' },
    ...REGISTRATIONS,
  ],
  dailyChallenges: DAILY_CHALLENGES,
  challengeHistory: {}, // { challengeId: { answer, correct, completedAt } }
  streak: 0,
  badges: [],

  // Organizer workspace
  organizerEventId: 'ev1',  // which event the organizer is currently managing
  generatedTeams: [],       // last generate run

  // UI
  toasts: [],
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const saved = JSON.parse(raw);
    
    // Ensure user-me exists in participants so active user has their own profile
    let participants = saved.participants ?? defaultState.participants;
    if (!participants.some(p => p.id === 'user-me')) {
      participants = [INITIAL_USER_PROFILE, ...participants];
    }

    // If previously saved user was 'p1' (the dummy profile from older code), migrate to 'user-me'
    const currentUserId = (saved.currentUserId && saved.currentUserId !== 'p1')
      ? saved.currentUserId
      : 'user-me';

    return {
      ...defaultState,
      currentRole: saved.currentRole ?? defaultState.currentRole,
      currentUserId,
      participants,
      events: saved.events ?? defaultState.events,
      teams: saved.teams ?? defaultState.teams,
      registrations: saved.registrations ?? defaultState.registrations,
      challengeHistory: saved.challengeHistory ?? {},
      streak: saved.streak ?? 0,
      badges: saved.badges ?? [],
    };
  } catch {
    return defaultState;
  }
}

// ─── Reducer ──────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case 'SET_ROLE':
      return { ...state, currentRole: action.payload };

    case 'SET_USER':
      return { ...state, currentUserId: action.payload };

    case 'RESET_DEMO':
      return { ...defaultState, toasts: [] };

    // ─── Authentication ───
    case 'LOGIN': {
      const { userId, role } = action.payload;
      return {
        ...state,
        currentUserId: userId,
        currentRole: role || (userId === 'org1' ? 'organizer' : 'participant'),
        isAuthenticated: true,
      };
    }

    case 'SIGNUP': {
      const { name, email, role, primarySkill } = action.payload;
      const initials = name
        ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : 'U';
      const newId = `user-${Date.now()}`;
      const newParticipant = {
        id: newId,
        name,
        email,
        initials,
        tagline: `${primarySkill || 'Member'} contributor`,
        bio: 'Excited to collaborate on ambitious events and build balanced teams.',
        skills: primarySkill ? [
          { id: `s-${Date.now()}`, name: primarySkill, category: 'Technical', proficiency: 3 }
        ] : [],
        interests: ['Hackathons', 'Collaborative Sprints'],
        preferredRoles: [role === 'organizer' ? 'Event Host' : 'Contributor'],
        availability: { hoursPerWeek: 15, timezone: 'UTC+0', constraints: [] },
        links: { github: '', portfolio: '', linkedin: '' },
        joinedAt: new Date().toISOString().split('T')[0],
        isCustomProfile: true,
      };

      return {
        ...state,
        participants: [newParticipant, ...state.participants],
        currentUserId: newId,
        currentRole: role || 'participant',
        isAuthenticated: true,
      };
    }

    case 'LOGOUT': {
      return {
        ...state,
        currentUserId: 'user-me',
        isAuthenticated: false,
      };
    }

    // Profile
    case 'UPDATE_PROFILE': {
      const updated = state.participants.map(p =>
        p.id === action.payload.id ? { ...p, ...action.payload.data } : p
      );
      return { ...state, participants: updated };
    }

    // Skills
    case 'ADD_SKILL': {
      const updated = state.participants.map(p => {
        if (p.id !== action.payload.userId) return p;
        const newSkill = { ...action.payload.skill, id: `s-${Date.now()}` };
        return { ...p, skills: [...p.skills, newSkill] };
      });
      return { ...state, participants: updated };
    }
    case 'UPDATE_SKILL': {
      const updated = state.participants.map(p => {
        if (p.id !== action.payload.userId) return p;
        const skills = p.skills.map(s =>
          s.id === action.payload.skillId ? { ...s, ...action.payload.data } : s
        );
        return { ...p, skills };
      });
      return { ...state, participants: updated };
    }
    case 'REMOVE_SKILL': {
      const updated = state.participants.map(p => {
        if (p.id !== action.payload.userId) return p;
        return { ...p, skills: p.skills.filter(s => s.id !== action.payload.skillId) };
      });
      return { ...state, participants: updated };
    }

    // Events
    case 'ADD_EVENT': {
      const newEvent = { ...action.payload, id: `ev-${Date.now()}`, status: 'open', registeredCount: 0 };
      return { ...state, events: [...state.events, newEvent] };
    }
    case 'UPDATE_EVENT': {
      const updated = state.events.map(e =>
        e.id === action.payload.id ? { ...e, ...action.payload.data } : e
      );
      return { ...state, events: updated };
    }

    // Registrations
    case 'REGISTER': {
      const exists = state.registrations.find(
        r => r.participantId === action.payload.participantId && r.eventId === action.payload.eventId
      );
      if (exists) return state;
      const newReg = { ...action.payload, status: 'registered', joinedAt: new Date().toISOString().slice(0, 10) };
      const updatedEvents = state.events.map(e =>
        e.id === action.payload.eventId ? { ...e, registeredCount: e.registeredCount + 1 } : e
      );
      return { ...state, registrations: [...state.registrations, newReg], events: updatedEvents };
    }
    case 'UNREGISTER': {
      const filtered = state.registrations.filter(
        r => !(r.participantId === action.payload.participantId && r.eventId === action.payload.eventId)
      );
      const updatedEvents = state.events.map(e =>
        e.id === action.payload.eventId ? { ...e, registeredCount: Math.max(0, e.registeredCount - 1) } : e
      );
      return { ...state, registrations: filtered, events: updatedEvents };
    }

    // Teams
    case 'SET_GENERATED_TEAMS':
      return { ...state, generatedTeams: action.payload };

    case 'SAVE_TEAMS': {
      const newTeams = action.payload;
      const existingIds = new Set(newTeams.map(t => t.id));
      const kept = state.teams.filter(t => !existingIds.has(t.id));
      return { ...state, teams: [...kept, ...newTeams] };
    }

    case 'PUBLISH_TEAM': {
      const updated = state.teams.map(t =>
        t.id === action.payload ? { ...t, status: 'published', publishedAt: new Date().toISOString().slice(0, 10) } : t
      );
      return { ...state, teams: updated };
    }

    case 'REMOVE_TEAM_MEMBER': {
      const updated = state.teams.map(t => {
        if (t.id !== action.payload.teamId) return t;
        const members = t.members.filter(m => m.participantId !== action.payload.participantId);
        return { ...t, members };
      });
      return { ...state, teams: updated };
    }

    case 'ADD_TEAM_MEMBER': {
      const updated = state.teams.map(t => {
        if (t.id !== action.payload.teamId) return t;
        const alreadyIn = t.members.some(m => m.participantId === action.payload.participantId);
        if (alreadyIn) return t;
        return { ...t, members: [...t.members, { participantId: action.payload.participantId, role: action.payload.role || 'Member' }] };
      });
      return { ...state, teams: updated };
    }

    case 'SET_ORGANIZER_EVENT':
      return { ...state, organizerEventId: action.payload };

    // Challenges
    case 'SUBMIT_CHALLENGE': {
      const { challengeId, answer, correct } = action.payload;
      const history = {
        ...state.challengeHistory,
        [challengeId]: { answer, correct, completedAt: new Date().toISOString() },
      };
      const streak = correct ? state.streak + 1 : 0;
      const badges = [...state.badges];
      if (streak === 3 && !badges.includes('three-streak')) badges.push('three-streak');
      if (streak === 7 && !badges.includes('seven-streak')) badges.push('seven-streak');
      return { ...state, challengeHistory: history, streak, badges };
    }

    // Toasts
    case 'ADD_TOAST': {
      const toast = { id: Date.now(), ...action.payload };
      return { ...state, toasts: [...state.toasts, toast] };
    }
    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.payload) };

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────
const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  // Persist to localStorage on state change (exclude toasts)
  useEffect(() => {
    const { toasts, generatedTeams, ...persistable } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

// ─── Selector helpers ─────────────────────────────────────────────────────
export function useCurrentUser() {
  const { state } = useApp();
  return state.participants.find(p => p.id === state.currentUserId) ?? state.participants[0];
}

export function useEvent(eventId) {
  const { state } = useApp();
  return state.events.find(e => e.id === eventId);
}

export function useParticipant(participantId) {
  const { state } = useApp();
  return state.participants.find(p => p.id === participantId);
}

export function useTeamForEvent(eventId) {
  const { state } = useApp();
  const { currentUserId } = state;
  return state.teams.find(
    t => t.eventId === eventId && t.members.some(m => m.participantId === currentUserId)
  );
}

export function useRegistration(userId, eventId) {
  const { state } = useApp();
  return state.registrations.find(r => r.participantId === userId && r.eventId === eventId);
}

export function useIsRegistered(userId, eventId) {
  return !!useRegistration(userId, eventId);
}
