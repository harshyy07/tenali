/**
 * MISTAKE JOURNAL — client side
 *
 * Public surface:
 *   - <MistakeJournal />          main UI (list + filters + review)
 *   - logMistake(mistake)         capture hook used by quiz apps
 *   - useMistakeBadge()           hook for the home tile badge count
 *   - mergeGuestMistakes()        bulk-import localStorage entries after login
 *   - MISTAKE_TYPES               friendly labels for quizType codes
 *
 * Storage keys (intentional separation from hints):
 *   - 'tenali-mistake-journal:guest'  pre-login queue (Array<mistake>)
 *   - 'tenali-mistake-journal:badge'  derived "N unreviewed" counter cache
 *
 * Server contract: see server/mistakes.js. All requests need a Bearer token.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

const API = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) || '';

const AUTH_TOKEN_KEY = 'tenali-auth-token';
const GUEST_KEY      = 'tenali-mistake-journal:guest';
const BADGE_KEY      = 'tenali-mistake-journal:badge';
const AUTH_EVENT     = 'tenali-auth-change';

const MAX_GUEST = 200; // hard cap on guest queue size
const TYPE_LABELS = {
  basicarith: 'Basic Arithmetic',
  addition:    'Addition',
  multiply:    'Multiplication',
  quadratic:   'Quadratic',
  vocab:       'Vocabulary',
  gk:          'General Knowledge',
  sqrt:        'Square Root',
  polymul:     'Polynomial Mul',
  polyfactor:  'Polynomial Factor',
  primefactor: 'Prime Factor',
  qformula:    'Quadratic Formula',
  simul:       'Simultaneous Eq',
  funceval:    'Function Eval',
  lineq:       'Line Equation',
  fractionadd: 'Fraction Add',
  surds:       'Surds',
  indices:     'Indices',
  sequences:   'Sequences',
  ratio:       'Ratio',
  percent:     'Percent',
  sets:        'Sets',
  tatsavit:    'Tatsavit Drill',
  tatsavit1:   'Tatsavit Drill',
  randommix:   'Random Mix',
  adaptive:    'Adaptive Tables',
  adaptive_mix: 'Adaptive Mixed',
  guess:       'Guess the Number',
  custom:      'Custom Lesson',
  gym:         'Gym',
};
const defaultLabel = (t) => t ? t.replace(/^[a-z]/, c => c.toUpperCase()) : 'Unknown';

// ─── STORAGE HELPERS ──────────────────────────────────────────────────────────

function authGetToken() {
  try { return typeof localStorage !== 'undefined' ? (localStorage.getItem(AUTH_TOKEN_KEY) || null) : null; } catch { return null; }
}

function loadGuest() {
  try {
    const raw = (typeof localStorage !== 'undefined') ? localStorage.getItem(GUEST_KEY) : null;
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function saveGuest(arr) {
  try {
    if (typeof localStorage === 'undefined') return;
    if (!arr || arr.length === 0) localStorage.removeItem(GUEST_KEY);
    else localStorage.setItem(GUEST_KEY, JSON.stringify(arr.slice(-MAX_GUEST)));
  } catch {}
}

function loadBadge() {
  try {
    const raw = (typeof localStorage !== 'undefined') ? localStorage.getItem(BADGE_KEY) : null;
    if (!raw) return { unreviewed: 0, updatedAt: 0 };
    const v = JSON.parse(raw);
    return { unreviewed: Number(v && v.unreviewed) || 0, updatedAt: Number(v && v.updatedAt) || 0 };
  } catch { return { unreviewed: 0, updatedAt: 0 }; }
}

function saveBadge(count) {
  try {
    if (typeof localStorage === 'undefined') return;
    const payload = { unreviewed: Math.max(0, Number(count) || 0), updatedAt: Date.now() };
    localStorage.setItem(BADGE_KEY, JSON.stringify(payload));
    try { window.dispatchEvent(new Event('tenali-mistake-journal:badge-change')); } catch {}
  } catch {}
}

// ─── NETWORK HELPERS ──────────────────────────────────────────────────────────

async function authFetch(path, opts = {}) {
  const token = authGetToken();
  const headers = Object.assign({}, opts.headers || {});
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const r = await fetch(`${API}${path}`, Object.assign({}, opts, { headers }));
  return r;
}

// ─── CAPTURE HOOK (called by quiz apps after a wrong answer) ─────────────────

/**
 * Captures a single wrong answer.
 *
 * If the user is logged in (JWT present) → POST /api/mistakes immediately.
 * If guest → push to localStorage queue for later merge.
 *
 * Never throws. Failures are swallowed and logged to console.
 *
 * @param {object} m  { quizType, prompt, userAnswer, correctAnswer?, timeMs?, questionId? }
 */
export async function logMistake(m) {
  const payload = {
    quizType:      m.quizType,
    prompt:        String(m.prompt ?? ''),
    userAnswer:    String(m.userAnswer ?? ''),
    correctAnswer: m.correctAnswer != null ? String(m.correctAnswer) : '',
    timeMs:        Number(m.timeMs) || 0,
    questionId:    m.questionId ? String(m.questionId) : '',
    ts:            new Date().toISOString(),
  };

  if (authGetToken()) {
    try {
      const r = await authFetch('/api/mistakes', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!r.ok && r.status !== 409) {
        console.warn('[mistakes] POST failed', r.status, await r.text().catch(() => ''));
      }
      // Refresh badge so home tile reflects the new entry
      try { window.dispatchEvent(new Event('tenali-mistake-journal:invalidate')); } catch {}
    } catch (e) {
      console.warn('[mistakes] POST threw', e && e.message);
    }
    return;
  }

  // Guest path: append to localStorage queue
  const list = loadGuest();
  list.push(payload);
  saveGuest(list);

  // Optimistic badge bump so the user sees their errors are being tracked
  const cur = loadBadge();
  saveBadge(cur.unreviewed + 1);
}

// ─── MERGE GUEST (called after login) ─────────────────────────────────────────

/**
 * Posts the localStorage guest queue to /api/mistakes/merge-guest.
 * On success clears the queue. Never throws.
 */
export async function mergeGuestMistakes() {
  if (!authGetToken()) return { ok: false, reason: 'not_logged_in' };
  const list = loadGuest();
  if (!list.length) return { ok: true, created: 0, skipped: 0 };

  try {
    const r = await authFetch('/api/mistakes/merge-guest', {
      method: 'POST',
      body: JSON.stringify({ mistakes: list }),
    });
    if (!r.ok) {
      console.warn('[mistakes] merge-guest failed', r.status);
      return { ok: false, reason: 'http_' + r.status };
    }
    const data = await r.json().catch(() => ({}));
    saveGuest([]); // clear regardless of created/skipped; dedupe is server-side
    try { window.dispatchEvent(new Event('tenali-mistake-journal:invalidate')); } catch {}
    return { ok: true, created: data.created || 0, skipped: data.skipped || 0 };
  } catch (e) {
    console.warn('[mistakes] merge-guest threw', e && e.message);
    return { ok: false, reason: 'exception' };
  }
}

// ─── BADGE HOOK ───────────────────────────────────────────────────────────────

/**
 * Returns { unreviewed, total, loading, refresh } for the home tile.
 * Auto-refreshes on auth change + custom invalidate event.
 */
export function useMistakeBadge() {
  const [count, setCount] = useState(() => loadBadge().unreviewed);
  const [total, setTotal] = useState(() => loadBadge().total || 0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!authGetToken()) {
      // Guest: derive from local guest queue length
      const c = loadGuest().length;
      setCount(c);
      setTotal(c);
      saveBadge({ unreviewed: c, total: c });
      return c;
    }
    setLoading(true);
    try {
      const r = await authFetch('/api/mistakes/stats');
      if (!r.ok) return 0;
      const data = await r.json();
      const u = Number(data.unreviewed) || 0;
      const t = Number(data.total) || 0;
      setCount(u);
      setTotal(t);
      saveBadge({ unreviewed: u, total: t });
      return u;
    } catch (_) {
      return 0;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const onInval = () => { refresh(); };
    const onAuth = () => {
      // After login: merge guest first, then refresh badge
      mergeGuestMistakes().finally(() => refresh());
    };
    const onStorage = (e) => {
      if (e && e.key === AUTH_TOKEN_KEY) onAuth();
    };
    window.addEventListener('tenali-mistake-journal:invalidate', onInval);
    window.addEventListener(AUTH_EVENT, onAuth);
    window.addEventListener('storage', onStorage);
    refresh();
    return () => {
      window.removeEventListener('tenali-mistake-journal:invalidate', onInval);
      window.removeEventListener(AUTH_EVENT, onAuth);
      window.removeEventListener('storage', onStorage);
    };
  }, [refresh]);

  return { unreviewed: count, total, loading, refresh };
}

// ─── MAIN UI ──────────────────────────────────────────────────────────────────

/**
 * Mistake Journal screen.
 * Props: { onBack } — go-back handler.
 */
export function MistakeJournal({ onBack }) {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ total: 0, unreviewed: 0, byType: {}, byWeek: [] });
  const [filter, setFilter] = useState({ type: '', reviewed: '', q: '' }); // ''=all
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingNotes, setEditingNotes] = useState({}); // id -> string
  const limit = 25;
  const qDebounce = useRef(null);

  const fetchList = useCallback(async () => {
    if (!authGetToken()) {
      setError('Please sign in to view your mistake journal.');
      setItems([]); setTotal(0);
      return;
    }
    setLoading(true); setError('');
    try {
      const qs = new URLSearchParams();
      if (filter.type)     qs.set('type', filter.type);
      if (filter.reviewed) qs.set('reviewed', filter.reviewed);
      if (filter.q)        qs.set('q', filter.q);
      qs.set('limit', String(limit));
      qs.set('offset', String(page * limit));
      const r = await authFetch(`/api/mistakes?${qs.toString()}`);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      setItems(Array.isArray(data.mistakes) ? data.mistakes : []);
      setTotal(Number(data.total) || 0);
    } catch (e) {
      setError('Failed to load. ' + (e && e.message || ''));
      setItems([]); setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  const fetchStats = useCallback(async () => {
    if (!authGetToken()) return;
    try {
      const r = await authFetch('/api/mistakes/stats');
      if (!r.ok) return;
      const data = await r.json();
      setStats({
        total:      Number(data.total) || 0,
        unreviewed: Number(data.unreviewed) || 0,
        byType:     data.byType || {},
        byWeek:     Array.isArray(data.byWeek) ? data.byWeek : [],
      });
    } catch (_) {}
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => {
    const onInval = () => { fetchList(); fetchStats(); };
    window.addEventListener('tenali-mistake-journal:invalidate', onInval);
    return () => window.removeEventListener('tenali-mistake-journal:invalidate', onInval);
  }, [fetchList, fetchStats]);

  // Debounce search
  useEffect(() => {
    if (qDebounce.current) clearTimeout(qDebounce.current);
    qDebounce.current = setTimeout(() => { setPage(0); fetchList(); }, 250);
    return () => { if (qDebounce.current) clearTimeout(qDebounce.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.q]);

  const onToggleReviewed = async (item) => {
    const next = item.reviewedAt ? null : new Date().toISOString();
    try {
      const r = await authFetch(`/api/mistakes/${encodeURIComponent(item._id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ reviewedAt: next }),
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      setItems(prev => prev.map(it => it._id === item._id ? (data.mistake || it) : it));
      fetchStats();
    } catch (e) {
      console.warn('[mistakes] PATCH failed', e);
    }
  };

  const onDelete = async (item) => {
    if (typeof window !== 'undefined' && !window.confirm('Delete this mistake from your journal?')) return;
    try {
      const r = await authFetch(`/api/mistakes/${encodeURIComponent(item._id)}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      setItems(prev => prev.filter(it => it._id !== item._id));
      setTotal(t => Math.max(0, t - 1));
      fetchStats();
    } catch (e) {
      console.warn('[mistakes] DELETE failed', e);
    }
  };

  const onSaveNote = async (item, notes) => {
    try {
      const r = await authFetch(`/api/mistakes/${encodeURIComponent(item._id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ notes: notes || '' }),
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      setItems(prev => prev.map(it => it._id === item._id ? (data.mistake || it) : it));
    } catch (e) {
      console.warn('[mistakes] note save failed', e);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const typeOptions = useMemo(() => {
    const keys = Object.keys(stats.byType || {});
    return keys.sort();
  }, [stats.byType]);

  return (
    <div className="mj-screen-soft" style={{ maxWidth: 960, margin: '0 auto', padding: '10px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--mj-line-soft)' }}>
        <button className="back-button" onClick={onBack}>← Home</button>
        <h1 style={{ margin: 0, fontWeight: 600, letterSpacing: '-0.01em' }}>📝 Mistake Journal</h1>
      </div>

      {/* Stats strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 10, marginBottom: 16,
      }}>
        <StatCard label="Total"     value={stats.total} />
        <StatCard label="Unreviewed" value={stats.unreviewed} accent />
        <StatCard label="Topics"    value={Object.keys(stats.byType || {}).length} />
        <StatCard label="Guest queue" value={loadGuest().length} subtle />
      </div>

      {/* Filter bar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
        background: 'var(--clr-surface)', border: '1px solid var(--clr-border)',
        borderRadius: 12, padding: 10, marginBottom: 14,
      }}>
        <input
          type="text" value={filter.q}
          onChange={(e) => setFilter(f => ({ ...f, q: e.target.value }))}
          placeholder="Search prompt or answer..."
          style={{
            flex: '1 1 220px', minWidth: 180,
            padding: '8px 12px', borderRadius: 8,
            border: '1px solid var(--clr-border)',
            background: 'var(--clr-bg-2)', color: 'var(--clr-text)',
          }}
        />
        <select value={filter.type} onChange={(e) => { setFilter(f => ({ ...f, type: e.target.value })); setPage(0); }}
          style={selectStyle}>
          <option value="">All topics</option>
          {typeOptions.map(k => <option key={k} value={k}>{TYPE_LABELS[k] || defaultLabel(k)}</option>)}
        </select>
        <select value={filter.reviewed} onChange={(e) => { setFilter(f => ({ ...f, reviewed: e.target.value })); setPage(0); }}
          style={selectStyle}>
          <option value="">All status</option>
          <option value="false">Unreviewed</option>
          <option value="true">Reviewed</option>
        </select>
        <button onClick={() => { setFilter({ type: '', reviewed: '', q: '' }); setPage(0); }}
          style={{
            padding: '8px 12px', borderRadius: 8,
            background: 'transparent', color: 'var(--clr-text-soft)',
            border: '1px solid var(--clr-border)', cursor: 'pointer',
          }}>Clear</button>
      </div>

      {error && <div style={{ color: 'var(--clr-wrong)', padding: '8px 0' }}>{error}</div>}

      {loading && <div style={{ color: 'var(--clr-text-soft)', padding: 12 }}>Loading…</div>}

      {/* Mistake Book — 3D page-flip metaphor. Each "leaf" is a two-sided
          page: front = mistake N, back = mistake N+1. Leaf 0 front = cover;
          last leaf back = back cover. Click right edge to flip forward,
          left edge to flip back. Keyboard arrows also work. Renders even
          when there are 0 mistakes so the user always sees the book. */}
      {!loading && !error && (
        <MistakeBook
          items={items}
          editingNotes={editingNotes}
          onNotesChange={(id, v) => setEditingNotes(prev => ({ ...prev, [id]: v }))}
          onNotesSave={(item, v) => { onSaveNote(item, v); setEditingNotes(prev => { const n = { ...prev }; delete n[item._id]; return n; }); }}
          onNotesCancel={(item) => setEditingNotes(prev => { const n = { ...prev }; delete n[item._id]; return n; })}
          onToggleReviewed={onToggleReviewed}
          onDelete={onDelete}
          stats={stats}
          onBack={onBack}
        />
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 18 }}>
          <button disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))} style={pageBtn}>← Prev</button>
          <span style={{ color: 'var(--clr-text-soft)' }}>Page {page + 1} of {totalPages} ({total} total)</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} style={pageBtn}>Next →</button>
        </div>
      )}
    </div>
  );
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function StatCard({ label, value, accent, subtle }) {
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 10,
      background: 'var(--clr-surface)', border: '1px solid var(--clr-border)',
      color: accent ? 'var(--clr-accent)' : (subtle ? 'var(--clr-text-soft)' : 'var(--clr-text)'),
    }}>
      <div style={{ fontSize: '0.78rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: '1.6rem', fontWeight: 600, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function EmptyState({ hasFilters, guestCount }) {
  if (hasFilters) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--clr-text-soft)' }}>
        No mistakes match the current filters.
      </div>
    );
  }
  return (
    <div style={{ padding: 32, textAlign: 'center', color: 'var(--clr-text-soft)' }}>
      <div style={{ fontSize: '2.2rem', marginBottom: 6 }}>📝</div>
      <div style={{ fontSize: '1.05rem' }}>No mistakes yet. Great job!</div>
      <div style={{ fontSize: '0.9rem', marginTop: 6 }}>
        Wrong answers will appear here automatically.
        {guestCount > 0 && <> You have <strong>{guestCount}</strong> in your guest queue — sign in to sync them to your account.</>}
      </div>
    </div>
  );
}

function MistakeRow({ item, notes, onNotesChange, onNotesSave, onNotesCancel, onToggle, onDelete }) {
  const [editingNote, setEditingNote] = useState(false);
  const isReviewed = Boolean(item.reviewedAt);
  const typeLabel = TYPE_LABELS[item.quizType] || defaultLabel(item.quizType);
  const when = formatDate(item.ts);

  return (
    <li style={{
      padding: '12px 14px', borderRadius: 10,
      background: 'var(--clr-surface)', border: '1px solid var(--clr-border)',
      opacity: isReviewed ? 0.75 : 1,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: '1 1 200px' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{
              fontSize: '0.75rem', padding: '2px 8px', borderRadius: 999,
              background: 'var(--clr-bg-2)', color: 'var(--clr-text-soft)',
              border: '1px solid var(--clr-border)',
            }}>{typeLabel}</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--clr-text-soft)' }}>{when}</span>
            {isReviewed && <span style={{ fontSize: '0.72rem', color: 'var(--clr-correct, #26de81)' }}>✓ reviewed</span>}
          </div>
          <div style={{ fontSize: '0.95rem', fontFamily: 'monospace', color: 'var(--clr-text)' }}>
            {item.prompt}
          </div>
          <div style={{ fontSize: '0.9rem', marginTop: 4 }}>
            <span style={{ color: 'var(--clr-wrong, #ff6b6b)' }}>Your answer: {item.userAnswer || '∅'}</span>
            {item.correctAnswer && (
              <span style={{ color: 'var(--clr-correct, #26de81)', marginLeft: 10 }}>Correct: {item.correctAnswer}</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={onToggle} style={smallBtn}>
            {isReviewed ? 'Mark unreviewed' : 'Mark reviewed'}
          </button>
          <button onClick={onDelete} style={{ ...smallBtn, color: 'var(--clr-wrong, #ff6b6b)' }}>Delete</button>
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        {!editingNote && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, fontSize: '0.85rem', color: notes ? 'var(--clr-text-soft)' : 'var(--clr-text-soft)', fontStyle: notes ? 'normal' : 'italic' }}>
              {notes ? ('📌 ' + notes) : 'No notes yet'}
            </div>
            <button onClick={() => setEditingNote(true)} style={linkBtn}>Edit note</button>
          </div>
        )}
        {editingNote && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              rows={2}
              placeholder="What did you learn? What pattern did you spot?"
              style={{
                flex: 1, padding: '6px 8px', borderRadius: 6,
                border: '1px solid var(--clr-border)',
                background: 'var(--clr-bg-2)', color: 'var(--clr-text)',
                fontFamily: 'inherit', fontSize: '0.9rem', resize: 'vertical',
              }}
            />
            <button onClick={() => onNotesSave(notes)} style={smallBtn}>Save</button>
            <button onClick={onNotesCancel} style={{ ...smallBtn, color: 'var(--clr-text-soft)' }}>Cancel</button>
          </div>
        )}
      </div>
    </li>
  );
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now - d;
    const diffH = diffMs / (60 * 60 * 1000);
    if (diffH < 1) {
      const m = Math.max(1, Math.floor(diffMs / 60000));
      return m + ' min ago';
    }
    if (diffH < 24) return Math.floor(diffH) + 'h ago';
    if (diffH < 24 * 7) return Math.floor(diffH / 24) + 'd ago';
    return d.toLocaleDateString();
  } catch { return ''; }
}

const selectStyle = {
  padding: '8px 10px', borderRadius: 8,
  border: '1px solid var(--clr-border)',
  background: 'var(--clr-bg-2)', color: 'var(--clr-text)',
};

const smallBtn = {
  padding: '6px 10px', borderRadius: 6,
  background: 'transparent', color: 'var(--clr-accent)',
  border: '1px solid var(--clr-accent)', cursor: 'pointer',
  fontSize: '0.82rem',
};

const linkBtn = {
  background: 'transparent', border: 'none', padding: 0,
  color: 'var(--clr-accent)', cursor: 'pointer', fontSize: '0.82rem',
};

const pageBtn = {
  padding: '6px 12px', borderRadius: 6,
  background: 'var(--clr-surface)', color: 'var(--clr-text)',
  border: '1px solid var(--clr-border)', cursor: 'pointer',
};

// ─── MISTAKE BOOK ─────────────────────────────────────────────────────────────
// A 3D book metaphor for browsing mistakes. Each "leaf" is a two-sided page.
// Leaf N front = mistake items[N]; leaf N back = items[N+1]. Leaf 0 front is
// the cover; the last leaf's back is the back cover. Click right edge to flip
// forward (rotateY 0 → -180), left edge to flip back. Keyboard arrows + Home/End.
// Reduced motion: back-face-visibility swap becomes a simple visibility fade.

// ─── MISTAKE BOOK (SPREAD VIEW) ────────────────────────────────────────────────
// A 3D book metaphor showing TWO pages at once (left + right, like an open book).
//
// Model:
//   - "spreadIdx" = current 0-based pair index. left = items[2*spreadIdx].
//   - When spreadIdx = 0 and book is closed, we show the COVER (full stage).
//   - When the cover is "opened" (first flip), we land on spreadIdx = 0 with
//     left = items[0] and right = items[1].
//   - Each subsequent flip advances spreadIdx by 1 (advances the right page).
//   - Click right edge → flip forward; left edge → flip back.
//   - Right page is the ONLY leaf that flips (rotateY around the spine/center).
//   - Left page is static; it displays whatever items[2*spreadIdx] is.
//
// Reduced motion: crossfade instead of 3D rotate.

function MistakeBook({ items, editingNotes, onNotesChange, onNotesSave, onNotesCancel, onToggleReviewed, onDelete, stats, onBack }) {
  const N = items.length;
  const totalSpreads = Math.max(1, Math.ceil(N / 2));   // pairs + at least 1 (cover)
  const [opened, setOpened] = useState(false);          // cover closed at first
  const [spreadIdx, setSpreadIdx] = useState(0);        // current pair index
  const [flipping, setFlipping] = useState(false);      // mid-flip guard

  const leftItem  = N === 0 ? null : items[2 * spreadIdx];
  const rightItem = N === 0 ? null : items[2 * spreadIdx + 1];
  const isFirstSpread = spreadIdx === 0;
  const isLastSpread  = spreadIdx === totalSpreads - 1;

  const flipForward = useCallback(() => {
    if (flipping) return;
    if (!opened) {
      // Cover → open the book to spread 0
      setFlipping(true);
      setOpened(true);
      setTimeout(() => setFlipping(false), 780);
      return;
    }
    if (isLastSpread) return;
    setFlipping(true);
    setSpreadIdx(i => Math.min(totalSpreads - 1, i + 1));
    setTimeout(() => setFlipping(false), 780);
  }, [flipping, opened, isLastSpread, totalSpreads]);

  const flipBack = useCallback(() => {
    if (flipping) return;
    if (!opened) return;                  // already on cover
    if (isFirstSpread) {
      // Going back from spread 0 → close back to cover
      setFlipping(true);
      setOpened(false);
      setTimeout(() => setFlipping(false), 780);
      return;
    }
    setFlipping(true);
    setSpreadIdx(i => Math.max(0, i - 1));
    setTimeout(() => setFlipping(false), 780);
  }, [flipping, opened, isFirstSpread]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault(); flipForward();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault(); flipBack();
      } else if (e.key === 'Home') {
        e.preventDefault();
        setOpened(false); setSpreadIdx(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setOpened(true);
        setSpreadIdx(Math.max(0, totalSpreads - 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flipForward, flipBack, totalSpreads]);

  const isAtStart = !opened;
  const isAtEnd = opened && isLastSpread;
  const pageLabel = !opened
    ? 'Cover'
    : `Spread ${spreadIdx + 1} of ${totalSpreads} · ${N} ${N === 1 ? 'mistake' : 'mistakes'}`;

  // For the flipping-right-page animation: we render two layers:
  //   - "prev right" = rightItem as it was BEFORE the flip (sticks to the right
  //     side and rotates -180° around the spine/center during a forward flip)
  //   - "next right" = the new rightItem (appears on the right after the flip)
  // For simplicity we just animate the whole .mj-right-leaf.

  const jumpToCover = () => { setOpened(false); setSpreadIdx(0); };
  const jumpToEnd = () => {
    setOpened(true);
    setSpreadIdx(Math.max(0, totalSpreads - 1));
  };

  return (
    <div className="mj-book-wrap">
      {/* Slim meta strip — always visible above the book */}
      <div className="mj-meta-strip">
        <button className="mj-meta-back" onClick={onBack}>← Back</button>
        <span className="mj-meta-pill">
          <strong>{N}</strong> {N === 1 ? 'mistake' : 'mistakes'}
        </span>
        <span className="mj-meta-divider" />
        <span className="mj-meta-pill">
          <strong>{stats.unreviewed || 0}</strong> to review
        </span>
        <span className="mj-meta-divider" />
        <span className="mj-meta-pill">
          <strong>{Object.keys(stats.byType || {}).length}</strong> topics
        </span>
      </div>

      <div className={`mj-book-stage ${opened ? 'is-open' : 'is-closed'}`}>
        {/* COVER (visible only when closed) */}
        {!opened && (
          <div className={`mj-cover ${N === 0 ? 'is-empty' : ''}`}>
            <BookCover stats={stats} totalCount={N} />
            <div className="mj-cover-hint">{N === 0 ? 'click → to peek inside' : 'click the right edge to open →'}</div>
          </div>
        )}

        {/* SPREAD (visible only when opened) */}
        {opened && (
          <>
            {/* Static LEFT page */}
            <div className="mj-page mj-page-left">
              {leftItem ? (
                <>
                  <BookPage
                    item={leftItem}
                    pageNum={2 * spreadIdx + 1}
                    notes={editingNotes[leftItem._id] !== undefined ? editingNotes[leftItem._id] : (leftItem.notes || '')}
                    onNotesChange={(v) => onNotesChange(leftItem._id, v)}
                    onNotesSave={(v) => onNotesSave(leftItem, v)}
                    onNotesCancel={() => onNotesCancel(leftItem)}
                    onToggle={() => onToggleReviewed(leftItem)}
                    onDelete={() => onDelete(leftItem)}
                  />
                  <div className="mj-page-corner">— {2 * spreadIdx + 1} —</div>
                </>
              ) : (
                <div className="mj-page-blank">End of journal</div>
              )}
            </div>

            {/* Spine divider */}
            <div className="mj-spine" />

            {/* RIGHT page: this is the flipping leaf. Renders TWO layers (front
                of current rightItem + back of nextItem) so when it rotates we
                see the next mistake appear. */}
            <div className={`mj-page mj-page-right mj-flip-leaf ${flipping ? 'is-flipping' : ''}`}>
              <div className="mj-leaf-face mj-leaf-face-front">
                {rightItem ? (
                  <>
                    <BookPage
                      item={rightItem}
                      pageNum={2 * spreadIdx + 2}
                      notes={editingNotes[rightItem._id] !== undefined ? editingNotes[rightItem._id] : (rightItem.notes || '')}
                      onNotesChange={(v) => onNotesChange(rightItem._id, v)}
                      onNotesSave={(v) => onNotesSave(rightItem, v)}
                      onNotesCancel={() => onNotesCancel(rightItem)}
                      onToggle={() => onToggleReviewed(rightItem)}
                      onDelete={() => onDelete(rightItem)}
                    />
                    <div className="mj-page-corner">— {2 * spreadIdx + 2} —</div>
                  </>
                ) : (
                  <BookBackCover items={items} stats={stats} />
                )}
              </div>
              <div className="mj-leaf-face mj-leaf-face-back">
                {/* The back of the right leaf shows the NEXT mistake. We
                    pre-render items[2*spreadIdx+2] here so when the leaf
                    rotates past -90° we reveal the next page. */}
                {(() => {
                  const nextItem = items[2 * spreadIdx + 2];
                  if (!nextItem) return <BookBackCover items={items} stats={stats} />;
                  return (
                    <>
                      <BookPage
                        item={nextItem}
                        pageNum={2 * spreadIdx + 3}
                        notes={editingNotes[nextItem._id] !== undefined ? editingNotes[nextItem._id] : (nextItem.notes || '')}
                        onNotesChange={(v) => onNotesChange(nextItem._id, v)}
                        onNotesSave={(v) => onNotesSave(nextItem, v)}
                        onNotesCancel={() => onNotesCancel(nextItem)}
                        onToggle={() => onToggleReviewed(nextItem)}
                        onDelete={() => onDelete(nextItem)}
                      />
                      <div className="mj-page-corner">— {2 * spreadIdx + 3} —</div>
                    </>
                  );
                })()}
              </div>
            </div>
          </>
        )}

        {/* Click zones — left half = back, right half = forward. Cover mode uses
            the whole stage as "forward". */}
        <div
          className="mj-click-zone mj-click-zone-left"
          onClick={flipBack}
          aria-label="Previous page"
          role="button"
          tabIndex={-1}
        >
          <div className="mj-click-zone-glow" />
        </div>
        <div
          className="mj-click-zone mj-click-zone-right"
          onClick={flipForward}
          aria-label="Next page"
          role="button"
          tabIndex={-1}
        >
          <div className="mj-click-zone-glow" />
        </div>

        <div className="mj-book-shadow" />
      </div>

      {/* Toolbar */}
      <div className="mj-book-toolbar">
        <button className="mj-toolbar-jump" disabled={isAtStart} onClick={jumpToCover}>« Cover</button>
        <button className="mj-book-nav-btn" disabled={isAtStart} onClick={flipBack}>
          ← Previous
        </button>
        <span className="mj-page-counter">{pageLabel}</span>
        <button className="mj-book-nav-btn" disabled={isAtEnd} onClick={flipForward}>
          Next →
        </button>
        <button className="mj-toolbar-jump" disabled={N === 0 || (opened && spreadIdx >= totalSpreads - 1)} onClick={jumpToEnd}>Back »</button>
      </div>
      <div className="mj-kbd-hints">
        <span><kbd className="mj-kbd">←</kbd> prev</span>
        <span><kbd className="mj-kbd">→</kbd> next</span>
        <span><kbd className="mj-kbd">Home</kbd> cover</span>
        <span><kbd className="mj-kbd">End</kbd> back cover</span>
      </div>
    </div>
  );
}
function BookCover({ stats, totalCount }) {
  const isEmpty = totalCount === 0;
  return (
    <div className="mj-cover-content">
      <div className="mj-cover-mark">{isEmpty ? '🌱' : '📖'}</div>
      <div>
        <h1 className="mj-cover-title">Mistake Journal</h1>
        <p className="mj-cover-sub">{isEmpty ? 'A clean slate — keep it that way.' : 'A workbook of lessons learned'}</p>
        <div className="mj-cover-stats">
          <div>
            <strong>{totalCount}</strong>
            <span>pages</span>
          </div>
          <div>
            <strong>{stats.unreviewed || 0}</strong>
            <span>to review</span>
          </div>
          <div>
            <strong>{Object.keys(stats.byType || {}).length}</strong>
            <span>topics</span>
          </div>
        </div>
        {isEmpty && (
          <div className="mj-cover-empty-hint">
            Wrong answers will be logged here automatically as you quiz.
          </div>
        )}
      </div>
      <div className="mj-cover-hint">{isEmpty ? 'click → to peek inside' : 'click the right edge to open →'}</div>
    </div>
  );
}

function BookBackCover({ items, stats }) {
  const topics = Object.keys(stats.byType || {}).sort();
  return (
    <div className="mj-back-content">
      <h3>End of book</h3>
      <div className="mj-back-topics">
        {topics.length === 0 ? (
          <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>No topics yet</span>
        ) : (
          topics.map(t => (
            <span key={t} className="mj-back-topic-chip">
              {TYPE_LABELS[t] || defaultLabel(t)} · {stats.byType[t] || 0}
            </span>
          ))
        )}
      </div>
      <p className="mj-back-quote">
        “Every mistake is a page turned toward understanding.”
      </p>
    </div>
  );
}

function BookPage({ item, pageNum, notes, onNotesChange, onNotesSave, onNotesCancel, onToggle, onDelete }) {
  const [editingNote, setEditingNote] = useState(false);
  const isReviewed = Boolean(item.reviewedAt);
  const typeLabel = TYPE_LABELS[item.quizType] || defaultLabel(item.quizType);
  const when = formatDate(item.ts);
  const userAns = item.userAnswer || '∅';
  const correctAns = item.correctAnswer || '—';

  return (
    <>
      <div className="mj-page-header">
        <span className="mj-page-num">Page {pageNum} · {when}</span>
        <span className="mj-page-topic">{typeLabel}</span>
      </div>

      <div className="mj-prompt">{item.prompt}</div>

      <div className="mj-page-answers">
        <div className="mj-page-ans is-wrong">
          <span className="mj-page-ans-l">Your answer</span>
          <span className="mj-page-ans-v">{userAns}</span>
        </div>
        <div className="mj-page-ans is-right">
          <span className="mj-page-ans-l">Correct</span>
          <span className="mj-page-ans-v">{correctAns}</span>
        </div>
      </div>

      <div className="mj-page-note-section">
        <span className="mj-page-note-label">Reflection</span>
        {!editingNote ? (
          <>
            <div
              style={{
                minHeight: 40,
                padding: '6px 8px',
                color: notes ? 'var(--mj-ink)' : 'var(--mj-ink-soft)',
                fontStyle: notes ? 'normal' : 'italic',
                fontSize: '0.88rem',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                cursor: 'text',
              }}
              onClick={(e) => { e.stopPropagation(); setEditingNote(true); }}
            >
              {notes || 'Tap to add a note about what you learned…'}
            </div>
            <div className="mj-page-mark" style={{ visibility: isReviewed ? 'visible' : 'hidden' }}>
              ✓ marked reviewed
            </div>
          </>
        ) : (
          <>
            <textarea
              className="mj-page-note"
              autoFocus
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="What did you learn? What pattern did you spot?"
            />
            <div className="mj-page-note-actions">
              <button className="mj-page-btn" onClick={(e) => { e.stopPropagation(); setEditingNote(false); }}>Close</button>
              <button
                className="mj-page-btn sage"
                onClick={(e) => { e.stopPropagation(); onNotesSave(notes); setEditingNote(false); }}
              >Save</button>
            </div>
          </>
        )}
      </div>

      {/* Page footer with action buttons — tucked bottom-right */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 10 }}>
        {!editingNote && (
          <button
            className={`mj-page-btn ${isReviewed ? '' : 'sage'}`}
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
          >
            {isReviewed ? 'Mark unreviewed' : 'Mark reviewed'}
          </button>
        )}
        {!editingNote && (
          <button
            className="mj-page-btn warm"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >Delete</button>
        )}
      </div>
    </>
  );
}
export default MistakeJournal;