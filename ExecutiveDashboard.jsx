// ═══════════════════════════════════════════════════════════════════════════════
// WHEN JUSTICE — EXECUTIVE PRODUCT DASHBOARD
// Password: WHENisNOW1!
//
// Configuration:
//   Set window.LINEAR_API_KEY before loading this file to skip the API key
//   prompt after password authentication. Or enter the key interactively.
//
// Queries Linear GraphQL API: https://api.linear.app/graphql
// ═══════════════════════════════════════════════════════════════════════════════

const { useState, useEffect, useRef, useCallback } = React;

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const PASSWORD = 'WHENisNOW1!';
const LAUNCH_TARGET = new Date('2026-03-15');
const PRECONFIGURED_KEY =
  typeof window !== 'undefined' && window.LINEAR_API_KEY
    ? window.LINEAR_API_KEY
    : '';

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  bg:          '#0e0e0e',
  s1:          '#161616',
  s2:          '#1e1e1e',
  s3:          '#262626',
  accent:      '#e04a1f',
  accentLow:   'rgba(224,74,31,0.12)',
  accentMid:   'rgba(224,74,31,0.30)',
  done:        '#6fcf6f',
  doneLow:     'rgba(111,207,111,0.12)',
  prog:        '#f5c842',
  progLow:     'rgba(245,200,66,0.12)',
  review:      '#5ba8e0',
  reviewLow:   'rgba(91,168,224,0.12)',
  todo:        '#888888',
  backlog:     '#555555',
  text:        '#e8e8e8',
  textSub:     '#b0b0b0',
  muted:       '#666666',
  dim:         '#444444',
  border:      'rgba(255,255,255,0.07)',
  borderHi:    'rgba(255,255,255,0.13)',
  // fonts
  display:     '"Bebas Neue", sans-serif',
  body:        '"DM Sans", sans-serif',
  mono:        '"DM Mono", monospace',
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────
function stateColor(type, name = '') {
  const t = (type  || '').toLowerCase();
  const n = (name  || '').toLowerCase();
  if (t === 'completed') return T.done;
  if (t === 'cancelled') return T.backlog;
  if (t === 'started')   return n.includes('review') ? T.review : T.prog;
  if (t === 'unstarted') return n.includes('backlog') ? T.backlog : T.todo;
  if (t === 'triage')    return T.muted;
  return T.dim;
}

function stateLowColor(type, name = '') {
  const t = (type  || '').toLowerCase();
  const n = (name  || '').toLowerCase();
  if (t === 'completed') return T.doneLow;
  if (t === 'started')   return n.includes('review') ? T.reviewLow : T.progLow;
  return 'transparent';
}

function priorityColor(p) {
  if (p === 1) return T.accent;
  if (p === 2) return T.prog;
  if (p === 3) return T.review;
  if (p === 4) return T.muted;
  return T.dim;
}

function priorityLabel(p) {
  return { 0: '—', 1: 'URGENT', 2: 'HIGH', 3: 'MED', 4: 'LOW' }[p] ?? '—';
}

function daysUntil(date) {
  if (!date) return null;
  return Math.ceil((new Date(date) - Date.now()) / 86400000);
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: '2-digit',
  });
}

function timeAgo(d) {
  if (!d) return '—';
  const h = Math.floor((Date.now() - new Date(d)) / 3600000);
  if (h < 1)    return 'just now';
  if (h < 24)   return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return fmtDate(d);
}

function projectStatusColor(state) {
  if (!state) return T.dim;
  const s = state.toLowerCase();
  if (s === 'started')   return T.accent;
  if (s === 'planned')   return T.review;
  if (s === 'paused')    return T.prog;
  if (s === 'completed') return T.done;
  return T.dim;
}

function projectStatusLabel(state) {
  if (!state) return 'UNKNOWN';
  const s = state.toLowerCase();
  if (s === 'started')   return 'ACTIVE';
  if (s === 'planned')   return 'PLANNED';
  if (s === 'paused')    return 'PAUSED';
  if (s === 'completed') return 'COMPLETE';
  if (s === 'backlog')   return 'BACKLOG';
  return state.toUpperCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// LINEAR GRAPHQL CLIENT (via backend proxy)
// ─────────────────────────────────────────────────────────────────────────────
async function gql(query, apiKey) {
  // Proxy through backend for CORS + auth security
  // The backend is configured with the actual Linear API key
  const endpoint = process.env.NODE_ENV === 'production'
    ? '/api/linear'  // On Render, backend is same origin
    : 'http://localhost:3001/api/linear';  // Local dev

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Note: apiKey param is now unused (auth is server-side)
      // Keeping for backwards compatibility
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Proxy error (${res.status}): ${err}`);
  }

  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// GRAPHQL QUERIES
// ─────────────────────────────────────────────────────────────────────────────
const Q_PROJECTS = `query ExecDash_Projects {
  projects(first: 50) {
    nodes {
      id name description state targetDate startDate progress slugId
      issues(first: 200) {
        nodes {
          id identifier title priority updatedAt completedAt startedAt
          state { id name type color }
          assignee { id name displayName }
        }
      }
    }
  }
}`;

const Q_URGENT = `query ExecDash_Urgent {
  issues(
    filter: {
      priority: { eq: 1 }
      state: { type: { nin: ["completed", "cancelled"] } }
    }
    first: 50
    orderBy: updatedAt
  ) {
    nodes {
      id identifier title priority updatedAt
      state { name type color }
      project { id name }
      assignee { name displayName }
    }
  }
}`;

const Q_IN_PROGRESS = `query ExecDash_InProgress {
  issues(
    filter: { state: { type: { eq: "started" } } }
    first: 50
    orderBy: updatedAt
  ) {
    nodes {
      id identifier title priority updatedAt
      state { name type color }
      assignee { name displayName }
      project { id name }
    }
  }
}`;

const Q_RECENT = `query ExecDash_Recent {
  issues(
    filter: { state: { type: { eq: "completed" } } }
    first: 10
    orderBy: updatedAt
  ) {
    nodes {
      id identifier title completedAt updatedAt
      state { name type }
      assignee { name }
      project { name }
    }
  }
}`;

const Q_CYCLES = `query ExecDash_Cycles {
  cycles(first: 20) {
    nodes {
      id name number startsAt endsAt progress
      team { id name }
      issues(first: 100) {
        nodes {
          id identifier title priority
          state { name type }
          assignee { name }
        }
      }
    }
  }
}`;

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON SHIMMER
// ─────────────────────────────────────────────────────────────────────────────
function Sk({ w = '100%', h = 16, r = 0, style = {} }) {
  return (
    <div
      className="sk"
      style={{
        width: w, height: h,
        borderRadius: r,
        background: T.s3,
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PASSWORD GATE
// ─────────────────────────────────────────────────────────────────────────────
function PasswordGate({ onSuccess }) {
  const [val, setVal]     = useState('');
  const [err, setErr]     = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef();

  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = (e) => {
    e.preventDefault();
    if (val === PASSWORD) {
      onSuccess();
    } else {
      setErr(true);
      setShake(true);
      setVal('');
      setTimeout(() => setShake(false), 500);
      setTimeout(() => setErr(false), 3000);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: T.bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 9999,
    }}>
      {/* Decorative grid lines */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(${T.border} 1px, transparent 1px), linear-gradient(90deg, ${T.border} 1px, transparent 1px)`,
        backgroundSize: '80px 80px',
        opacity: 0.4,
        pointerEvents: 'none',
      }} />

      {/* Accent bar top */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: T.accent }} />

      <div style={{ position: 'relative', textAlign: 'center' }}>
        {/* Wordmark */}
        <div style={{
          fontFamily: T.display,
          fontSize: 'clamp(72px, 12vw, 120px)',
          letterSpacing: '0.18em',
          color: T.text,
          lineHeight: 1,
          marginBottom: 4,
        }}>WHEN</div>

        <div style={{
          fontFamily: T.mono,
          fontSize: 10,
          letterSpacing: '0.45em',
          color: T.muted,
          marginBottom: 52,
          textTransform: 'uppercase',
        }}>Justice Platform — Executive View</div>

        {/* Input form */}
        <form onSubmit={submit} style={{ width: 'min(360px, 90vw)', margin: '0 auto' }}>
          <div style={{
            border: `1px solid ${err ? T.accent : T.borderHi}`,
            background: T.s1,
            display: 'flex', alignItems: 'center',
            gap: 12, padding: '14px 18px',
            animation: shake ? 'shake 0.45s ease' : 'none',
            transition: 'border-color 0.2s',
          }}>
            {/* Lock icon */}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke={err ? T.accent : T.muted} strokeWidth="2" strokeLinecap="square">
              <rect x="3" y="11" width="18" height="11"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>

            <input
              ref={inputRef}
              type="password"
              value={val}
              onChange={e => setVal(e.target.value)}
              placeholder="ACCESS CODE"
              autoComplete="current-password"
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                color: T.text, fontFamily: T.mono,
                fontSize: 13, letterSpacing: '0.2em', flex: 1,
                caretColor: T.accent,
              }}
            />

            <button type="submit" style={{
              background: T.accent, border: 'none',
              color: '#fff', fontFamily: T.mono,
              fontSize: 12, letterSpacing: '0.08em',
              padding: '6px 14px', cursor: 'pointer',
              flexShrink: 0,
            }}>→</button>
          </div>

          {err && (
            <div style={{
              fontFamily: T.mono, fontSize: 10,
              letterSpacing: '0.2em', color: T.accent,
              marginTop: 10, textAlign: 'center',
            }}>⚠ ACCESS DENIED</div>
          )}
        </form>

        {/* Bottom tagline */}
        <div style={{
          fontFamily: T.mono, fontSize: 9,
          color: T.dim, letterSpacing: '0.25em',
          marginTop: 64, textTransform: 'uppercase',
        }}>WHEN Justice · Platform Engineering · {new Date().getFullYear()}</div>
      </div>

      {/* Accent bar bottom */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: T.accent }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// API KEY GATE
// ─────────────────────────────────────────────────────────────────────────────
function ApiKeyGate({ onSubmit }) {
  const [val, setVal] = useState('');
  const inputRef = useRef();

  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: T.bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 9998,
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: T.accent }} />

      <div style={{ width: 'min(440px, 90vw)', textAlign: 'center' }}>
        <div style={{
          fontFamily: T.display, fontSize: 28,
          letterSpacing: '0.18em', color: T.text, marginBottom: 8,
        }}>CONNECT LINEAR</div>

        <div style={{
          fontFamily: T.body, fontSize: 13,
          color: T.muted, marginBottom: 8, lineHeight: 1.6,
        }}>
          Enter a Linear personal API key to load live workspace data.
        </div>
        <div style={{
          fontFamily: T.mono, fontSize: 10, color: T.dim,
          marginBottom: 32, letterSpacing: '0.05em',
        }}>
          Settings → API → Personal API Keys
        </div>

        <form onSubmit={e => { e.preventDefault(); if (val.trim()) onSubmit(val.trim()); }}>
          <input
            ref={inputRef}
            type="text"
            value={val}
            onChange={e => setVal(e.target.value)}
            placeholder="lin_api_xxxxxxxxxxxxxxxxxxxxxxxx"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: T.s1, border: `1px solid ${T.borderHi}`,
              outline: 'none', color: T.text,
              fontFamily: T.mono, fontSize: 12,
              letterSpacing: '0.04em', padding: '13px 16px',
              caretColor: T.accent,
            }}
          />
          <button
            type="submit"
            disabled={!val.trim()}
            style={{
              marginTop: 10, width: '100%',
              background: val.trim() ? T.accent : T.s2,
              border: 'none',
              color: val.trim() ? '#fff' : T.muted,
              fontFamily: T.display,
              fontSize: 17, letterSpacing: '0.18em',
              padding: '13px', cursor: val.trim() ? 'pointer' : 'not-allowed',
              transition: 'background 0.2s',
            }}
          >LOAD DASHBOARD</button>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAT BOX
// ─────────────────────────────────────────────────────────────────────────────
function StatBox({ label, value, color = T.text, accent = false, loading }) {
  return (
    <div style={{
      border: `1px solid ${accent ? T.accentMid : T.border}`,
      background: accent ? T.accentLow : T.s1,
      padding: '18px 22px',
      flex: 1, minWidth: 0,
    }}>
      {loading ? (
        <>
          <Sk h={42} w={56} style={{ marginBottom: 10 }} />
          <Sk h={10} w={72} />
        </>
      ) : (
        <>
          <div style={{
            fontFamily: T.display,
            fontSize: 48, lineHeight: 1,
            color, letterSpacing: '0.02em',
          }}>{value ?? '—'}</div>
          <div style={{
            fontFamily: T.mono, fontSize: 9,
            letterSpacing: '0.2em', color: T.muted,
            marginTop: 7, textTransform: 'uppercase',
          }}>{label}</div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION HEADER
// ─────────────────────────────────────────────────────────────────────────────
function SectionHeader({ children, badge }) {
  return (
    <div style={{
      fontFamily: T.display, fontSize: 19,
      letterSpacing: '0.18em', color: T.text,
      borderBottom: `1px solid ${T.border}`,
      paddingBottom: 10, marginBottom: 16,
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      {children}
      {badge != null && (
        <span style={{
          fontFamily: T.mono, fontSize: 10,
          color: T.muted, letterSpacing: '0.1em',
          marginLeft: 'auto', fontWeight: 400,
        }}>{badge}</span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXECUTIVE SUMMARY BAR
// ─────────────────────────────────────────────────────────────────────────────
function ExecutiveSummaryBar({ data, loading }) {
  const daysLeft = daysUntil(LAUNCH_TARGET);

  // Tally issue counts across all projects
  let done = 0, inProg = 0, inRev = 0, todo = 0, backlog = 0;
  if (data) {
    data.projects.forEach(p =>
      (p.issues?.nodes || []).forEach(issue => {
        const t = (issue.state?.type || '').toLowerCase();
        const n = (issue.state?.name  || '').toLowerCase();
        if (t === 'completed')       done++;
        else if (t === 'cancelled')  { /* skip */ }
        else if (t === 'started')    n.includes('review') ? inRev++ : inProg++;
        else if (n.includes('backlog')) backlog++;
        else                         todo++;
      })
    );
  }

  // Find active cycle for sprint goal
  const now = Date.now();
  const activeCycle = data?.cycles?.find(c =>
    new Date(c.startsAt) <= now && new Date(c.endsAt) >= now
  );
  const sprintGoal = activeCycle
    ? `Sprint ${activeCycle.number}${activeCycle.team ? ` · ${activeCycle.team.name}` : ''}`
    : 'Donation Flow · Campaign Publishing · Organizer Dashboard';

  const launchColor = daysLeft <= 14 ? T.accent : daysLeft <= 30 ? T.prog : T.text;

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Sprint goal + launch countdown */}
      <div style={{
        display: 'flex', alignItems: 'stretch',
        border: `1px solid ${T.border}`,
        background: T.s1, marginBottom: 10,
      }}>
        <div style={{ flex: 1, padding: '16px 22px', borderRight: `1px solid ${T.border}` }}>
          <div style={{
            fontFamily: T.mono, fontSize: 9,
            letterSpacing: '0.3em', color: T.accent,
            textTransform: 'uppercase', marginBottom: 8,
          }}>CURRENT SPRINT FOCUS</div>
          {loading
            ? <Sk h={15} w="65%" />
            : <div style={{
                fontFamily: T.body, fontSize: 14,
                color: T.text, fontWeight: 500, lineHeight: 1.4,
              }}>{sprintGoal}</div>
          }
        </div>

        <div style={{
          padding: '16px 28px', textAlign: 'center',
          minWidth: 180, borderRight: `1px solid ${T.border}`,
        }}>
          <div style={{
            fontFamily: T.mono, fontSize: 9,
            letterSpacing: '0.25em', color: T.muted,
            textTransform: 'uppercase', marginBottom: 6,
          }}>DAYS TO LAUNCH</div>
          <div style={{
            fontFamily: T.display, fontSize: 42,
            lineHeight: 1, color: launchColor, letterSpacing: '0.02em',
          }}>{daysLeft}</div>
          <div style={{
            fontFamily: T.mono, fontSize: 9, color: T.dim,
            marginTop: 4, letterSpacing: '0.1em',
          }}>TARGET: MAR 15, 2026</div>
        </div>

        <div style={{ padding: '16px 24px', textAlign: 'center', minWidth: 140 }}>
          <div style={{
            fontFamily: T.mono, fontSize: 9,
            letterSpacing: '0.25em', color: T.muted,
            textTransform: 'uppercase', marginBottom: 6,
          }}>TOTAL ISSUES</div>
          {loading
            ? <Sk h={36} w={60} style={{ margin: '0 auto' }} />
            : <div style={{
                fontFamily: T.display, fontSize: 42,
                lineHeight: 1, color: T.text, letterSpacing: '0.02em',
              }}>{done + inProg + inRev + todo + backlog}</div>
          }
        </div>
      </div>

      {/* Stat boxes */}
      <div style={{ display: 'flex', gap: 8 }}>
        <StatBox label="Done"        value={loading ? null : done}    color={T.done}   loading={loading} />
        <StatBox label="In Progress" value={loading ? null : inProg}  color={T.prog}   loading={loading} />
        <StatBox label="In Review"   value={loading ? null : inRev}   color={T.review} loading={loading} />
        <StatBox label="Todo"        value={loading ? null : todo}     color={T.todo}   loading={loading} />
        <StatBox label="Backlog"     value={loading ? null : backlog}  color={T.dim}    loading={loading} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KEY BLOCKERS
// ─────────────────────────────────────────────────────────────────────────────
function KeyBlockers({ data, loading }) {
  const urgentIssues = data?.urgentIssues || [];

  // Group by project
  const byProject = {};
  urgentIssues.forEach(issue => {
    const proj = issue.project?.name || 'Unassigned';
    if (!byProject[proj]) byProject[proj] = [];
    byProject[proj].push(issue);
  });

  return (
    <div style={{
      border: `1px solid ${T.accent}`,
      background: `rgba(224,74,31,0.03)`,
      marginBottom: 24,
    }}>
      {/* Header bar */}
      <div style={{
        background: T.accent,
        padding: '9px 20px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 8, height: 8,
          background: '#fff', borderRadius: '50%',
          animation: 'blink 1.4s infinite',
        }} />
        <span style={{
          fontFamily: T.display, fontSize: 17,
          letterSpacing: '0.22em', color: '#fff',
        }}>KEY BLOCKERS &amp; URGENT ITEMS</span>
        {!loading && (
          <span style={{
            marginLeft: 'auto',
            fontFamily: T.mono, fontSize: 10,
            color: 'rgba(255,255,255,0.7)',
            letterSpacing: '0.1em',
          }}>{urgentIssues.length} OPEN</span>
        )}
      </div>

      <div style={{ padding: '18px 20px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} style={{
                border: `1px solid rgba(224,74,31,0.2)`,
                padding: '14px 16px',
                display: 'flex', gap: 10, alignItems: 'center',
              }}>
                <Sk h={20} w={60} />
                <Sk h={14} w="55%" />
                <Sk h={12} w={80} style={{ marginLeft: 'auto' }} />
              </div>
            ))}
          </div>
        ) : urgentIssues.length === 0 ? (
          <div style={{
            fontFamily: T.mono, fontSize: 11,
            color: T.done, letterSpacing: '0.15em',
            textAlign: 'center', padding: '20px 0',
          }}>✓ NO URGENT BLOCKERS — CLEAR TO LAUNCH</div>
        ) : (
          Object.entries(byProject).map(([project, issues]) => (
            <div key={project} style={{ marginBottom: 18 }}>
              <div style={{
                fontFamily: T.mono, fontSize: 9,
                letterSpacing: '0.25em', color: T.accent,
                textTransform: 'uppercase',
                marginBottom: 8, paddingBottom: 6,
                borderBottom: `1px solid rgba(224,74,31,0.2)`,
              }}>{project}</div>

              {issues.map((issue, idx) => (
                <div key={issue.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '11px 14px',
                  border: `1px solid rgba(224,74,31,0.18)`,
                  background: 'rgba(224,74,31,0.04)',
                  marginBottom: idx < issues.length - 1 ? 6 : 0,
                }}>
                  {/* URGENT badge */}
                  <div style={{
                    background: T.accent, color: '#fff',
                    fontFamily: T.mono, fontSize: 8,
                    letterSpacing: '0.12em', padding: '3px 7px',
                    flexShrink: 0,
                  }}>URGENT</div>

                  {/* ID */}
                  <div style={{
                    fontFamily: T.mono, fontSize: 10,
                    color: T.muted, flexShrink: 0, minWidth: 68,
                  }}>{issue.identifier}</div>

                  {/* Title */}
                  <div style={{
                    fontFamily: T.body, fontSize: 13,
                    color: T.text, flex: 1,
                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                  }}>{issue.title}</div>

                  {/* State */}
                  <div style={{
                    fontFamily: T.mono, fontSize: 9,
                    color: stateColor(issue.state?.type, issue.state?.name),
                    flexShrink: 0, letterSpacing: '0.08em',
                  }}>{issue.state?.name || '—'}</div>

                  {/* Assignee */}
                  {issue.assignee && (
                    <div style={{
                      fontFamily: T.mono, fontSize: 9,
                      color: T.muted, flexShrink: 0, minWidth: 80, textAlign: 'right',
                    }}>{issue.assignee.name}</div>
                  )}

                  {/* Updated */}
                  <div style={{
                    fontFamily: T.mono, fontSize: 9,
                    color: T.dim, flexShrink: 0, minWidth: 60, textAlign: 'right',
                  }}>{timeAgo(issue.updatedAt)}</div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TOP INITIATIVES & PROGRESS
// ─────────────────────────────────────────────────────────────────────────────
function TopInitiatives({ data, loading }) {
  const projects = data?.projects || [];

  return (
    <div style={{ marginBottom: 24 }}>
      <SectionHeader badge={loading ? null : `${projects.length} PROJECTS`}>
        TOP INITIATIVES &amp; PROGRESS
      </SectionHeader>

      {loading ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: 12,
        }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{
              border: `1px solid ${T.border}`, borderLeft: `3px solid ${T.s3}`,
              background: T.s1, padding: 20,
            }}>
              <Sk h={15} w="60%" style={{ marginBottom: 6 }} />
              <Sk h={11} w="80%" style={{ marginBottom: 18 }} />
              <Sk h={4}  style={{ marginBottom: 14 }} />
              <div style={{ display: 'flex', gap: 12 }}>
                <Sk h={11} w={55} />
                <Sk h={11} w={55} />
                <Sk h={11} w={55} />
              </div>
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div style={{
          fontFamily: T.mono, fontSize: 11,
          color: T.muted, padding: 20,
          border: `1px solid ${T.border}`,
        }}>No projects found in Linear workspace.</div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: 12,
        }}>
          {projects.map(project => {
            const issues   = project.issues?.nodes || [];
            const total    = issues.length;
            const doneCt   = issues.filter(i => i.state?.type === 'completed').length;
            const progCt   = issues.filter(i => i.state?.type === 'started'
              && !i.state?.name?.toLowerCase().includes('review')).length;
            const revCt    = issues.filter(i => i.state?.type === 'started'
              &&  i.state?.name?.toLowerCase().includes('review')).length;
            const todoCt   = issues.filter(i => i.state?.type === 'unstarted'
              && !i.state?.name?.toLowerCase().includes('backlog')).length;
            const pct      = total > 0 ? Math.round((doneCt / total) * 100) : 0;
            const sColor   = projectStatusColor(project.state);
            const daysLeft = daysUntil(project.targetDate);
            const barColor = pct >= 80 ? T.done : pct >= 50 ? T.prog : T.accent;

            return (
              <div key={project.id} style={{
                border: `1px solid ${T.border}`,
                borderLeft: `3px solid ${sColor}`,
                background: T.s1,
                padding: 20,
              }}>
                {/* Project name + status */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: T.body, fontSize: 14,
                      fontWeight: 600, color: T.text, marginBottom: 4,
                    }}>{project.name}</div>
                    {project.description && (
                      <div style={{
                        fontFamily: T.body, fontSize: 11,
                        color: T.muted, lineHeight: 1.45,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}>{project.description}</div>
                    )}
                  </div>
                  <div style={{
                    background: `${sColor}1a`,
                    color: sColor,
                    fontFamily: T.mono,
                    fontSize: 8, letterSpacing: '0.14em',
                    padding: '3px 8px',
                    border: `1px solid ${sColor}44`,
                    flexShrink: 0,
                  }}>{projectStatusLabel(project.state)}</div>
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'baseline', marginBottom: 7,
                  }}>
                    <span style={{
                      fontFamily: T.mono, fontSize: 9,
                      color: T.muted, letterSpacing: '0.15em',
                    }}>PROGRESS</span>
                    <span style={{
                      fontFamily: T.display, fontSize: 22,
                      color: barColor, lineHeight: 1,
                    }}>{pct}%</span>
                  </div>
                  <div style={{ height: 3, background: T.s3 }}>
                    <div style={{
                      height: '100%', width: `${pct}%`,
                      background: barColor,
                      transition: 'width 0.9s ease',
                    }} />
                  </div>
                </div>

                {/* Issue breakdown */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
                  {[
                    { label: 'DONE',    count: doneCt, color: T.done   },
                    { label: 'IN PROG', count: progCt, color: T.prog   },
                    { label: 'REVIEW',  count: revCt,  color: T.review },
                    { label: 'TODO',    count: todoCt, color: T.todo   },
                  ].map(({ label, count, color }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 5, height: 5, background: color, flexShrink: 0 }} />
                      <span style={{
                        fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: '0.1em',
                      }}>{label}</span>
                      <span style={{
                        fontFamily: T.mono, fontSize: 11, color: T.text, fontWeight: 600,
                      }}>{count}</span>
                    </div>
                  ))}
                </div>

                {/* Target date */}
                {project.targetDate && (
                  <div style={{
                    marginTop: 13, paddingTop: 11,
                    borderTop: `1px solid ${T.border}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span style={{
                      fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: '0.12em',
                    }}>TARGET DATE</span>
                    <span style={{
                      fontFamily: T.mono, fontSize: 10,
                      color: daysLeft !== null && daysLeft < 14
                        ? T.accent : daysLeft < 30 ? T.prog : T.muted,
                    }}>
                      {fmtDate(project.targetDate)}
                      {daysLeft !== null && (
                        <span style={{ marginLeft: 8, color: T.dim }}>({daysLeft}d)</span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HIERARCHY DRILL-DOWN
// ─────────────────────────────────────────────────────────────────────────────
function HierarchyDrillDown({ data, loading, expanded, onToggle }) {
  const projects = data?.projects || [];

  function groupByState(issues) {
    const g = { started: [], inReview: [], unstarted: [], backlog: [], completed: [] };
    issues.forEach(issue => {
      const t = (issue.state?.type || '').toLowerCase();
      const n = (issue.state?.name  || '').toLowerCase();
      if (t === 'completed')                       g.completed.push(issue);
      else if (t === 'started' && n.includes('review')) g.inReview.push(issue);
      else if (t === 'started')                    g.started.push(issue);
      else if (n.includes('backlog'))              g.backlog.push(issue);
      else                                         g.unstarted.push(issue);
    });
    return g;
  }

  const stateGroups = [
    { key: 'started',   label: 'IN PROGRESS', color: T.prog   },
    { key: 'inReview',  label: 'IN REVIEW',   color: T.review },
    { key: 'unstarted', label: 'TODO',         color: T.todo   },
    { key: 'backlog',   label: 'BACKLOG',      color: T.backlog },
    { key: 'completed', label: 'DONE',         color: T.done   },
  ];

  return (
    <div style={{ marginBottom: 24 }}>
      <SectionHeader>INITIATIVE HIERARCHY</SectionHeader>

      {loading ? (
        <div style={{ border: `1px solid ${T.border}`, background: T.s1 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{
              padding: '14px 18px',
              borderBottom: i < 2 ? `1px solid ${T.border}` : 'none',
              display: 'flex', gap: 12, alignItems: 'center',
            }}>
              <Sk h={11} w={14} />
              <Sk h={13} w="45%" />
              <Sk h={10} w={40} style={{ marginLeft: 'auto' }} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ border: `1px solid ${T.border}`, background: T.s1, fontFamily: T.mono }}>
          {projects.length === 0 && (
            <div style={{ padding: '16px 18px', color: T.muted, fontSize: 11 }}>
              No projects found.
            </div>
          )}
          {projects.map((project, pi) => {
            const projKey    = `proj-${project.id}`;
            const isExpanded = !!expanded[projKey];
            const issues     = project.issues?.nodes || [];
            const groups     = groupByState(issues);
            const total      = issues.length;
            const doneCt     = groups.completed.length;

            return (
              <div key={project.id} style={{
                borderBottom: pi < projects.length - 1 ? `1px solid ${T.border}` : 'none',
              }}>
                {/* ── PROJECT ROW ─────────────────────────────────────── */}
                <div
                  onClick={() => onToggle(projKey)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '13px 18px',
                    cursor: 'pointer',
                    background: isExpanded ? T.s2 : 'transparent',
                    transition: 'background 0.12s',
                    userSelect: 'none',
                  }}
                >
                  <span style={{ color: T.dim, fontSize: 9, width: 10, flexShrink: 0 }}>
                    {isExpanded ? '▾' : '▸'}
                  </span>
                  <div style={{
                    width: 7, height: 7, flexShrink: 0,
                    background: projectStatusColor(project.state),
                  }} />
                  <span style={{ fontSize: 12, color: T.text, flex: 1, fontWeight: 600 }}>
                    {project.name}
                  </span>
                  <span style={{
                    fontSize: 10, color: T.done,
                    background: T.doneLow,
                    padding: '2px 8px',
                    border: `1px solid rgba(111,207,111,0.2)`,
                  }}>{doneCt}/{total}</span>
                </div>

                {/* ── EXPANDED: STATE GROUPS ───────────────────────────── */}
                {isExpanded && stateGroups.map(({ key, label, color }) => {
                  const groupIssues  = groups[key];
                  if (groupIssues.length === 0) return null;
                  const groupKey     = `${projKey}-${key}`;
                  const isGroupOpen  = !!expanded[groupKey];

                  return (
                    <div key={key}>
                      {/* Group header */}
                      <div
                        onClick={() => onToggle(groupKey)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '8px 18px 8px 40px',
                          cursor: 'pointer',
                          background: isGroupOpen ? `${color}08` : T.s2,
                          borderTop: `1px solid ${T.border}`,
                          userSelect: 'none',
                          transition: 'background 0.12s',
                        }}
                      >
                        {/* Indent line */}
                        <div style={{
                          width: 1, height: 14, background: T.border,
                          marginLeft: -8, flexShrink: 0,
                        }} />
                        <span style={{ color: T.dim, fontSize: 8, width: 9, flexShrink: 0 }}>
                          {isGroupOpen ? '▾' : '▸'}
                        </span>
                        <div style={{ width: 5, height: 5, background: color, flexShrink: 0 }} />
                        <span style={{
                          fontSize: 9, color, flex: 1, letterSpacing: '0.15em',
                        }}>{label}</span>
                        <span style={{ fontSize: 9, color: T.muted }}>{groupIssues.length}</span>
                      </div>

                      {/* Issues */}
                      {isGroupOpen && groupIssues.map((issue, ii) => (
                        <div key={issue.id} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '7px 18px 7px 66px',
                          borderTop: `1px solid ${T.border}`,
                          background: `${color}04`,
                        }}>
                          {/* Tree connector */}
                          <div style={{
                            width: 1, height: 14, background: T.border,
                            marginLeft: -18, flexShrink: 0,
                          }} />
                          <div style={{
                            width: 8, height: 1, background: T.border,
                            marginLeft: 0, flexShrink: 0,
                          }} />
                          {/* Status dot */}
                          <div style={{
                            width: 5, height: 5,
                            border: `1px solid ${color}`,
                            flexShrink: 0,
                          }} />
                          {/* ID */}
                          <span style={{
                            fontSize: 9, color: T.muted,
                            flexShrink: 0, minWidth: 64,
                          }}>{issue.identifier}</span>
                          {/* Priority */}
                          <span style={{
                            fontSize: 8, color: priorityColor(issue.priority),
                            flexShrink: 0, minWidth: 40, letterSpacing: '0.06em',
                          }}>{priorityLabel(issue.priority)}</span>
                          {/* Title */}
                          <span style={{
                            fontSize: 11, color: T.textSub, flex: 1,
                            overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                          }}>{issue.title}</span>
                          {/* Assignee */}
                          {issue.assignee && (
                            <span style={{
                              fontSize: 9, color: T.muted, flexShrink: 0,
                            }}>{issue.assignee.name?.split(' ')[0]}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// IN PROGRESS RIGHT NOW
// ─────────────────────────────────────────────────────────────────────────────
function InProgressPanel({ data, loading }) {
  const issues = data?.inProgressIssues || [];

  return (
    <div style={{ marginBottom: 0 }}>
      <SectionHeader badge={loading ? null : `${issues.length} ACTIVE`}>
        <div style={{ width: 7, height: 7, background: T.prog, flexShrink: 0 }} />
        IN PROGRESS RIGHT NOW
      </SectionHeader>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{
              border: `1px solid ${T.border}`, padding: '13px 16px',
              background: T.s1, display: 'flex', gap: 10, alignItems: 'center',
            }}>
              <Sk h={7} w={7} r={1} />
              <Sk h={11} w={60} />
              <Sk h={13} w="45%" />
              <Sk h={10} w={70} style={{ marginLeft: 'auto' }} />
            </div>
          ))}
        </div>
      ) : issues.length === 0 ? (
        <div style={{
          fontFamily: T.mono, fontSize: 11, color: T.muted,
          padding: '20px 18px', border: `1px solid ${T.border}`,
        }}>No issues currently in progress.</div>
      ) : (
        <div style={{ border: `1px solid ${T.border}`, background: T.s1 }}>
          {issues.map((issue, i) => (
            <div key={issue.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 16px',
              borderBottom: i < issues.length - 1 ? `1px solid ${T.border}` : 'none',
            }}>
              <div style={{
                width: 6, height: 6, flexShrink: 0,
                background: stateColor(issue.state?.type, issue.state?.name),
              }} />
              <div style={{
                fontFamily: T.mono, fontSize: 9, color: T.muted,
                flexShrink: 0, minWidth: 66,
              }}>{issue.identifier}</div>
              <div style={{
                fontFamily: T.mono, fontSize: 9,
                color: priorityColor(issue.priority),
                flexShrink: 0, minWidth: 42, letterSpacing: '0.06em',
              }}>{priorityLabel(issue.priority)}</div>
              <div style={{
                fontFamily: T.body, fontSize: 13, color: T.text,
                flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
              }}>{issue.title}</div>
              {issue.project && (
                <div style={{
                  fontFamily: T.mono, fontSize: 9, color: T.muted,
                  background: T.s2, padding: '2px 8px',
                  border: `1px solid ${T.border}`,
                  flexShrink: 0, maxWidth: 140,
                  overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                }}>{issue.project.name}</div>
              )}
              {issue.assignee && (
                <div style={{
                  fontFamily: T.mono, fontSize: 10, color: T.textSub,
                  flexShrink: 0, minWidth: 80, textAlign: 'right',
                }}>{issue.assignee.name}</div>
              )}
              <div style={{
                fontFamily: T.mono, fontSize: 9, color: T.dim,
                flexShrink: 0, minWidth: 56, textAlign: 'right',
              }}>{timeAgo(issue.updatedAt)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RECENTLY COMPLETED
// ─────────────────────────────────────────────────────────────────────────────
function RecentlyCompleted({ data, loading }) {
  const issues = data?.recentlyCompleted || [];

  return (
    <div style={{ marginBottom: 0 }}>
      <SectionHeader>
        <div style={{ width: 7, height: 7, background: T.done, flexShrink: 0 }} />
        RECENTLY COMPLETED
      </SectionHeader>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{
              border: `1px solid ${T.border}`, padding: '11px 16px',
              background: T.s1, display: 'flex', gap: 10, alignItems: 'center',
            }}>
              <Sk h={7} w={7} r={1} />
              <Sk h={11} w={60} />
              <Sk h={13} w="45%" />
              <Sk h={10} w={60} style={{ marginLeft: 'auto' }} />
            </div>
          ))}
        </div>
      ) : issues.length === 0 ? (
        <div style={{
          fontFamily: T.mono, fontSize: 11, color: T.muted,
          padding: '20px 18px', border: `1px solid ${T.border}`,
        }}>No completed issues found.</div>
      ) : (
        <div style={{ border: `1px solid ${T.border}`, background: T.s1 }}>
          {issues.map((issue, i) => (
            <div key={issue.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 16px',
              borderBottom: i < issues.length - 1 ? `1px solid ${T.border}` : 'none',
            }}>
              <div style={{ width: 6, height: 6, background: T.done, flexShrink: 0 }} />
              <div style={{
                fontFamily: T.mono, fontSize: 9, color: T.muted,
                flexShrink: 0, minWidth: 66,
              }}>{issue.identifier}</div>
              <div style={{
                fontFamily: T.body, fontSize: 13, color: T.text,
                flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
              }}>{issue.title}</div>
              {issue.project && (
                <div style={{
                  fontFamily: T.mono, fontSize: 9, color: T.muted,
                  background: T.s2, padding: '2px 8px',
                  border: `1px solid ${T.border}`,
                  flexShrink: 0, maxWidth: 130,
                  overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                }}>{issue.project.name}</div>
              )}
              {issue.assignee && (
                <div style={{
                  fontFamily: T.mono, fontSize: 10, color: T.muted,
                  flexShrink: 0,
                }}>{issue.assignee.name}</div>
              )}
              <div style={{
                fontFamily: T.mono, fontSize: 9, color: T.done,
                flexShrink: 0, minWidth: 64, textAlign: 'right',
              }}>{timeAgo(issue.completedAt || issue.updatedAt)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FOOTER / REFRESH TIMESTAMP
// ─────────────────────────────────────────────────────────────────────────────
function Footer({ lastFetched, onRefresh, loading }) {
  const ts = lastFetched
    ? lastFetched.toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      })
    : '—';

  return (
    <div style={{
      borderTop: `1px solid ${T.border}`,
      padding: '14px 32px',
      display: 'flex', alignItems: 'center', gap: 12,
      background: T.s1,
    }}>
      <div style={{ fontFamily: T.mono, fontSize: 9, color: T.dim, letterSpacing: '0.15em' }}>
        LAST SYNC: {ts}
      </div>
      <div style={{ flex: 1 }} />
      <button
        onClick={onRefresh}
        disabled={loading}
        style={{
          background: 'transparent',
          border: `1px solid ${T.border}`,
          color: loading ? T.dim : T.muted,
          fontFamily: T.mono, fontSize: 9,
          letterSpacing: '0.12em', padding: '5px 12px',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >{loading ? '⟳ SYNCING...' : '↺ REFRESH LIVE DATA'}</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────────────────────
function App() {
  const [phase,       setPhase]       = useState('password'); // 'password'|'apikey'|'dashboard'
  const [apiKey,      setApiKey]      = useState(PRECONFIGURED_KEY);
  const [loading,     setLoading]     = useState(false);
  const [data,        setData]        = useState(null);
  const [error,       setError]       = useState(null);
  const [expanded,    setExpanded]    = useState({});
  const [visible,     setVisible]     = useState(false);
  const [lastFetched, setLastFetched] = useState(null);

  const handlePasswordSuccess = () => {
    // Backend proxy handles Linear auth — no need for client-side API key
    setPhase('dashboard');
    setTimeout(() => setVisible(true), 60);
  };

  const fetchAllData = useCallback(async (key) => {
    setLoading(true);
    setError(null);
    try {
      const [projectsData, urgentData, inProgData, recentData, cyclesData] =
        await Promise.all([
          gql(Q_PROJECTS,     key),
          gql(Q_URGENT,       key),
          gql(Q_IN_PROGRESS,  key),
          gql(Q_RECENT,       key),
          gql(Q_CYCLES,       key),
        ]);
      setData({
        projects:          projectsData?.projects?.nodes   || [],
        urgentIssues:      urgentData?.issues?.nodes       || [],
        inProgressIssues:  inProgData?.issues?.nodes       || [],
        recentlyCompleted: recentData?.issues?.nodes       || [],
        cycles:            cyclesData?.cycles?.nodes       || [],
      });
      setLastFetched(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (phase === 'dashboard' && apiKey) {
      fetchAllData(apiKey);
    }
  }, [phase, apiKey, fetchAllData]);

  const toggleNode = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  // ── RENDER GATE ─────────────────────────────────────────────────────────────
  if (phase === 'password') return <PasswordGate onSuccess={handlePasswordSuccess} />;

  // ── DASHBOARD ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      color: T.text,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(20px)',
      transition: 'opacity 0.55s ease, transform 0.55s ease',
    }}>

      {/* ── STICKY HEADER ─────────────────────────────────────────────── */}
      <div style={{
        background: T.s1,
        borderBottom: `1px solid ${T.border}`,
        padding: '0 32px',
        display: 'flex', alignItems: 'center', gap: 18,
        position: 'sticky', top: 0, zIndex: 100,
        height: 52,
      }}>
        <div style={{
          fontFamily: T.display, fontSize: 24,
          letterSpacing: '0.22em', color: T.text,
        }}>WHEN</div>

        <div style={{ width: 1, height: 22, background: T.border }} />

        <div style={{
          fontFamily: T.mono, fontSize: 9,
          color: T.muted, letterSpacing: '0.22em',
          textTransform: 'uppercase',
        }}>Executive Product Dashboard</div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {loading && (
            <div style={{
              fontFamily: T.mono, fontSize: 8,
              color: T.muted, letterSpacing: '0.15em',
              animation: 'fadeOpacity 1s ease infinite alternate',
            }}>SYNCING LINEAR...</div>
          )}
          <div style={{
            width: 6, height: 6,
            background: loading ? T.prog : T.done,
            animation: 'blink 2s infinite',
          }} />
          <span style={{
            fontFamily: T.mono, fontSize: 8,
            color: T.muted, letterSpacing: '0.18em',
          }}>LIVE</span>
        </div>
      </div>

      {/* Accent line below header */}
      <div style={{ height: 2, background: T.accent }} />

      {/* ── MAIN CONTENT ─────────────────────────────────────────────── */}
      <div style={{
        maxWidth: 1440, margin: '0 auto',
        padding: '28px 32px 48px',
      }}>

        {/* Error banner */}
        {error && (
          <div style={{
            border: `1px solid ${T.accent}`,
            background: T.accentLow, padding: '12px 18px',
            marginBottom: 24,
            fontFamily: T.mono, fontSize: 11,
            color: T.accent, letterSpacing: '0.06em',
          }}>
            ⚠ LINEAR API ERROR: {error}
          </div>
        )}

        {/* Executive Summary Bar */}
        <ExecutiveSummaryBar data={data} loading={loading} />

        {/* Key Blockers */}
        <KeyBlockers data={data} loading={loading} />

        {/* In Progress + Recently Completed — side by side */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 24,
          marginBottom: 24,
        }}>
          <InProgressPanel    data={data} loading={loading} />
          <RecentlyCompleted  data={data} loading={loading} />
        </div>

        {/* Top Initiatives */}
        <TopInitiatives data={data} loading={loading} />

        {/* Hierarchy Drill-Down */}
        <HierarchyDrillDown
          data={data} loading={loading}
          expanded={expanded} onToggle={toggleNode}
        />
      </div>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <Footer
        lastFetched={lastFetched}
        onRefresh={() => fetchAllData(apiKey)}
        loading={loading}
      />
    </div>
  );
}

// Mount
const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.render(<App />, rootEl);
}
