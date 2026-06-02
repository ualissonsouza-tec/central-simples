// routes/clients.js
// ROTAS DE CLIENTES
// Lista, cria e atualiza clientes usados pelos orcamentos e historico.

const express     = require('express');
const db          = require('../db/database');
const requireAuth = require('../middleware/requireAuth');
const { requireFeature } = require('../middleware/requireBilling');
const { publicError } = require('../lib/security');

const router = express.Router();
router.use(requireAuth);

function dbAll(sql, p = []) {
  return new Promise((ok, er) => db.all(sql, p, (e, r) => e ? er(e) : ok(r)));
}

function dbGet(sql, p = []) {
  return new Promise((ok, er) => db.get(sql, p, (e, r) => e ? er(e) : ok(r)));
}

// Retorna user_id do token (null = master)
function uid(req) { return req.user?.userId ?? null; }

// GET /api/clients â€” lista clientes do usuÃ¡rio logado
router.get('/', async (req, res) => {
  try {
    const rows = await dbAll(
      'SELECT * FROM clients WHERE user_id IS ? ORDER BY name ASC',
      [uid(req)]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: publicError(err) });
  }
});

// GET /api/clients/:id/history - historico completo de um cliente
router.get('/:id/history', requireFeature('client_history', 'histórico completo do cliente'), async (req, res) => {
  try {
    const clientId = Number(req.params.id);
    if (!clientId) {
      return res.status(400).json({ success: false, message: 'Cliente invalido.' });
    }

    const client = await dbGet(
      'SELECT * FROM clients WHERE id = ? AND user_id IS ? LIMIT 1',
      [clientId, uid(req)]
    );

    if (!client) {
      return res.status(404).json({ success: false, message: 'Cliente nao encontrado.' });
    }

    const [orcamentos, notes, scheduled_charges] = await Promise.all([
      dbAll(
        `SELECT
           id, title, description, total_value, status, due_date, service_date,
           created_at, updated_at, approval_sent_at, approved_at, rejected_at,
           client_decision_note, recurrence_rule, recurrence_next_date,
           return_reminder_date, template_name, checklist_json, internal_notes
         FROM orcamentos
         WHERE client_id = ? AND user_id IS ?
         ORDER BY datetime(created_at) DESC`,
        [clientId, uid(req)]
      ),
      dbAll(
        `SELECT id, note, created_at
         FROM client_notes
         WHERE client_id = ? AND user_id IS ?
         ORDER BY datetime(created_at) DESC`,
        [clientId, uid(req)]
      ),
      dbAll(
        `SELECT id, title, amount, schedule_type, weekday, interval_days, next_run_at,
                last_sent_at, active, pix_key, receiver_name, notes, last_error,
                created_at, updated_at
         FROM scheduled_charges
         WHERE client_id = ? AND user_id IS ?
         ORDER BY active DESC, date(next_run_at) ASC, datetime(created_at) DESC`,
        [clientId, uid(req)]
      ),
    ]);

    res.json({
      success: true,
      data: {
        client,
        orcamentos,
        notes,
        scheduled_charges,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: publicError(err) });
  }
});

module.exports = router;

