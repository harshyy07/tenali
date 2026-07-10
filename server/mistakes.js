/**
 * MISTAKES MODULE — Mistake Journal backend
 *
 * Endpoints (all require Bearer JWT):
 *   POST   /api/mistakes              log a wrong answer
 *   GET    /api/mistakes              list with filters (type, reviewed, q, limit, offset)
 *   GET    /api/mistakes/stats        aggregated counts (total, unreviewed, byType, byWeek)
 *   PATCH  /api/mistakes/:id          set reviewedAt / notes
 *   DELETE /api/mistakes/:id          remove a single mistake
 *   POST   /api/mistakes/merge-guest  bulk-import guest mistakes
 *
 * Independence: no cross-feature deps (no /api/hints, no /api/xp).
 * Dedupe key: (quizType, prompt, userAnswer, hour-bucket).
 * Per-user cap: 500 active mistakes; ring-buffer archive (max 5000).
 * Falls back to in-memory store when MongoDB is offline.
 */

const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');

const MAX_PER_USER = 500;
const ARCHIVE_RING_SIZE = 5000;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const HOUR_MS = 60 * 60 * 1000;

// ─── MONGOOSE SCHEMA ──────────────────────────────────────────────────────────

const MistakeSchema = new mongoose.Schema({
  userId:        { type: String, required: true, index: true },
  quizType:      { type: String, required: true, index: true },
  prompt:        { type: String, required: true },
  userAnswer:    { type: String, required: true },
  correctAnswer: { type: String, default: '' },
  timeMs:        { type: Number, default: 0 },
  questionId:    { type: String, default: '' },
  ts:            { type: Date,   default: Date.now, index: true },
  reviewedAt:    { type: Date,   default: null },
  notes:         { type: String, default: '' },
  pendingSync:   { type: Boolean, default: false },
});

MistakeSchema.index({ userId: 1, quizType: 1, prompt: 1, userAnswer: 1, ts: 1 });
MistakeSchema.index({ userId: 1, reviewedAt: 1 });
MistakeSchema.index({ userId: 1, ts: -1 });

const Mistake = mongoose.models.Mistake || mongoose.model('Mistake', MistakeSchema);

// ─── IN-MEMORY FALLBACK ───────────────────────────────────────────────────────

const inMemoryMistakes = new Map();
const archivedMistakes = new Map();

function getInMemList(userId) {
  if (!inMemoryMistakes.has(userId)) inMemoryMistakes.set(userId, []);
  return inMemoryMistakes.get(userId);
}

function pushArchive(userId, m) {
  if (!archivedMistakes.has(userId)) archivedMistakes.set(userId, []);
  const ring = archivedMistakes.get(userId);
  ring.push(m);
  if (ring.length > ARCHIVE_RING_SIZE) ring.splice(0, ring.length - ARCHIVE_RING_SIZE);
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function hourBucket(ts) {
  return Math.floor((Number(ts) || Date.now()) / HOUR_MS);
}

function dedupeKey(m) {
  return [
    m.userId || '',
    m.quizType || '',
    m.prompt || '',
    m.userAnswer || '',
    hourBucket(m.ts),
  ].join('|');
}

function publicMistake(m) {
  if (!m) return null;
  const o = (typeof m.toObject === 'function') ? m.toObject() : Object.assign({}, m);
  delete o.__v;
  return o;
}

function isMongoLive() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ error: 'unauthorized', message: 'Bearer token required' });
  try {
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'tenali-dev-secret-change-me';
    const decoded = jwt.verify(match[1], secret);
    req.userId = decoded.username || decoded.sub || decoded.userId || decoded._id;
    if (!req.userId) return res.status(401).json({ error: 'unauthorized', message: 'invalid token payload' });
    next();
  } catch (e) {
    return res.status(401).json({ error: 'unauthorized', message: 'invalid token' });
  }
}

function validateLogPayload(body) {
  const errors = [];
  if (!body) errors.push('body required');
  if (body && !body.quizType) errors.push('quizType required');
  if (body && (body.prompt == null || body.prompt === '')) errors.push('prompt required');
  if (body && (body.userAnswer == null)) errors.push('userAnswer required');
  return errors;
}

// ─── ROUTER ───────────────────────────────────────────────────────────────────

const router = express.Router();

/**
 * POST /api/mistakes — log a wrong answer.
 * Body: { quizType, prompt, userAnswer, correctAnswer?, timeMs?, questionId?, ts? }
 * 200: full mistake with id; 409: duplicate within hour bucket; 400: validation.
 */
router.post('/', requireAuth, async (req, res) => {
  const errors = validateLogPayload(req.body);
  if (errors.length) return res.status(400).json({ error: 'validation_error', details: errors });

  const ts = req.body.ts ? new Date(req.body.ts) : new Date();
  const doc = {
    userId:        req.userId,
    quizType:      String(req.body.quizType),
    prompt:        String(req.body.prompt),
    userAnswer:    String(req.body.userAnswer),
    correctAnswer: req.body.correctAnswer != null ? String(req.body.correctAnswer) : '',
    timeMs:        Number(req.body.timeMs) || 0,
    questionId:    req.body.questionId ? String(req.body.questionId) : '',
    ts,
    reviewedAt:    null,
    notes:         '',
    pendingSync:   false,
  };

  if (isMongoLive()) {
    try {
      const bucketStart = new Date(hourBucket(ts) * HOUR_MS);
      const bucketEnd   = new Date(bucketStart.getTime() + HOUR_MS);
      const existing = await Mistake.findOne({
        userId:     doc.userId,
        quizType:   doc.quizType,
        prompt:     doc.prompt,
        userAnswer: doc.userAnswer,
        ts:         { $gte: bucketStart, $lt: bucketEnd },
      });
      if (existing) return res.status(409).json({ error: 'duplicate', mistake: publicMistake(existing) });

      const created = await Mistake.create(doc);

      const count = await Mistake.countDocuments({ userId: doc.userId });
      if (count > MAX_PER_USER) {
        const evict = await Mistake.find({ userId: doc.userId }).sort({ ts: 1 }).limit(count - MAX_PER_USER);
        if (evict.length) console.log('[mistakes] evicted ' + evict.length + ' oldest for ' + doc.userId);
        const ids = evict.map(function(e){ return e._id; });
        await Mistake.deleteMany({ _id: { $in: ids } });
      }

      return res.json(publicMistake(created));
    } catch (e) {
      console.error('[mistakes] POST mongo error:', e.message);
      return res.status(500).json({ error: 'server_error', message: e.message });
    }
  }

  // In-memory fallback
  const list = getInMemList(req.userId);
  const key = dedupeKey(Object.assign({}, doc));
  const dup = list.find(function(m){ return dedupeKey(Object.assign({}, m)) === key; });
  if (dup) return res.status(409).json({ error: 'duplicate', mistake: dup });

  doc._id = crypto.randomBytes(8).toString('hex');
  list.push(doc);
  if (list.length > MAX_PER_USER) {
    const evict = list.splice(0, list.length - MAX_PER_USER);
    evict.forEach(function(m){ pushArchive(req.userId, m); });
  }
  return res.json(doc);
});

/**
 * GET /api/mistakes — list with filters.
 * Query: type, reviewed (true|false), q (search), limit (default 50, max 200), offset (default 0).
 * Returns: { mistakes: [...], total, limit, offset }
 */
router.get('/', requireAuth, async (req, res) => {
  const limit  = Math.min(Number(req.query.limit)  || DEFAULT_LIMIT, MAX_LIMIT);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  const filter = { userId: req.userId };
  if (req.query.type) filter.quizType = String(req.query.type);
  if (req.query.reviewed === 'true')  filter.reviewedAt = { $ne: null };
  if (req.query.reviewed === 'false') filter.reviewedAt = null;

  let searchRe = null;
  if (req.query.q) {
    try {
      const escaped = String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      searchRe = new RegExp(escaped, 'i');
    } catch (_) { /* ignore bad regex */ }
  }

  if (isMongoLive()) {
    try {
      if (searchRe) {
        filter.$or = [
          { prompt: searchRe },
          { userAnswer: searchRe },
          { correctAnswer: searchRe },
        ];
      }
      const total = await Mistake.countDocuments(filter);
      const docs = await Mistake.find(filter).sort({ ts: -1 }).skip(offset).limit(limit);
      return res.json({
        mistakes: docs.map(publicMistake),
        total: total, limit: limit, offset: offset,
      });
    } catch (e) {
      console.error('[mistakes] GET mongo error:', e.message);
      return res.status(500).json({ error: 'server_error', message: e.message });
    }
  }

  // In-memory fallback
  let list = getInMemList(req.userId);
  if (filter.quizType)                       list = list.filter(function(m){ return m.quizType === filter.quizType; });
  if (filter.reviewedAt === null)            list = list.filter(function(m){ return !m.reviewedAt; });
  if (filter.reviewedAt && filter.reviewedAt.$ne === null) list = list.filter(function(m){ return m.reviewedAt; });
  if (searchRe) {
    list = list.filter(function(m){
      return searchRe.test(m.prompt || '') ||
             searchRe.test(m.userAnswer || '') ||
             searchRe.test(m.correctAnswer || '');
    });
  }
  list = list.slice().sort(function(a, b){ return new Date(b.ts) - new Date(a.ts); });
  const total = list.length;
  const slice = list.slice(offset, offset + limit);
  return res.json({ mistakes: slice, total: total, limit: limit, offset: offset });
});

/**
 * GET /api/mistakes/stats — aggregated counts.
 * Returns: { total, unreviewed, byType: { quizType: n }, byWeek: [{ weekStart, count }] }
 */
router.get('/stats', requireAuth, async (req, res) => {
  const userId = req.userId;

  if (isMongoLive()) {
    try {
      const total      = await Mistake.countDocuments({ userId: userId });
      const unreviewed = await Mistake.countDocuments({ userId: userId, reviewedAt: null });

      const byTypeAgg = await Mistake.aggregate([
        { $match: { userId: userId } },
        { $group: { _id: '$quizType', count: { $sum: 1 } } },
      ]);
      const byType = {};
      byTypeAgg.forEach(function(r){ byType[r._id] = r.count; });

      const byWeekAgg = await Mistake.aggregate([
        { $match: { userId: userId } },
        { $group: {
            _id: { $dateTrunc: { date: '$ts', unit: 'week', startOfWeek: 'monday' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: -1 } },
        { $limit: 12 },
      ]);
      const byWeek = byWeekAgg.map(function(r){ return { weekStart: r._id, count: r.count }; }).reverse();

      return res.json({ total: total, unreviewed: unreviewed, byType: byType, byWeek: byWeek });
    } catch (e) {
      console.error('[mistakes] GET stats mongo error:', e.message);
      return res.status(500).json({ error: 'server_error', message: e.message });
    }
  }

  // In-memory fallback
  const list = getInMemList(userId);
  const total      = list.length;
  const unreviewed = list.filter(function(m){ return !m.reviewedAt; }).length;

  const byType = {};
  list.forEach(function(m){ byType[m.quizType] = (byType[m.quizType] || 0) + 1; });

  const weekMap = new Map();
  list.forEach(function(m){
    const d = new Date(m.ts);
    const day = d.getUTCDay();
    const monday = new Date(d);
    const offset = day === 0 ? -6 : 1 - day;
    monday.setUTCDate(monday.getUTCDate() + offset);
    monday.setUTCHours(0, 0, 0, 0);
    const k = monday.toISOString();
    weekMap.set(k, (weekMap.get(k) || 0) + 1);
  });
  const byWeek = Array.from(weekMap.entries())
    .sort(function(a, b){ return new Date(a[0]) - new Date(b[0]); })
    .slice(-12)
    .map(function(pair){ return { weekStart: pair[0], count: pair[1] }; });

  return res.json({ total: total, unreviewed: unreviewed, byType: byType, byWeek: byWeek });
});

/**
 * PATCH /api/mistakes/:id — review / notes.
 * Body: { reviewedAt: ISO-date | null | 'clear', notes?: string }
 * Returns: { ok: true, mistake: { ...full mistake... } }
 */
router.patch('/:id', requireAuth, async (req, res) => {
  const id = String(req.params.id);
  const updates = {};
  if ('notes' in req.body) updates.notes = String(req.body.notes || '');
  if ('reviewedAt' in req.body) {
    const v = req.body.reviewedAt;
    if (v === null || v === 'clear' || v === '' || v === false) updates.reviewedAt = null;
    else updates.reviewedAt = new Date(v);
  }
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'validation_error', message: 'no updateable fields' });
  }

  if (isMongoLive()) {
    try {
      const updated = await Mistake.findOneAndUpdate(
        { _id: id, userId: req.userId },
        updates,
        { new: true }
      );
      if (!updated) return res.status(404).json({ error: 'not_found' });
      return res.json({ ok: true, mistake: publicMistake(updated) });
    } catch (e) {
      console.error('[mistakes] PATCH mongo error:', e.message);
      return res.status(500).json({ error: 'server_error', message: e.message });
    }
  }

  // In-memory fallback
  const list = getInMemList(req.userId);
  const idx = list.findIndex(function(m){ return String(m._id) === id; });
  if (idx === -1) return res.status(404).json({ error: 'not_found' });
  Object.assign(list[idx], updates);
  return res.json({ ok: true, mistake: list[idx] });
});

/**
 * DELETE /api/mistakes/:id — remove.
 * Returns: { ok: true }
 */
router.delete('/:id', requireAuth, async (req, res) => {
  const id = String(req.params.id);

  if (isMongoLive()) {
    try {
      const result = await Mistake.deleteOne({ _id: id, userId: req.userId });
      if (result.deletedCount === 0) return res.status(404).json({ error: 'not_found' });
      return res.json({ ok: true });
    } catch (e) {
      console.error('[mistakes] DELETE mongo error:', e.message);
      return res.status(500).json({ error: 'server_error', message: e.message });
    }
  }

  const list = getInMemList(req.userId);
  const idx = list.findIndex(function(m){ return String(m._id) === id; });
  if (idx === -1) return res.status(404).json({ error: 'not_found' });
  list.splice(idx, 1);
  return res.json({ ok: true });
});

/**
 * POST /api/mistakes/merge-guest — bulk-import guest mistakes captured before login.
 * Body: { mistakes: [{ quizType, prompt, userAnswer, correctAnswer?, timeMs?, questionId?, ts? }] }
 *
 * Dedupe is local-only: we mark accepted rows with pendingSync=true and let client clear the
 * local store on a successful response. Server-side cross-user dedupe is NOT performed (these
 * are pre-login entries trusted by virtue of arriving with the user's JWT).
 *
 * Returns: { ok, created, skipped, mistakes: [...] }
 */
router.post('/merge-guest', requireAuth, async (req, res) => {
  const items = Array.isArray(req.body && req.body.mistakes) ? req.body.mistakes : [];

  let created = 0;
  let skipped = 0;
  const accepted = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const errs = validateLogPayload(item);
    if (errs.length) { skipped++; continue; }

    const ts = item.ts ? new Date(item.ts) : new Date();
    const doc = {
      userId:        req.userId,
      quizType:      String(item.quizType),
      prompt:        String(item.prompt),
      userAnswer:    String(item.userAnswer),
      correctAnswer: item.correctAnswer != null ? String(item.correctAnswer) : '',
      timeMs:        Number(item.timeMs) || 0,
      questionId:    item.questionId ? String(item.questionId) : '',
      ts,
      reviewedAt:    null,
      notes:         '',
      pendingSync:   true, // marker — client clears local copy on success
    };

    if (isMongoLive()) {
      try {
        const exists = await Mistake.findOne({
          userId:     doc.userId,
          quizType:   doc.quizType,
          prompt:     doc.prompt,
          userAnswer: doc.userAnswer,
          ts:         ts,
        });
        if (exists) { skipped++; continue; }
        const c = await Mistake.create(doc);
        accepted.push(publicMistake(c));
        created++;
      } catch (e) {
        console.error('[mistakes] merge-guest mongo error:', e.message);
        skipped++;
      }
    } else {
      // In-memory fallback
      const list = getInMemList(req.userId);
      const key = dedupeKey(Object.assign({}, doc));
      const dup = list.find(function(m){ return dedupeKey(Object.assign({}, m)) === key; });
      if (dup) { skipped++; continue; }
      doc._id = crypto.randomBytes(8).toString('hex');
      list.push(doc);
      accepted.push(doc);
      created++;
    }
  }

  // Eviction pass after bulk insert
  if (isMongoLive()) {
    try {
      const count = await Mistake.countDocuments({ userId: req.userId });
      if (count > MAX_PER_USER) {
        const evict = await Mistake.find({ userId: req.userId }).sort({ ts: 1 }).limit(count - MAX_PER_USER);
        const ids = evict.map(function(e){ return e._id; });
        await Mistake.deleteMany({ _id: { $in: ids } });
      }
    } catch (_) { /* best-effort */ }
  } else {
    const list = getInMemList(req.userId);
    if (list.length > MAX_PER_USER) {
      const evict = list.splice(0, list.length - MAX_PER_USER);
      evict.forEach(function(m){ pushArchive(req.userId, m); });
    }
  }

  return res.json({ ok: true, created: created, skipped: skipped, mistakes: accepted });
});

module.exports = { router };
