import Documents from './Documents';
import { useContext, useState, useEffect } from 'react';
import { Link, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { 
  ArrowUpRight, ArrowRight, CalendarDays, Users, UserRound, LayoutDashboard, 
  ClipboardCheck, Compass, Plus, Menu, X, LogOut, Flag, Code2, Cpu, Mic, 
  ShieldCheck, Search, Award, CheckCircle, Sparkles, AlertCircle, MessageSquare 
} from 'lucide-react';
import { useApp } from '../app/AppContext';
import { BrandWordmark } from '../components/ui/BrandMark';
import { useResource, categories, request, categoryName, eventDate } from './api';
import { CreateEvent } from './CreateEvent';
import { Assessment } from './Assessment';
import { TeamManagement } from './TeamManagement';
import './workspace.css';
import { Account } from './account';

export function Action({ to, children, secondary = false }) { 
  return <Link className={`tw-button ${secondary ? 'secondary' : ''}`} to={to}>{children}<ArrowUpRight size={16}/></Link>; 
}
export function Heading({ eyebrow, title, description, children }) { 
  return <div className="tw-heading"><div><p className="tw-eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{children}</div>; 
}
export function Panel({ title, description, action, children }) { 
  return <section className="tw-panel"><div className="tw-panelhead"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>{children}</section>; 
}
export function Empty({ icon: Icon = Compass, title, description, children }) { 
  return <div className="tw-empty"><div className="tw-empty-symbol"><Icon size={24}/></div><h3>{title}</h3><p>{description}</p>{children}</div>; 
}
export function ResourceState({ resource, children }) { 
  if (resource.loading) return <div className="tw-empty" role="status">Loading…</div>; 
  if (resource.error) return <div className="tw-empty" role="alert"><p>{resource.error}</p><button className="tw-button secondary" onClick={resource.reload}>Try again</button></div>; 
  return children; 
}
function Metrics({ items }) { 
  return <div className="tw-metrics">{items.map(([label,value,description,Icon]) => <div className="tw-metric" key={label}><div><Icon size={16}/>{label}</div><strong>{value ?? '—'}</strong><small>{description}</small></div>)}</div>; 
}

const participantNav = [
  ['/dashboard','Overview',LayoutDashboard],
  ['/events','Explore events',Compass],
  ['/my-events','My events',CalendarDays],
  ['/assessments','Assessments',ClipboardCheck],
  ['/my-team','My teams',Users],
  ['/profile','My Profile',UserRound]
];
const organizerNav = [
  ['/organizer','Overview',LayoutDashboard],
  ['/organizer/events','My events',CalendarDays],
  ['/organizer/create','Create event',Plus],
  ['/organizer/roster','Participants',Users],
  ['/organizer/teams','Team formation',Users],
  ['/organizer/results','Results & contributions',Flag]
];

export function WorkspaceShell() {
  const { state, dispatch } = useApp();
  const location = useLocation(); 
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const hasToken = Boolean(localStorage.getItem('teamweave_token'));
  const account = useResource('/auth/me', hasToken);
  const organizer = location.pathname.startsWith('/organizer');
  const nav = organizer ? organizerNav : participantNav;
  const roles = account.data?.roles || [];
  const organizerAllowed = roles.includes('organizer') || roles.includes('admin');
  const activity = useResource('/workspace/me', hasToken && !organizer);
  const context = { account, hasToken, organizerAllowed, activity };

  async function logout() { 
    try { await request('/auth/logout', {method:'POST'}); } catch { /* offline */ } 
    finally { localStorage.removeItem('teamweave_token'); dispatch({type:'LOGOUT'}); navigate('/'); } 
  }

  if (account.data && !account.data.onboarding_complete) return <Navigate to="/complete-profile" replace/>;

  const pageTitle = nav.find(([path]) => path === location.pathname)?.[1] || 
    (location.pathname.endsWith('/assessment') ? 'Assessment' : 
     location.pathname.endsWith('/teams') ? 'Teams & Chat' : 'Event details');

  return (
    <Account.Provider value={context}>
      <div id="tw-workspace-review">
        <div className="tw-app">
          <aside className="tw-sidebar">
            <Link to="/" className="tw-brand" aria-label="Skillfy home"><BrandWordmark size={20}/></Link>
            <button className="tw-button secondary tw-mobile-menu" aria-label="Toggle navigation" aria-expanded={menu} onClick={() => setMenu(!menu)}>
              {menu ? <X size={18}/> : <Menu size={18}/>}
            </button>
            <p className="tw-navlabel">{organizer ? 'ORGANIZER WORKSPACE' : 'YOUR WORKSPACE'}</p>
            <nav className={`tw-nav ${menu ? 'is-open' : ''}`} aria-label="Workspace">
              {nav.map(([path,label,Icon]) => (
                <NavLink end key={path} to={path} onClick={() => setMenu(false)}>
                  <Icon size={17}/>{label}
                </NavLink>
              ))}
            </nav>
            <div className="tw-sideend">
              {roles.includes('admin') && <Link to="/admin/organizer-review">Review organizer applications</Link>}
              <p className="tw-sidequote">Different strengths.<br/><em>Shared ambition.</em></p>
              <div className="tw-sideidentity">
                <UserRound/>
                <div>{account.data?.full_name || account.data?.display_name || 'Your account'}<small>{organizer ? 'Organizer workspace' : 'Participant workspace'}</small></div>
              </div>
              {hasToken && <button className="tw-textbutton" onClick={logout}><LogOut size={14}/>Sign out</button>}
            </div>
          </aside>

          <div className="tw-main">
            <header className="tw-topbar">
              <div className="tw-breadcrumb">Workspace <span>/</span><strong>{pageTitle}</strong></div>
              <div className="tw-topmeta"><ShieldCheck size={15}/>{organizer ? 'Organizer' : 'Participant'}</div>
            </header>
            <main className="tw-content">
              {location.pathname === '/profile' && <Documents/>}
              {organizer && !account.data?.organizer_approved && (
                <div className="tw-notice">Organizer verification is required before hosting events. <Link to="/complete-profile">View application / submit documents</Link></div>
              )}
              {!hasToken && (
                <div className="tw-notice">
                  <p>Sign in to load your personal events, profile, and team activity.</p>
                  <Action to={organizer ? '/organizer/auth' : '/login'}>Sign in</Action>
                </div>
              )}
              {hasToken && account.error && (
                <div className="tw-notice" role="alert">
                  <p>{account.error}</p><button className="tw-button secondary" onClick={account.reload}>Retry</button>
                </div>
              )}
              <WorkspacePage path={location.pathname} organizer={organizer} state={state}/>
              <footer className="tw-bottomline">
                <span>Skillfy · Made for collaboration.</span>
                <span>Different strengths. Shared ambition.</span>
              </footer>
            </main>
          </div>
        </div>
      </div>
    </Account.Provider>
  );
}

function WorkspacePage({ path, organizer, state }) {
  if (path === '/profile') return <Profile/>;
  if (path === '/events') return <Events/>;
  if (path.startsWith('/events/') && path.endsWith('/assessment')) {
    return <Assessment eventId={path.split('/')[2]}/>;
  }
  if (path.startsWith('/events/') && path.endsWith('/teams')) {
    return <TeamManagement eventId={path.split('/')[2]}/>;
  }
  if (path.startsWith('/events/')) return <EventDetail id={path.split('/')[2]}/>;
  if (path === '/organizer/create') return <CreateEvent/>;
  if (path === '/organizer' || path === '/organizer/events') return <Organizer manage={path.endsWith('/events')}/>;
  if (path === '/dashboard') return <Home/>;
  if (path === '/my-team') return <MyTeamsHub/>;
  if (path === '/assessments') return <AssessmentsHub/>;

  const title = path === '/my-events' ? 'From joining to making an impact.' : organizer ? 'Make room for meaningful contributions.' : 'Your next chapter starts here.';
  return (
    <>
      <Heading eyebrow={organizer ? 'ORGANIZER WORKSPACE' : 'YOUR JOURNEY'} title={title} description="Your events, people, and progress in one place."/>
      <Panel title={path === '/organizer/results' ? 'Results & contributions' : 'Your activity'}>
        <ActivityList path={path} organizer={organizer}/>
        <div className="tw-empty">
          <Action to={organizer ? '/organizer/events' : '/events'} secondary>{organizer ? 'View my events' : 'Explore events'}</Action>
        </div>
      </Panel>
    </>
  );
}

function ActivityList({path,organizer}) {
 const {activity,account}=useContext(Account); 
 const org=useResource('/organizer/workspace',Boolean(organizer&&account.data));
 if(path==='/my-events') return <ActivityTabs/>;
 const resource=organizer?org:activity;
 const key=organizer?(path.endsWith('roster')?'participants':path.endsWith('results')?'outcomes':'teams'):'teams';
 const items=resource.data?.[key]||[];
 return (
   <ResourceState resource={resource}>
     {items.length ? (
       <div className="tw-event-list">
         {items.map((item,i) => (
           <article className="tw-event-card" key={item.id||`${item.event_id}-${item.user_id}-${i}`}>
             <h3>{item.name||item.title||item.display_name}</h3>
             <p>{item.event_title}</p>
             <span className="tw-badge">{item.status}</span>
             {item.outcome_type && <p>{item.outcome_type}</p>}
           </article>
         ))}
       </div>
     ) : (
       <Empty icon={Users} title={resource.data?'Nothing here yet.':'Sign in to view your activity.'} description="Only your recorded events and account activity appear here."/>
     )}
   </ResourceState>
 );
}

function Home() {
  const { activity, hasToken } = useContext(Account); 
  const suggestions = useResource('/workspace/suggestions', hasToken); 
  const summary=activity.data;
  return (
    <>
      <Heading eyebrow="YOUR NEXT CHAPTER" title="Find your next challenge." description="Discover opportunities, bring your strengths, and build something together.">
        <Action to="/events">Explore events</Action>
      </Heading>
      <Metrics items={[
        ["Joined events",summary?.registrations.length,'Your registrations',CalendarDays],
        ["Active teams",summary?.teams.length,'Your collaborations',Users],
        ["Completed events",summary?.history.length,'Verified outcomes',Flag]
      ]}/>
      <div className="tw-grid">
        <div className="tw-stack">
          <Panel title="Suggested for you" description="Opportunities that fit your skills and interests." action={<span className="tw-badge">For your next chapter</span>}>
            <ResourceState resource={suggestions}>
              {suggestions.data?.items?.length ? (
                <EventCards items={suggestions.data.items}/>
              ) : (
                <Empty title="The right opportunity is worth finding." description="Published events with skills that overlap your profile will appear here. Explore every open event in the meantime.">
                  <Action to="/events" secondary>Browse all events</Action>
                </Empty>
              )}
            </ResourceState>
          </Panel>
          <Panel title="Your events" action={<Action to="/my-events" secondary>View all</Action>}>
            <ActivityTabs/>
          </Panel>
          <Panel title="Follow your interests">
            <div className="tw-categories">
              {categories.slice(0,12).map(([id,label]) => (
                <Link className="tw-chip" key={id} to={`/events?category=${id}`}>{label}</Link>
              ))}
            </div>
          </Panel>
        </div>
        <div className="tw-stack">
          <Panel title="A profile that grows with you">
            <Empty icon={UserRound} title="Your strengths. Your story." description="Keep your details, contributions, experience, and completed event history together.">
              <Action to="/profile" secondary>My Profile</Action>
            </Empty>
          </Panel>
          <Panel title="Your path to a team">
            {[
              ['Find an event','Choose a challenge you care about.'],
              ['Show how you think','Case studies tailored to your skills and level.'],
              ['Build with your people','Complementary strengths, one shared goal.']
            ].map(([title,text],i) => (
              <div className="tw-smallstep" key={title}>
                <span>{i+1}</span>
                <div><strong>{title}</strong>{text}</div>
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </>
  );
}

function ActivityTabs() {
  const [tab,setTab]=useState('Upcoming'); 
  const {activity,hasToken}=useContext(Account); 
  const [now]=useState(()=>Date.now());
  const items=(activity.data?.registrations||[]).filter(e => 
    tab==='Completed' ? e.status==='completed' : 
    e.status!=='cancelled' && e.status!=='completed' && 
    (tab==='Upcoming' ? new Date(e.starts_at).getTime()>now : new Date(e.starts_at).getTime()<=now && new Date(e.ends_at).getTime()>now)
  );
  return (
    <>
      <div className="tw-rowtabs" role="group" aria-label="Event status">
        {['Upcoming','In progress','Completed'].map(t => (
          <button key={t} className={t===tab?'active':''} aria-pressed={t===tab} onClick={()=>setTab(t)}>{t}</button>
        ))}
      </div>
      <ResourceState resource={activity}>
        {items.length ? (
          <div className="tw-event-list">
            {items.map(e => (
              <article className="tw-event-card" key={e.id}>
                <h3>{e.title}</h3>
                <footer>
                  {eventDate(e.starts_at)}
                  <Action to={`/events/${e.id}`} secondary>View event</Action>
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <Empty icon={CalendarDays} title={hasToken?`No ${tab.toLowerCase()} events yet.`:'Sign in to view your events.'} description="Your registrations and event updates appear here after you join."/>
        )}
      </ResourceState>
    </>
  );
}

function EventCards({ items, organizer = false }) { 
  return (
    <div className="tw-event-list">
      {items.map(event => (
        <article className="tw-event-card" key={event.id}>
          <span className="tw-badge">{categoryName(event)}</span>
          <h3>{event.title}</h3>
          <p>{event.description?.slice(0,200)}</p>
          <footer>
            <span>{eventDate(event.start_date || event.starts_at)} · {event.min_team_size}–{event.max_team_size} people</span>
            <Action to={`/events/${event.id}`} secondary>{organizer ? 'View event' : 'Explore event'}</Action>
          </footer>
        </article>
      ))}
    </div>
  ); 
}

function Events() {
  const location = useLocation(); 
  const [query,setQuery] = useState(''); 
  const [category,setCategory] = useState(new URLSearchParams(location.search).get('category') || 'all'); 
  const [page,setPage] = useState(1);
  const params = new URLSearchParams({ status:'open',page:String(page),limit:'12' }); 
  if(query) params.set('search',query); 
  if(category!=='all') params.set('category',category);
  const events = useResource(`/events?${params}`);

  return (
    <>
      <Heading eyebrow="DISCOVER YOUR NEXT CHALLENGE" title="A place for your skills." description="Explore published events. Find a challenge that fits your interests and experience."/>
      <div className="tw-toolbar">
        <label className="tw-search">
          <Search size={17}/>
          <input aria-label="Search events" placeholder="Search events or interests" value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}}/>
        </label>
        <select className="tw-select" aria-label="Event category" value={category} onChange={e=>{setCategory(e.target.value);setPage(1);}}>
          <option value="all">All categories</option>
          {categories.map(([id,name])=><option key={id} value={id}>{name}</option>)}
        </select>
      </div>
      <Panel title="Open for registration" description="Published opportunities from organizers." action={events.data && <span className="tw-badge">{events.data.total} events</span>}>
        <ResourceState resource={events}>
          {events.data?.items?.length ? (
            <EventCards items={events.data.items}/>
          ) : (
            <Empty icon={CalendarDays} title="The next opportunity starts here." description="No published events match these filters. Check back as organizers open new opportunities."/>
          )}
        </ResourceState>
      </Panel>
      <div className="tw-formactions">
        <button className="tw-button secondary" disabled={page===1 || events.loading} onClick={()=>setPage(page-1)}>Previous</button>
        <span>Page {page}</span>
        <button className="tw-button secondary" disabled={!events.data?.has_more || events.loading} onClick={()=>setPage(page+1)}>Next</button>
      </div>
    </>
  );
}

// ─── Enhanced Event Detail with Event-Specific Intake & Navigation ───────────

function EventDetail({ id }) {
  const event = useResource(`/events/${encodeURIComponent(id)}`);
  const { account, activity } = useContext(Account);
  const regCheck = useResource(`/events/${encodeURIComponent(id)}/registration`, Boolean(account.data));
  const assessmentCheck = useResource(`/events/${encodeURIComponent(id)}/assessment`, Boolean(account.data));
  const [statusMsg, setStatusMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [showRegModal, setShowRegModal] = useState(false);

  // Registration Form State
  const [regForm, setRegForm] = useState({
    skills: '',
    experience_level: 'intermediate',
    preferred_roles: '',
    relevant_experience: '',
    availability_hours_per_week: 10,
    contribution_intent: ''
  });

  const isRegistered = regCheck.data?.registered;
  const canParticipate = account.data?.roles?.includes('participant') && !account.data?.roles?.includes('organizer');
  const isOwner = event.data?.organizer_id === account.data?.id;
  const isDraft = event.data?.status === 'draft';
  const assessmentStatus = assessmentCheck.data?.status;

  async function handlePublish() {
    setBusy(true);
    setStatusMsg('');
    try {
      await request(`/events/${encodeURIComponent(id)}/publish`, { method: 'POST' });
      event.reload();
      setStatusMsg('Event published successfully.');
    } catch (error) {
      setStatusMsg(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setBusy(true);
    setStatusMsg('');
    try {
      const skillsList = regForm.skills.split(',').map(s => s.trim()).filter(Boolean).map(skill_name => ({
        skill_name,
        experience_level: regForm.experience_level
      }));
      const rolesList = regForm.preferred_roles.split(',').map(r => r.trim()).filter(Boolean);

      const payload = {
        selected_skills: skillsList,
        experience_level: regForm.experience_level,
        preferred_roles: rolesList,
        relevant_experience: regForm.relevant_experience.trim() || null,
        availability_hours_per_week: Number(regForm.availability_hours_per_week) || 10,
        contribution_intent: regForm.contribution_intent.trim() || null
      };

      await request(`/events/${encodeURIComponent(id)}/register`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      regCheck.reload();
      activity.reload();
      setShowRegModal(false);
      setStatusMsg('Registration confirmed! You can now take the case study assessment.');
    } catch (error) {
      setStatusMsg(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Heading 
        eyebrow="EVENT OVERVIEW" 
        title={event.data?.title || 'Event details'} 
        description={event.data ? categoryName(event.data) : 'Explore the brief, team requirements, and schedule.'}
      />

      <ResourceState resource={event}>
        {event.data && (
          <div style={{ display: 'grid', gap: 20 }}>
            {statusMsg && <div className="tw-notice" role="status">{statusMsg}</div>}

            <Panel title="The Challenge & Brief">
              <article className="tw-event-card">
                <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>{event.data.description}</p>

                {/* Event Schedule & Capacity */}
                <div className="tw-checklist" style={{ marginBottom: 20 }}>
                  <div><CalendarDays/><h3>Event date</h3><p>{eventDate(event.data.start_date)}</p></div>
                  <div><Users/><h3>Team size</h3><p>{event.data.min_team_size}–{event.data.max_team_size} participants</p></div>
                  <div><Flag/><h3>Registration closes</h3><p>{eventDate(event.data.registration_deadline)}</p></div>
                </div>

                {/* Additional Brief Details */}
                <dl className="tw-details" style={{ padding: 0, marginBottom: 20 }}>
                  {event.data.expected_deliverables && (
                    <div><dt>Expected Deliverables</dt><dd>{event.data.expected_deliverables}</dd></div>
                  )}
                  {event.data.rules && (
                    <div><dt>Rules & Eligibility</dt><dd>{event.data.rules}</dd></div>
                  )}
                  {event.data.constraints_and_tools && (
                    <div><dt>Permitted Tools & Constraints</dt><dd>{event.data.constraints_and_tools}</dd></div>
                  )}
                  {event.data.judging_criteria && (
                    <div><dt>Judging Criteria</dt><dd>{event.data.judging_criteria}</dd></div>
                  )}
                </dl>

                {/* Skills & Roles */}
                {event.data.requirements?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <strong style={{ fontSize: 12, color: 'var(--sf-muted)', display: 'block', marginBottom: 8 }}>Required & Suggested Skills:</strong>
                    <div className="tw-categories" style={{ padding: 0 }}>
                      {event.data.requirements.map(r => (
                        <span className="tw-chip" key={r.id || r.skill_name}>{r.skill_name}</span>
                      ))}
                    </div>
                  </div>
                )}

                {event.data.roles?.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <strong style={{ fontSize: 12, color: 'var(--sf-muted)', display: 'block', marginBottom: 8 }}>Complementary Roles:</strong>
                    <div className="tw-categories" style={{ padding: 0 }}>
                      {event.data.roles.map(r => (
                        <span className="tw-chip" key={r.id || r.name}>{r.name}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions Footer */}
                <footer>
                  <span style={{ fontSize: 12, color: 'var(--sf-muted)' }}>
                    Status: <strong style={{ textTransform: 'capitalize' }}>{event.data.status}</strong>
                  </span>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {isOwner && isDraft && (
                      <button className="tw-button" disabled={busy || !account.data?.organizer_approved} onClick={handlePublish}>
                        Publish event
                      </button>
                    )}

                    {canParticipate && !isRegistered && event.data.status === 'open' && (
                      <button className="tw-button" disabled={!account.data || busy} onClick={() => setShowRegModal(true)}>
                        Register / Participate <ArrowRight size={16}/>
                      </button>
                    )}

                    {canParticipate && isRegistered && (
                      <>
                        <span className="tw-badge" style={{ background: '#E2F2E4', color: '#22552B', border: '1px solid #C4E2C7' }}>
                          <CheckCircle size={13} style={{ marginRight: 4 }} /> Registered
                        </span>
                        <Link className="tw-button" to={`/events/${encodeURIComponent(id)}/assessment`}>
                          <ClipboardCheck size={15} />
                          {assessmentStatus === 'completed' ? 'View Assessment' : 'Take Case Study Assessment'}
                        </Link>
                        <Link className="tw-button secondary" to={`/events/${encodeURIComponent(id)}/teams`}>
                          <Users size={15} /> Team Formation & Chat
                        </Link>
                      </>
                    )}
                  </div>
                </footer>
              </article>
            </Panel>

            {/* Event-Specific Registration Modal/Form */}
            {showRegModal && (
              <Panel title="Event-Specific Registration" description="Tailor your skills, preferred role, and commitment for this event.">
                <form onSubmit={handleRegister} style={{ padding: 20, maxWidth: 640 }}>
                  <label className="tw-field">
                    <span>Your Skills for this Event (comma separated)</span>
                    <input
                      required
                      placeholder="e.g. React, Python, PostgreSQL, System Design"
                      value={regForm.skills}
                      onChange={e => setRegForm({ ...regForm, skills: e.target.value })}
                    />
                  </label>

                  <div className="tw-fieldpair">
                    <label className="tw-field">
                      <span>Experience Level</span>
                      <select 
                        value={regForm.experience_level} 
                        onChange={e => setRegForm({ ...regForm, experience_level: e.target.value })}
                      >
                        <option value="beginner">Beginner (Foundational / Academic)</option>
                        <option value="intermediate">Intermediate (Practical project experience)</option>
                        <option value="advanced">Advanced (Production / Architectural)</option>
                      </select>
                    </label>

                    <label className="tw-field">
                      <span>Preferred Role(s)</span>
                      <input
                        placeholder="e.g. Frontend Lead, Backend Engineer"
                        value={regForm.preferred_roles}
                        onChange={e => setRegForm({ ...regForm, preferred_roles: e.target.value })}
                      />
                    </label>
                  </div>

                  <div className="tw-fieldpair">
                    <label className="tw-field">
                      <span>Time Commitment (hours / week)</span>
                      <input
                        type="number"
                        min={1}
                        max={80}
                        value={regForm.availability_hours_per_week}
                        onChange={e => setRegForm({ ...regForm, availability_hours_per_week: e.target.value })}
                      />
                    </label>

                    <label className="tw-field">
                      <span>Relevant Experience or Projects (optional)</span>
                      <input
                        placeholder="e.g. Built microservices API at hackathon"
                        value={regForm.relevant_experience}
                        onChange={e => setRegForm({ ...regForm, relevant_experience: e.target.value })}
                      />
                    </label>
                  </div>

                  <label className="tw-field">
                    <span>What would you like to contribute? (optional)</span>
                    <textarea
                      rows={3}
                      placeholder="Share your goals and contribution intent for this event..."
                      value={regForm.contribution_intent}
                      onChange={e => setRegForm({ ...regForm, contribution_intent: e.target.value })}
                    />
                  </label>

                  <div className="tw-formactions">
                    <button type="button" className="tw-button secondary" onClick={() => setShowRegModal(false)}>
                      Cancel
                    </button>
                    <button className="tw-button" disabled={busy}>
                      {busy ? 'Registering...' : 'Confirm Registration'} <ArrowRight size={16}/>
                    </button>
                  </div>
                </form>
              </Panel>
            )}
          </div>
        )}
      </ResourceState>
    </>
  );
}

// ─── My Teams Hub View ───────────────────────────────────────────────────────

function MyTeamsHub() {
  const { activity, hasToken } = useContext(Account);
  const teams = activity.data?.teams || [];

  return (
    <>
      <Heading 
        eyebrow="YOUR COLLABORATIONS" 
        title="Better work starts with a team." 
        description="Your active teams and private collaboration channels across events."
      />
      <ResourceState resource={activity}>
        {teams.length > 0 ? (
          <div style={{ display: 'grid', gap: 16 }}>
            {teams.map(t => (
              <div key={t.id} className="tw-event-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: 18 }}>{t.name}</h3>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--sf-muted)' }}>
                    Event: <strong>{t.event_title}</strong> · Your Role: <strong>{t.role}</strong>
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <Link className="tw-button" to={`/events/${encodeURIComponent(t.event_id)}/teams`}>
                    <MessageSquare size={15} /> Open Team Hub & Chat
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty icon={Users} title="No active teams yet." description="Register for an open event, complete your case study assessment, and form or join a team.">
            <Action to="/events">Explore open events</Action>
          </Empty>
        )}
      </ResourceState>
    </>
  );
}

// ─── Assessments Hub View ────────────────────────────────────────────────────

function AssessmentsHub() {
  const { activity } = useContext(Account);
  const assessments = activity.data?.assessments || [];

  return (
    <>
      <Heading 
        eyebrow="YOUR ASSESSMENTS" 
        title="Your skills. Your perspective." 
        description="Review your case study evaluations and in-progress assessments."
      />
      <ResourceState resource={activity}>
        {assessments.length > 0 ? (
          <div style={{ display: 'grid', gap: 16 }}>
            {assessments.map(a => (
              <div key={a.id} className="tw-event-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: 17 }}>{a.title || 'Case Study Assessment'}</h3>
                  <span className="tw-badge" style={{ textTransform: 'capitalize' }}>Status: {a.status}</span>
                </div>
                <Link className="tw-button" to={`/events/${encodeURIComponent(a.event_id)}/assessment`}>
                  <ClipboardCheck size={15} /> View Assessment
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <Empty icon={ClipboardCheck} title="No assessments taken yet." description="Register for an open event to receive personalized case study scenarios.">
            <Action to="/events">Explore events</Action>
          </Empty>
        )}
      </ResourceState>
    </>
  );
}

function Profile() {
  const { account,hasToken,activity } = useContext(Account); 
  const summary=activity.data; 
  const profile = useResource('/profiles/me',hasToken); 
  const xp = useResource('/challenges/xp/me',hasToken); 
  const [editing,setEditing] = useState(false); 
  const [bio,setBio] = useState(''); 
  const [detailsForm,setDetailsForm]=useState({}); 
  const [message,setMessage] = useState(''); 
  const [busy,setBusy] = useState(false);
  const p=profile.data || {}; 
  const u=account.data || {};

  async function save(e){
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await request('/profiles/me',{
        method:'PATCH',
        body:JSON.stringify({
          ...detailsForm,
          bio,
          academic_year:detailsForm.academic_year?Number(detailsForm.academic_year):null,
          country_code:detailsForm.country_code||null
        })
      });
      setEditing(false);
      profile.reload();
      account.reload();
      setMessage('Profile updated.');
    } catch(error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  const details=[
    ['Full name',u.full_name || u.display_name],
    ['Email',u.email],
    ['Phone number',p.phone_number],
    ['Address',p.address],
    ['College / institution',p.institution],
    ['Course',p.course],
    ['Academic year (YYYY)',p.academic_year],
    ['Skills',p.skills?.map(s=>s.skill_name||s.name).join(', ')]
  ];

  return (
    <>
      <Heading eyebrow="MY PROFILE" title="Your story, still being written." description="Your details, contributions, and everything you build along the way.">
        <button className="tw-button secondary" disabled={!profile.data} onClick={()=>{setBio(p.bio || '');setDetailsForm(Object.fromEntries(['full_name','institution','course','academic_year','phone_number','address_line_1','city','region','postal_code','country_code'].map(k=>[k,p[k]??''])));setEditing(!editing);}}>Edit profile</button>
      </Heading>
      <Panel title="Primary details" description="Your personal and college information." action={<span className="tw-badge">Private details</span>}>
        <ResourceState resource={profile}>
          <div className="tw-profile-identity">
            <div className="tw-empty-symbol"><UserRound/></div>
            <div><h2>{u.full_name || u.display_name || 'Your profile'}</h2><p>{p.bio || 'Make space for what makes you, you.'}</p></div>
          </div>
          <dl className="tw-details">
            {details.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value || 'Not available'}</dd></div>)}
          </dl>
        </ResourceState>
        {editing && (
          <form className="tw-formpanel" onSubmit={save}>
            <label className="tw-field"><span>About you</span><textarea value={bio} onChange={e=>setBio(e.target.value)} maxLength={4000}/></label>
            <div className="tw-fieldpair">
              {[['full_name','Full name'],['institution','College'],['course','Course'],['academic_year','Academic year (YYYY)'],['phone_number','Phone'],['address_line_1','Address'],['city','City'],['region','State / region'],['postal_code','Postal code'],['country_code','Country code (e.g. IN)']].map(([key,label]) => (
                <label className="tw-field" key={key}>
                  <span>{label}</span>
                  <input 
                    type={key==='academic_year'?'number':'text'} 
                    min={key==='academic_year'?1900:undefined} 
                    max={key==='academic_year'?2200:undefined} 
                    maxLength={key==='country_code'?2:undefined} 
                    value={detailsForm[key]} 
                    onChange={e=>setDetailsForm({...detailsForm,[key]:key==='country_code'?e.target.value.toUpperCase():e.target.value})}
                  />
                </label>
              ))}
            </div>
            <div className="tw-formactions">
              <button type="button" className="tw-button secondary" onClick={()=>setEditing(false)}>Cancel</button>
              <button className="tw-button" disabled={busy}>{busy?'Saving…':'Save profile'}</button>
            </div>
          </form>
        )}
        {message && <div className="tw-notice" role="status">{message}</div>}
      </Panel>
      <section className="tw-panel tw-profile-growth">
        <div className="tw-profile-growth-top">
          <div>
            <p className="tw-eyebrow">YOUR EXPERIENCE</p>
            <h2>Every contribution moves you forward.</h2>
            <p>Grow through completed events, individual performance, and reviewed feedback.</p>
          </div>
          <div className="tw-profile-balance">
            <strong>{xp.data?.total_xp ?? '—'} <small>XP</small></strong>
            <span>{xp.data ? 'Earned so far' : 'Experience unavailable'}</span>
          </div>
        </div>
        <div className="tw-levels">
          <span>{summary?.progress.level ? `Level ${summary.progress.level}` : "Level not configured"}</span>
          <span>{summary?.next_level ? `Level ${summary.next_level.level} at ${summary.next_level.minimum_xp} XP` : "Next level not configured"}</span>
        </div>
        <p className="tw-subtle">Your level comes from verified XP and the platform’s progression rules.</p>
      </section>
      <Panel title="Your contribution matters" description="Recognition goes beyond the final result.">
        <Metrics items={[
          ["Completed events",summary?.history.length,'Verified participation',Flag],
          ["Team contributions",summary?.contributions,'Recorded contributions',Users],
          ["Reviewed feedback",summary?.feedback.count,'Verified feedback',Award]
        ]}/>
      </Panel>
      <Panel title="Completed event history" description="Your role, contribution, result, and earned XP for each event.">
        <div className="tw-table-wrap">
          <table className="tw-table">
            <thead>
              <tr>{['Event / date','Your role','Contribution','Outcome','XP earned'].map(t=><th key={t}>{t}</th>)}</tr>
            </thead>
            <tbody>
              {summary?.history.length ? summary.history.map(e=>(
                <tr key={e.event_id}>
                  <td>{e.title}<br/>{eventDate(e.ends_at)}</td>
                  <td>{e.role_description||'—'}</td>
                  <td>{e.contribution_summary||'—'}</td>
                  <td>{e.outcomes.join(', ')}</td>
                  <td>{e.xp_earned}</td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="tw-table-empty">{summary?'No completed events yet. Your verified outcomes will appear here.':'Sign in or reconnect to load your history.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="tw-empty"><Action to="/events" secondary>Explore events</Action></div>
      </Panel>
      <details className="tw-profile-xp-rules">
        <summary>How participation, feedback, and wins contribute to XP</summary>
        <div className="tw-checklist">
          {[
            ['Participation','Eligible, completed events build your experience.'],
            ['Contribution','Reviewed individual performance matters even when your team does not win.'],
            ['Winning','Verified wins can earn additional rewards under platform rules.']
          ].map(([title,text])=>(
            <div key={title}><h3>{title}</h3><p>{text}</p></div>
          ))}
        </div>
      </details>
    </>
  );
}

function Organizer({ manage }) {
  const { account,organizerAllowed } = useContext(Account); 
  const overview=useResource('/organizer/workspace',Boolean(account.data&&organizerAllowed)); 
  const [page,setPage] = useState(1); 
  const [tab,setTab] = useState('All events');
  const resource = useResource('/events/mine',Boolean(account.data && organizerAllowed));
  const own = resource.data?.items || [];
  const items=own.filter(e=>tab==='All events'||e.status===({Drafts:'draft',Open:'open',Completed:'completed'}[tab]));

  return (
    <>
      <Heading eyebrow="ORGANIZER WORKSPACE" title={manage?'Your events, in one place.':'Make the next great team possible.'} description="Manage opportunities, review assessments, and help people do their best work.">
        <Action to="/organizer/create">Create event</Action>
      </Heading>
      {!manage && (
        <section className="tw-org-banner">
          <div>
            <p className="tw-eyebrow">FROM A BRIEF TO A COMMUNITY</p>
            <h2>Set the challenge.<br/>Bring the right skills together.</h2>
            <p>Start with your event description. Shape the skills and assessment, then open it to participants.</p>
            <Action to="/organizer/create">Start an event</Action>
          </div>
          <div className="tw-event-symbol" aria-hidden="true">
            <span>YOUR NEXT EVENT</span><strong>One brief.<br/>Many possibilities.</strong>
            <div><Code2/><Mic/><Cpu/></div>
          </div>
        </section>
      )}
      {!organizerAllowed && (
        <div className="tw-notice">Sign in with your organizer account to load events. Verification is required before creating or hosting an event.</div>
      )}
      {!manage && (
        <Metrics items={[
          ["Open events",resource.data?own.filter(e=>e.status==='open').length:null,'Accepting registrations',CalendarDays],
          ["Registrations",resource.data?own.reduce((sum,e)=>sum+(e.registered_count||0),0):null,'Across your events',Users],
          ["Pending outcomes",overview.data?.outcomes.filter(o=>o.status==='pending').length,'Awaiting reviewed results',ClipboardCheck]
        ]}/>
      )}
      <Panel title="My events" description="Manage the opportunities you create.">
        <div className="tw-rowtabs" role="group" aria-label="Event status">
          {['All events','Drafts','Open','Completed'].map(t=>(
            <button key={t} className={tab===t?'active':''} aria-pressed={tab===t} onClick={()=>setTab(t)}>{t}</button>
          ))}
        </div>
        <ResourceState resource={resource}>
          {items.length ? (
            <EventCards items={items} organizer/>
          ) : (
            <Empty icon={CalendarDays} title="Your next event starts with a brief." description={resource.data?'No events match this view. Choose a category, describe the challenge, and shape the team skills.':'Your events will appear after your organizer account is connected.'}>
              <Action to="/organizer/create">Create an event</Action>
            </Empty>
          )}
        </ResourceState>
      </Panel>
      <div className="tw-formactions">
        <button className="tw-button secondary" disabled={page===1||resource.loading} onClick={()=>setPage(page-1)}>Previous</button>
        <span>Page {page}</span>
        <button className="tw-button secondary" disabled={!resource.data?.has_more||resource.loading} onClick={()=>setPage(page+1)}>Next</button>
      </div>
      <div className="tw-checklist">
        {[
          ['Define the challenge','Category, brief, team roles, and schedule.'],
          ['Prepare the assessment','Review skills, level adaptation, and case-study criteria.'],
          ['Host and recognize','Publish, form teams, then record outcomes and contributions.']
        ].map(([title,desc])=>(
          <div key={title}><h3>{title}</h3><p>{desc}</p></div>
        ))}
      </div>
    </>
  );
}
