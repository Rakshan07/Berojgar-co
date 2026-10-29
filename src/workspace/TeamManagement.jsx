import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Users, UserPlus, Send, MessageSquare, Shield, Check, X, 
  ArrowRight, Crown, AlertCircle, RefreshCw, LogOut, ArrowLeft, Clock
} from 'lucide-react';
import { Heading, Panel, ResourceState } from './Workspace';
import { request, useResource } from './api';
import { useWorkspaceAccount } from './account';

export function TeamManagement({ eventId }) {
  const [searchParams] = useSearchParams();
  const showCreateInit = searchParams.get('create') === '1';

  const { account } = useWorkspaceAccount();
  const currentUserId = account.data?.id;

  const eventRes = useResource(`/events/${encodeURIComponent(eventId)}`);
  const myTeamRes = useResource(`/events/${encodeURIComponent(eventId)}/my-team`);
  const teamMatchesRes = useResource(`/events/${encodeURIComponent(eventId)}/team-matches`);
  const myInvitesRes = useResource(`/events/${encodeURIComponent(eventId)}/my-requests`);

  const [activeTab, setActiveTab] = useState(showCreateInit ? 'create' : 'my_team');
  const [createForm, setCreateForm] = useState({ name: '', description: '', creator_role: '', seeking_roles: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [actionNotice, setActionNotice] = useState('');

  const myTeamData = myTeamRes.data?.team;
  const hasTeam = myTeamRes.data?.has_team && Boolean(myTeamData);

  // If user has a team, default to My Team
  useEffect(() => {
    if (hasTeam && activeTab === 'create' && !showCreateInit) {
      setActiveTab('my_team');
    }
  }, [hasTeam]);

  async function handleCreateTeam(e) {
    e.preventDefault();
    setCreating(true);
    setError('');
    setActionNotice('');
    try {
      const payload = {
        name: createForm.name.trim(),
        description: createForm.description.trim() || null,
        creator_role: createForm.creator_role.trim(),
        seeking_roles: createForm.seeking_roles.split(',').map(s => s.trim()).filter(Boolean)
      };
      await request(`/events/${encodeURIComponent(eventId)}/teams`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      myTeamRes.reload();
      setActiveTab('my_team');
      setActionNotice('Team created successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleJoinRequest(teamId, targetRole) {
    setError('');
    setActionNotice('');
    try {
      await request(`/teams/${encodeURIComponent(teamId)}/join-requests`, {
        method: 'POST',
        body: JSON.stringify({ target_role: targetRole })
      });
      setActionNotice('Join request sent to the team captain.');
      teamMatchesRes.reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRespondToInvite(requestId, decision) {
    setError('');
    setActionNotice('');
    try {
      await request(`/team-requests/${encodeURIComponent(requestId)}/respond`, {
        method: 'POST',
        body: JSON.stringify({ decision })
      });
      setActionNotice(decision === 'accept' ? 'Invitation accepted! You have joined the team.' : 'Invitation declined.');
      myInvitesRes.reload();
      myTeamRes.reload();
      if (decision === 'accept') setActiveTab('my_team');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleLeaveTeam() {
    if (!myTeamData) return;
    if (!window.confirm('Are you sure you want to leave this team?')) return;
    setError('');
    try {
      await request(`/teams/${encodeURIComponent(myTeamData.id)}/leave`, { method: 'POST' });
      myTeamRes.reload();
      setActionNotice('You have left the team.');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <Heading
        eyebrow="TEAM FORMATION & COLLABORATION"
        title="Build with your people."
        description="Complementary strengths, aligned roles, and private team coordination."
      >
        <Link className="tw-button secondary" to={`/events/${encodeURIComponent(eventId)}`}>
          <ArrowLeft size={16} />Back to Event
        </Link>
      </Heading>

      {error && <div className="tw-notice" role="alert"><AlertCircle size={18} /> {error}</div>}
      {actionNotice && <div className="tw-notice" role="status"><Check size={18} /> {actionNotice}</div>}

      {/* Tabs */}
      <div className="tw-rowtabs" style={{ marginBottom: 20 }}>
        {hasTeam && (
          <button className={activeTab === 'my_team' ? 'active' : ''} onClick={() => setActiveTab('my_team')}>
            My Team & Chat
          </button>
        )}
        {!hasTeam && (
          <>
            <button className={activeTab === 'my_team' ? 'active' : ''} onClick={() => setActiveTab('my_team')}>
              Find Teams to Join
            </button>
            <button className={activeTab === 'create' ? 'active' : ''} onClick={() => setActiveTab('create')}>
              Create a Team
            </button>
          </>
        )}
        {myInvitesRes.data?.invitations?.length > 0 && (
          <button className={activeTab === 'invites' ? 'active' : ''} onClick={() => setActiveTab('invites')}>
            Invitations ({myInvitesRes.data.invitations.length})
          </button>
        )}
      </div>

      {/* View 1: Invitations */}
      {activeTab === 'invites' && (
        <Panel title="Pending Team Invitations" description="Invitations sent to you by team captains for this event.">
          <div style={{ padding: 20 }}>
            {myInvitesRes.data?.invitations?.length ? (
              <div style={{ display: 'grid', gap: 14 }}>
                {myInvitesRes.data.invitations.map(inv => (
                  <div key={inv.id} className="tw-event-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>{inv.team_name}</h3>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--sf-muted)' }}>
                        Invited by <strong>{inv.captain_name}</strong> for role: <strong>{inv.target_role}</strong>
                      </p>
                      {inv.message && <p style={{ fontSize: 12, marginTop: 6, fontStyle: 'italic' }}>"{inv.message}"</p>}
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button className="tw-button" onClick={() => handleRespondToInvite(inv.id, 'accept')}>
                        <Check size={14} /> Accept
                      </button>
                      <button className="tw-button secondary" onClick={() => handleRespondToInvite(inv.id, 'decline')}>
                        <X size={14} /> Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="tw-empty"><p>No pending invitations.</p></div>
            )}
          </div>
        </Panel>
      )}

      {/* View 2: Create a Team (if user does not have team) */}
      {!hasTeam && activeTab === 'create' && (
        <Panel title="Start a New Team" description="Form a team, set your role, and invite complementary members.">
          <form onSubmit={handleCreateTeam} style={{ padding: 20, maxWidth: 640 }}>
            <label className="tw-field">
              <span>Team Name</span>
              <input
                required
                minLength={2}
                maxLength={100}
                placeholder="e.g. Distributed Core Labs"
                value={createForm.name}
                onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
              />
            </label>

            <label className="tw-field">
              <span>Your Role on the Team</span>
              <input
                required
                minLength={2}
                maxLength={100}
                placeholder="e.g. Lead Architect, Frontend Lead, ML Engineer"
                value={createForm.creator_role}
                onChange={e => setCreateForm({ ...createForm, creator_role: e.target.value })}
              />
            </label>

            <label className="tw-field">
              <span>Roles You Are Seeking (separated by commas)</span>
              <input
                placeholder="e.g. Backend Lead, UX Researcher, Data Engineer"
                value={createForm.seeking_roles}
                onChange={e => setCreateForm({ ...createForm, seeking_roles: e.target.value })}
              />
            </label>

            <label className="tw-field">
              <span>Team Description (optional)</span>
              <textarea
                rows={3}
                placeholder="Describe your project vision, target challenge, and work cadence..."
                value={createForm.description}
                onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
              />
            </label>

            <div className="tw-formactions">
              <button className="tw-button" disabled={creating}>
                {creating ? 'Creating...' : 'Create Team'} <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </Panel>
      )}

      {/* View 3: Find Teams to Join (if user does not have team) */}
      {!hasTeam && activeTab === 'my_team' && (
        <Panel title="Recruiting Teams" description="Teams seeking roles aligned with your assessed skills.">
          <div style={{ padding: 20 }}>
            {teamMatchesRes.data?.teams?.length ? (
              <div style={{ display: 'grid', gap: 16 }}>
                {teamMatchesRes.data.teams.map(t => (
                  <div key={t.team_id} className="tw-event-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <h3 style={{ margin: 0, fontSize: 17 }}>{t.name}</h3>
                          <span className="tw-badge">{t.member_count} / {t.max_team_size} members</span>
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--sf-muted)', margin: '4px 0 8px' }}>
                          Captain: <strong>{t.creator_name}</strong>
                        </p>
                        {t.description && <p style={{ fontSize: 13, marginBottom: 8 }}>{t.description}</p>}
                        <div style={{ fontSize: 11, color: '#6A438A', background: '#F4EDFA', padding: '6px 12px', borderRadius: 6, display: 'inline-block' }}>
                          💡 <strong>Why this fits:</strong> {t.explanation}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="tw-badge" style={{ marginBottom: 10, fontSize: 12 }}>
                          Match Score: <strong>{Math.round(t.match_score)}%</strong>
                        </div>
                        <div>
                          <button 
                            className="tw-button"
                            onClick={() => handleJoinRequest(t.team_id, t.recommended_role_for_you)}
                          >
                            <UserPlus size={14} /> Request to Join
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="tw-empty">
                <Users size={32} style={{ color: 'var(--sf-muted)' }} />
                <h3>No recruiting teams yet</h3>
                <p>Be the first to create a team for this event and invite complementary participants.</p>
                <button className="tw-button" onClick={() => setActiveTab('create')}>Create a Team</button>
              </div>
            )}
          </div>
        </Panel>
      )}

      {/* View 4: My Team Hub & Private Chat (if user has team) */}
      {hasTeam && activeTab === 'my_team' && (
        <div style={{ display: 'grid', gap: 24 }}>
          {/* Team Overview & Members */}
          <Panel 
            title={myTeamData.name} 
            description={`Event: ${myTeamData.event_title || ''} · ${myTeamData.members.length} / ${myTeamData.max_team_size} members`}
            action={
              <button className="tw-textbutton" onClick={handleLeaveTeam} style={{ color: '#A03030' }}>
                <LogOut size={14} /> Leave Team
              </button>
            }
          >
            <div style={{ padding: 20 }}>
              {myTeamData.description && (
                <p style={{ margin: '0 0 16px', color: 'var(--sf-muted)', fontSize: 13 }}>{myTeamData.description}</p>
              )}

              <h4 style={{ margin: '0 0 10px', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--sf-muted)' }}>
                Active Team Members ({myTeamData.members.length})
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, marginBottom: 20 }}>
                {myTeamData.members.map(m => (
                  <div key={m.membership_id} style={{ border: '1px solid var(--sf-border)', background: 'var(--sf-surface)', borderRadius: 8, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <strong>{m.display_name}</strong>
                        {m.membership_role === 'captain' && <Crown size={14} style={{ color: '#E0A020' }} title="Team Captain" />}
                      </div>
                      {m.assessment_score && <span className="tw-badge">{Math.round(m.assessment_score)}% score</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--sf-muted)', marginTop: 4 }}>
                      Role: <strong>{m.assigned_role}</strong>
                    </div>
                  </div>
                ))}
              </div>

              {/* Captain Section: Candidate Recommendations & Incoming Requests */}
              {myTeamData.is_captain && (
                <CaptainSection teamId={myTeamData.id} onTeamUpdated={() => myTeamRes.reload()} />
              )}
            </div>
          </Panel>

          {/* Private Team Chat */}
          <Panel title="Private Team Chat" description="End-to-end persistent chat for accepted team members.">
            <div style={{ padding: 20 }}>
              <TeamChat teamId={myTeamData.id} currentUserId={currentUserId} />
            </div>
          </Panel>
        </div>
      )}
    </>
  );
}

// ─── Captain Management Section ──────────────────────────────────────────────

function CaptainSection({ teamId, onTeamUpdated }) {
  const candidatesRes = useResource(`/teams/${encodeURIComponent(teamId)}/candidates`);
  const requestsRes = useResource(`/teams/${encodeURIComponent(teamId)}/requests`);
  const [inviting, setInviting] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function handleInvite(candidateUserId, suggestedRole) {
    setInviting(true);
    setNotice('');
    setError('');
    try {
      await request(`/teams/${encodeURIComponent(teamId)}/invitations`, {
        method: 'POST',
        body: JSON.stringify({
          candidate_user_id: candidateUserId,
          target_role: suggestedRole
        })
      });
      setNotice('Invitation sent!');
      candidatesRes.reload();
      requestsRes.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setInviting(false);
    }
  }

  async function handleDecision(requestId, decision) {
    setNotice('');
    setError('');
    try {
      await request(`/team-requests/${encodeURIComponent(requestId)}/respond`, {
        method: 'POST',
        body: JSON.stringify({ decision })
      });
      setNotice(decision === 'accept' ? 'Join request accepted!' : 'Join request declined.');
      requestsRes.reload();
      onTeamUpdated();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={{ borderTop: '1px solid var(--sf-border)', paddingTop: 20, marginTop: 20 }}>
      <h3 style={{ fontSize: 16, margin: '0 0 6px' }}>Team Captain Controls</h3>
      <p style={{ fontSize: 12, color: 'var(--sf-muted)', margin: '0 0 16px' }}>
        Manage candidate invitations and incoming join requests.
      </p>

      {notice && <div className="tw-notice" role="status"><Check size={16} /> {notice}</div>}
      {error && <div className="tw-notice" role="alert"><AlertCircle size={16} /> {error}</div>}

      {/* Incoming Requests */}
      {requestsRes.data?.requests?.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <strong style={{ fontSize: 13 }}>Incoming Join Requests ({requestsRes.data.requests.length}):</strong>
          <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
            {requestsRes.data.requests.map(req => (
              <div key={req.id} style={{ border: '1px solid var(--sf-border)', borderRadius: 6, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{req.display_name}</strong> wishes to join as <em>{req.target_role}</em>
                  {req.assessment_score && <span className="tw-badge" style={{ marginLeft: 8 }}>{Math.round(req.assessment_score)}% score</span>}
                  {req.message && <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--sf-muted)' }}>"{req.message}"</p>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="tw-button" onClick={() => handleDecision(req.id, 'accept')}>Accept</button>
                  <button className="tw-button secondary" onClick={() => handleDecision(req.id, 'decline')}>Decline</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Candidates */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <strong style={{ fontSize: 13 }}>Recommended Complementary Candidates:</strong>
          <button className="tw-textbutton" onClick={() => candidatesRes.reload()}><RefreshCw size={13} /> Refresh</button>
        </div>

        {candidatesRes.data?.candidates?.length ? (
          <div className="tw-candidate-grid">
            {candidatesRes.data.candidates.map(c => (
              <div key={c.user_id} className="tw-candidate-card">
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <strong style={{ fontSize: 14 }}>{c.display_name}</strong>
                    <span className="tw-badge">Match: {Math.round(c.match_score)}%</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--sf-muted)', margin: '4px 0' }}>
                    Fills: <strong>{c.suggested_role}</strong> · {c.experience_level}
                  </div>
                  {c.assessment_score && (
                    <div style={{ fontSize: 11, color: '#2B6E38', marginBottom: 4 }}>
                      ✓ Assessed Score: {Math.round(c.assessment_score)}/100
                    </div>
                  )}
                  <p style={{ fontSize: 11, color: 'var(--sf-muted)', margin: '6px 0 0', lineHeight: 1.4 }}>
                    {c.explanation}
                  </p>
                </div>
                <button 
                  className="tw-button" 
                  style={{ width: '100%', marginTop: 8 }}
                  disabled={inviting}
                  onClick={() => handleInvite(c.user_id, c.suggested_role)}
                >
                  <UserPlus size={14} /> Invite to Team
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="tw-subtle">No unteamed matching candidates found for this event right now.</p>
        )}
      </div>
    </div>
  );
}

// ─── Private Team Chat Component ─────────────────────────────────────────────

function TeamChat({ teamId, currentUserId }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [wsStatus, setWsStatus] = useState('connecting');
  const chatBottomRef = useRef(null);
  const wsRef = useRef(null);

  // Initial message history load
  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await request(`/teams/${encodeURIComponent(teamId)}/messages?limit=50`);
        if (res?.items) {
          setMessages(res.items);
          scrollToBottom();
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      }
    }
    loadHistory();
  }, [teamId]);

  // WebSocket connection management with ephemeral chat ticket
  useEffect(() => {
    let unmounted = false;
    let ws = null;
    let reconnectTimeout = null;

    async function connectSocket() {
      try {
        const ticketRes = await request(`/teams/${encodeURIComponent(teamId)}/chat-ticket`, { method: 'POST' });
        if (unmounted || !ticketRes?.ticket) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Connect to port 8000 (backend API server) or relative host
        const host = window.location.hostname === 'localhost' ? '127.0.0.1:8000' : window.location.host;
        const wsUrl = `${protocol}//${host}/api/v1/teams/${encodeURIComponent(teamId)}/ws?ticket=${ticketRes.ticket}`;

        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!unmounted) setWsStatus('connected');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'new_message') {
              setMessages(prev => {
                // Prevent duplicate message by ID or client_message_id
                if (prev.some(m => m.id === data.id || (data.client_message_id && m.client_message_id === data.client_message_id))) {
                  return prev;
                }
                return [...prev, {
                  id: data.id,
                  client_message_id: data.client_message_id,
                  sender_user_id: data.sender_user_id,
                  sender_name: data.sender_name,
                  body: data.body,
                  created_at: data.created_at,
                  is_self: data.sender_user_id === currentUserId
                }];
              });
              scrollToBottom();
            }
          } catch (e) {
            console.error('Error parsing WS message:', e);
          }
        };

        ws.onclose = () => {
          if (!unmounted) {
            setWsStatus('disconnected');
            // Auto-reconnect after 3 seconds
            reconnectTimeout = setTimeout(connectSocket, 3000);
          }
        };

        ws.onerror = () => {
          if (!unmounted) setWsStatus('disconnected');
        };
      } catch (err) {
        if (!unmounted) {
          setWsStatus('fallback_polling');
          reconnectTimeout = setTimeout(connectSocket, 5000);
        }
      }
    }

    connectSocket();

    return () => {
      unmounted = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, [teamId, currentUserId]);

  // Periodic polling fallback to guarantee messages never get lost if WS is disconnected
  useEffect(() => {
    if (wsStatus === 'connected') return;
    const interval = setInterval(async () => {
      try {
        const res = await request(`/teams/${encodeURIComponent(teamId)}/messages?limit=30`);
        if (res?.items) {
          setMessages(res.items);
        }
      } catch {
        /* Ignore background polling errors */
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [teamId, wsStatus]);

  function scrollToBottom() {
    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }

  async function handleSendMessage(e) {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || sending) return;

    setSending(true);
    const clientId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    try {
      // Send via HTTP endpoint to guarantee persistence and idempotency
      const sent = await request(`/teams/${encodeURIComponent(teamId)}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: text, client_message_id: clientId })
      });

      setInputText('');

      // Add to local state immediately if not already broadcasted
      setMessages(prev => {
        if (prev.some(m => m.id === sent.id || m.client_message_id === clientId)) return prev;
        return [...prev, {
          id: sent.id,
          client_message_id: clientId,
          sender_user_id: currentUserId,
          sender_name: 'You',
          body: sent.body || text,
          created_at: sent.created_at,
          is_self: true
        }];
      });
      scrollToBottom();
    } catch (err) {
      alert(`Message failed to send: ${err.message}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="tw-chat-card">
      <div className="tw-chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={14} style={{ color: '#9672B7' }} />
          <strong>Private Team Channel</strong>
          <span className="tw-subtle">· Accepted members only</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--sf-muted)' }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: wsStatus === 'connected' ? '#2DA44E' : wsStatus === 'connecting' ? '#E0A020' : '#888'
          }} />
          <span>{wsStatus === 'connected' ? 'Live updates' : 'Polling history'}</span>
        </div>
      </div>

      <div className="tw-chat-history">
        {messages.length === 0 ? (
          <div className="tw-empty" style={{ margin: 'auto' }}>
            <MessageSquare size={24} style={{ color: 'var(--sf-muted)' }} />
            <p>No messages yet. Say hello to your team!</p>
          </div>
        ) : (
          messages.map(m => (
            <div key={m.id || m.client_message_id} className={`tw-chat-msg ${m.is_self ? 'self' : 'other'}`}>
              <div className="tw-chat-meta">
                <strong>{m.sender_name}</strong>
                <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div>{m.body}</div>
            </div>
          ))
        )}
        <div ref={chatBottomRef} />
      </div>

      <form className="tw-chat-form" onSubmit={handleSendMessage}>
        <input
          required
          maxLength={2000}
          placeholder="Write a message to your team... (Press Enter to send)"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          disabled={sending}
        />
        <button className="tw-button" disabled={sending || !inputText.trim()}>
          <Send size={15} /> Send
        </button>
      </form>
    </div>
  );
}

