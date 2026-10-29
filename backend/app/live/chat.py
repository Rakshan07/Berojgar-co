"""Private Team Chat:
- Persistent messages stored in hackloop.team_messages
- Real-time updates via authenticated WebSocket + polling/HTTP fallback
- Ephemeral tickets for secure WebSocket handshakes (no long-lived auth tokens in URLs)
- Only active team members (left_at IS NULL) may read or send
- Strict text sanitation (no HTML execution), rate limiting, client_message_id idempotency
"""
from datetime import datetime, timezone
import html
import logging
import re
import secrets
import time
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import Response, APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

from backend.app.db.session import get_db, SessionLocal
from .auth import current_user
from .db import one, rows, execute, require

logger = logging.getLogger(__name__)

router = APIRouter(prefix='/teams/{tid}', tags=['Team Chat'])

# In-memory ephemeral tickets: ticket -> {user_id, team_id, expires_at}
EPHEMERAL_TICKETS: Dict[str, Dict[str, Any]] = {}

# In-memory active WebSocket connections per team_id: team_id_str -> set of WebSockets
TEAM_SOCKETS: Dict[str, set] = {}

# Simple in-memory rate limiting per user: user_id_str -> list of timestamps
USER_SEND_TIMESTAMPS: Dict[str, List[float]] = {}

class MessageSendBody(BaseModel):
    body: str = Field(min_length=1, max_length=2000)
    client_message_id: Optional[str] = Field(default=None, max_length=100)

def sanitize_chat_message(text: str) -> str:
    """Escape HTML tags and strip control characters to prevent HTML/XSS injection."""
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
    return html.escape(cleaned.strip())

def check_chat_rate_limit(user_id_str: str, max_messages: int = 15, window_seconds: float = 10.0) -> bool:
    """Rate limit: maximum 15 messages in 10 seconds."""
    now = time.time()
    ts_list = USER_SEND_TIMESTAMPS.get(user_id_str, [])
    valid_ts = [t for t in ts_list if now - t < window_seconds]
    if len(valid_ts) >= max_messages:
        return False
    valid_ts.append(now)
    USER_SEND_TIMESTAMPS[user_id_str] = valid_ts
    return True

# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get('/messages')
def get_team_messages(
    tid: UUID,
    limit: int = Query(50, ge=1, le=100),
    before: Optional[datetime] = None,
    user = Depends(current_user),
    db = Depends(get_db)
):
    """Fetch paginated message history. Only active members can read messages."""
    uid = user['id']
    m = one(db, 'SELECT id FROM hackloop.team_members WHERE team_id=:tid AND user_id=:uid AND left_at IS NULL',
            tid=tid, uid=uid)
    require(m, 403, 'You are not an active member of this team')

    condition = 'm.team_id=:tid'
    params = {'tid': tid, 'limit': limit}
    if before:
        condition += ' AND m.created_at < :before'
        params['before'] = before

    msgs = rows(db, f'''SELECT m.id, m.team_id, m.sender_membership_id, m.body, m.created_at,
      m.client_message_id, u.display_name AS sender_name, u.id AS sender_user_id
      FROM hackloop.team_messages m
      JOIN hackloop.team_members tm ON tm.id=m.sender_membership_id
      JOIN hackloop.users u ON u.id=tm.user_id
      WHERE {condition}
      ORDER BY m.created_at DESC
      LIMIT :limit''', **params)

    # Return in chronological order
    msgs.reverse()

    return {'items': [{
        'id': str(msg['id']),
        'client_message_id': msg.get('client_message_id'),
        'sender_user_id': str(msg['sender_user_id']),
        'sender_name': msg['sender_name'],
        'body': msg['body'],
        'created_at': msg['created_at'].isoformat() if hasattr(msg['created_at'], 'isoformat') else str(msg['created_at']),
        'is_self': msg['sender_user_id'] == uid
    } for msg in msgs]}

@router.post('/messages', status_code=201)
async def send_team_message(
    tid: UUID,
    body: MessageSendBody,
    response: Response,
    user = Depends(current_user),
    db = Depends(get_db)
):
    """Send a persistent text message. Idempotent via client_message_id."""
    uid = user['id']
    m = one(db, 'SELECT id FROM hackloop.team_members WHERE team_id=:tid AND user_id=:uid AND left_at IS NULL',
            tid=tid, uid=uid)
    require(m, 403, 'You are not an active member of this team')

    if not check_chat_rate_limit(str(uid)):
        raise HTTPException(status_code=429, detail='You are sending messages too quickly. Please pause a moment.')

    clean_text = sanitize_chat_message(body.body)
    require(bool(clean_text), 422, 'Message cannot be empty')

    # Idempotency check with client_message_id
    if body.client_message_id:
        existing = one(db, 'SELECT id, created_at FROM hackloop.team_messages WHERE team_id=:tid AND client_message_id=:cid',
                       tid=tid, cid=body.client_message_id)
        if existing:
            response.status_code = 200
            return {
                'id': str(existing['id']),
                'client_message_id': body.client_message_id,
                'status': 'duplicate',
                'created_at': existing['created_at'].isoformat() if hasattr(existing['created_at'], 'isoformat') else str(existing['created_at'])
            }

    msg_row = one(db, '''INSERT INTO hackloop.team_messages(
        team_id, sender_membership_id, body, client_message_id, sender_user_id, created_at
      ) VALUES (
        :tid, :mid, :body, :cid, :uid, now()
      ) RETURNING *''',
      tid=tid, mid=m['id'], body=clean_text, cid=body.client_message_id, uid=uid)
    db.commit()

    created_iso = msg_row['created_at'].isoformat() if hasattr(msg_row['created_at'], 'isoformat') else str(msg_row['created_at'])

    payload = {
        'type': 'new_message',
        'id': str(msg_row['id']),
        'client_message_id': body.client_message_id,
        'team_id': str(tid),
        'sender_user_id': str(uid),
        'sender_name': user.get('display_name') or user.get('full_name') or 'Team Member',
        'body': clean_text,
        'created_at': created_iso
    }

    # Broadcast to active WebSockets for this team
    tid_str = str(tid)
    sockets = TEAM_SOCKETS.get(tid_str, set()).copy()
    for ws in sockets:
        try:
            await ws.send_json(payload)
        except Exception:
            TEAM_SOCKETS.get(tid_str, set()).discard(ws)

    return {
        'id': str(msg_row['id']),
        'client_message_id': body.client_message_id,
        'body': clean_text,
        'created_at': created_iso
    }

@router.post('/chat-ticket')
def issue_chat_ticket(tid: UUID, user = Depends(current_user), db = Depends(get_db)):
    """Issue a single-use ephemeral chat ticket for authenticating WebSocket connections.
    Avoids putting long-lived tokens in WebSocket URLs.
    """
    uid = user['id']
    m = one(db, 'SELECT id FROM hackloop.team_members WHERE team_id=:tid AND user_id=:uid AND left_at IS NULL',
            tid=tid, uid=uid)
    require(m, 403, 'You are not an active member of this team')

    ticket = secrets.token_urlsafe(32)
    EPHEMERAL_TICKETS[ticket] = {
        'user_id': uid,
        'team_id': tid,
        'display_name': user.get('display_name') or user.get('full_name') or 'Team Member',
        'expires_at': time.time() + 60.0  # 60 seconds validity
    }

    # Clean up expired tickets
    now = time.time()
    for t in list(EPHEMERAL_TICKETS.keys()):
        if EPHEMERAL_TICKETS[t]['expires_at'] < now:
            del EPHEMERAL_TICKETS[t]

    return {'ticket': ticket, 'expires_in': 60}

# ─── WebSocket Endpoint ───────────────────────────────────────────────────────

@router.websocket('/ws')
async def team_chat_websocket(websocket: WebSocket, tid: UUID):
    """Authenticated real-time WebSocket connection for team chat."""
    ticket = websocket.query_params.get('ticket')
    if not ticket or ticket not in EPHEMERAL_TICKETS:
        await websocket.close(code=4401, reason='Invalid or expired chat ticket')
        return

    ticket_data = EPHEMERAL_TICKETS.pop(ticket)
    if ticket_data['expires_at'] < time.time() or ticket_data['team_id'] != tid:
        await websocket.close(code=4403, reason='Ticket expired or mismatched team')
        return

    uid = ticket_data['user_id']
    tid_str = str(tid)

    # Verify membership in DB
    with SessionLocal() as db:
        m = one(db, 'SELECT id FROM hackloop.team_members WHERE team_id=:tid AND user_id=:uid AND left_at IS NULL',
                tid=tid, uid=uid)
        if not m:
            await websocket.close(code=4403, reason='Not an active member of this team')
            return

    await websocket.accept()

    if tid_str not in TEAM_SOCKETS:
        TEAM_SOCKETS[tid_str] = set()
    TEAM_SOCKETS[tid_str].add(websocket)

    try:
        while True:
            # Client can send ping or messages over WS
            data = await websocket.receive_json()
            msg_type = data.get('type')
            if msg_type == 'ping':
                await websocket.send_json({'type': 'pong'})
            elif msg_type == 'message':
                raw_body = data.get('body', '')
                clean_body = sanitize_chat_message(raw_body)
                client_id = data.get('client_message_id')
                if clean_body:
                    with SessionLocal() as db:
                        m = one(db, 'SELECT id FROM hackloop.team_members WHERE team_id=:tid AND user_id=:uid AND left_at IS NULL',
                                tid=tid, uid=uid)
                        if m and check_chat_rate_limit(str(uid)):
                            msg_row = one(db, '''INSERT INTO hackloop.team_messages(
                                team_id, sender_membership_id, body, client_message_id, sender_user_id, created_at
                              ) VALUES (
                                :tid, :mid, :body, :cid, :uid, now()
                              ) RETURNING *''',
                              tid=tid, mid=m['id'], body=clean_body, cid=client_id, uid=uid)
                            db.commit()

                            broadcast_payload = {
                                'type': 'new_message',
                                'id': str(msg_row['id']),
                                'client_message_id': client_id,
                                'team_id': tid_str,
                                'sender_user_id': str(uid),
                                'sender_name': ticket_data['display_name'],
                                'body': clean_body,
                                'created_at': msg_row['created_at'].isoformat()
                            }

                            for ws in TEAM_SOCKETS.get(tid_str, set()).copy():
                                try:
                                    await ws.send_json(broadcast_payload)
                                except Exception:
                                    TEAM_SOCKETS.get(tid_str, set()).discard(ws)

    except WebSocketDisconnect:
        pass
    finally:
        TEAM_SOCKETS.get(tid_str, set()).discard(websocket)

