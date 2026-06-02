// ROTAS DE COBRANCAS PROGRAMADAS
// Permite cadastrar, listar, ativar e remover regras de cobranca recorrente.

const express = require('express');
const db = require('../db/database');
const requireAuth = require('../middleware/requireAuth');
const { requireFeature } = require('../middleware/requireBilling');
const { publicError } = require('../lib/security');

const router = express.Router();
router.use(requireAuth);
router.use(requireFeature('scheduled_charges', 'cobranças automáticas'));

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function runCallback(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function uid(req) {
  return req.user?.userId ?? null;
}

function todayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(base, amount) {
  const date = new Date(`${base}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return date.toISOString().slice(0, 10);
}

function nextWeeklyDate(weekday, baseDate = todayIso()) {
  const base = new Date(`${baseDate}T12:00:00`);
  const current = base.getDay();
  let diff = Number(weekday) - current;
  if (diff < 0) diff += 7;
  return addDays(baseDate, diff);
}

function normalizeSchedule(input) {
  const scheduleType = input.schedule_type === 'interval' ? 'interval' : 'weekly';
  const weekday = input.weekday !== undefined && input.weekday !== null && input.weekday !== ''
    ? Number(input.weekday)
    : null;
  const intervalDays = input.interval_days ? Number(input.interval_days) : null;
  const baseDate = input.next_run_at || todayIso();

  if (scheduleType === 'interval') {
    return {
      scheduleType,
      weekday: null,
      intervalDays: intervalDays && intervalDays > 0 ? intervalDays : 7,
      nextRunAt: baseDate,
    };
  }

  return {
    scheduleType,
    weekday: weekday !== null && weekday >= 0 && weekday <= 6 ? weekday : 6,
    intervalDays: null,
    nextRunAt: nextWeeklyDate(weekday !== null && weekday >= 0 && weekday <= 6 ? weekday : 6, baseDate),
  };
}

router.get('/', async (req, res) => {
  try {
    const rows = await dbAll(
      `SELECT
         s.*,
         c.name AS client_name,
         c.whatsapp AS client_whatsapp
       FROM scheduled_charges s
       JOIN clients c ON c.id = s.client_id
       WHERE s.user_id IS ?
       ORDER BY s.active DESC, date(s.next_run_at) ASC, s.created_at DESC`,
      [uid(req)]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: publicError(err) });
  }
});

router.post('/', async (req, res) => {
  try {
    const clientId = Number(req.body.client_id);
    const title = String(req.body.title || '').trim();
    const amount = Number(req.body.amount) || 0;

    if (!clientId || !title || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Cliente, titulo e valor sao obrigatorios.' });
    }

    const client = await dbGet('SELECT id FROM clients WHERE id = ? AND user_id IS ?', [clientId, uid(req)]);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Cliente nao encontrado.' });
    }

    const schedule = normalizeSchedule(req.body);
    const created = await dbRun(
      `INSERT INTO scheduled_charges (
         user_id, client_id, title, amount, schedule_type, weekday, interval_days,
         next_run_at, active, pix_key, receiver_name, notes, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        uid(req),
        clientId,
        title,
        amount,
        schedule.scheduleType,
        schedule.weekday,
        schedule.intervalDays,
        schedule.nextRunAt,
        req.body.active === false ? 0 : 1,
        String(req.body.pix_key || '').trim(),
        String(req.body.receiver_name || '').trim(),
        String(req.body.notes || '').trim(),
      ]
    );

    res.status(201).json({ success: true, id: created.lastID });
  } catch (err) {
    res.status(500).json({ success: false, message: publicError(err) });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const current = await dbGet(
      'SELECT * FROM scheduled_charges WHERE id = ? AND user_id IS ?',
      [req.params.id, uid(req)]
    );
    if (!current) {
      return res.status(404).json({ success: false, message: 'Cobranca programada nao encontrada.' });
    }

    const clientId = Number(req.body.client_id || current.client_id);
    const title = String(req.body.title || current.title || '').trim();
    const amount = Number(req.body.amount ?? current.amount) || 0;
    if (!clientId || !title || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Cliente, titulo e valor sao obrigatorios.' });
    }

    const client = await dbGet('SELECT id FROM clients WHERE id = ? AND user_id IS ?', [clientId, uid(req)]);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Cliente nao encontrado.' });
    }

    const schedule = normalizeSchedule({
      schedule_type: req.body.schedule_type ?? current.schedule_type,
      weekday: req.body.weekday ?? current.weekday,
      interval_days: req.body.interval_days ?? current.interval_days,
      next_run_at: req.body.next_run_at || current.next_run_at || todayIso(),
    });

    await dbRun(
      `UPDATE scheduled_charges
       SET client_id = ?, title = ?, amount = ?, schedule_type = ?, weekday = ?, interval_days = ?,
           next_run_at = ?, active = ?, pix_key = ?, receiver_name = ?, notes = ?, updated_at = datetime('now')
       WHERE id = ? AND user_id IS ?`,
      [
        clientId,
        title,
        amount,
        schedule.scheduleType,
        schedule.weekday,
        schedule.intervalDays,
        schedule.nextRunAt,
        req.body.active === false ? 0 : 1,
        String(req.body.pix_key ?? current.pix_key ?? '').trim(),
        String(req.body.receiver_name ?? current.receiver_name ?? '').trim(),
        String(req.body.notes ?? current.notes ?? '').trim(),
        req.params.id,
        uid(req),
      ]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: publicError(err) });
  }
});

router.put('/:id/toggle', async (req, res) => {
  try {
    const active = req.body.active === false ? 0 : 1;
    const result = await dbRun(
      'UPDATE scheduled_charges SET active = ?, updated_at = datetime(\'now\') WHERE id = ? AND user_id IS ?',
      [active, req.params.id, uid(req)]
    );
    if (!result.changes) {
      return res.status(404).json({ success: false, message: 'Cobranca programada nao encontrada.' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: publicError(err) });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await dbRun(
      'DELETE FROM scheduled_charges WHERE id = ? AND user_id IS ?',
      [req.params.id, uid(req)]
    );
    if (!result.changes) {
      return res.status(404).json({ success: false, message: 'Cobranca programada nao encontrada.' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: publicError(err) });
  }
});

module.exports = router;
