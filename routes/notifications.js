// ROTAS DE NOTIFICACOES
// Alimenta o sino do dashboard e registra dispositivos para push do PWA.

const express = require('express');
const db = require('../db/database');
const requireAuth = require('../middleware/requireAuth');
const { publicError } = require('../lib/security');
const {
  getPublicKey,
  isPushConfigured,
  savePushSubscription,
} = require('../lib/pushNotifications');

const router = express.Router();
router.use(requireAuth);

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
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

router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
    const unreadOnly = String(req.query.unread || '') === '1';
    const where = unreadOnly ? 'WHERE n.user_id IS ? AND n.read_at IS NULL' : 'WHERE n.user_id IS ?';
    const rows = await dbAll(
      `SELECT
         n.id,
         n.kind,
         n.title,
         n.body,
         n.entity_type,
         n.entity_id,
         n.action_url,
         n.read_at,
         n.created_at,
         o.title AS orcamento_title,
         o.total_value AS orcamento_value,
         o.status AS orcamento_status,
         o.due_date AS orcamento_due_date,
         o.service_date AS orcamento_service_date,
         o.client_decision_note,
         o.approved_at,
         o.rejected_at,
         c.name AS client_name,
         c.whatsapp AS client_whatsapp,
         c.address AS client_address
       FROM notifications n
       LEFT JOIN orcamentos o
         ON n.entity_type = 'orcamento'
        AND CAST(n.entity_id AS INTEGER) = o.id
        AND o.user_id IS n.user_id
       LEFT JOIN clients c ON c.id = o.client_id
       ${where}
       ORDER BY datetime(n.created_at) DESC, n.id DESC
       LIMIT ?`,
      [uid(req), limit]
    );
    const unread = await dbGet(
      'SELECT COUNT(*) AS total FROM notifications WHERE user_id IS ? AND read_at IS NULL',
      [uid(req)]
    );

    res.json({
      success: true,
      unread: unread?.total || 0,
      data: rows,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: publicError(err) });
  }
});

router.get('/push/public-key', (req, res) => {
  res.json({
    success: true,
    configured: isPushConfigured(),
    publicKey: getPublicKey(),
  });
});

router.post('/push/subscribe', async (req, res) => {
  try {
    if (!isPushConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Notificacoes push ainda nao configuradas no servidor.',
      });
    }

    await savePushSubscription(
      uid(req),
      req.body.subscription,
      req.get('user-agent') || ''
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: publicError(err) });
  }
});

router.put('/read-all', async (req, res) => {
  try {
    await dbRun(
      `UPDATE notifications
       SET read_at = COALESCE(read_at, datetime('now'))
       WHERE user_id IS ? AND read_at IS NULL`,
      [uid(req)]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: publicError(err) });
  }
});

router.put('/:id/read', async (req, res) => {
  try {
    const result = await dbRun(
      `UPDATE notifications
       SET read_at = COALESCE(read_at, datetime('now'))
       WHERE id = ? AND user_id IS ?`,
      [req.params.id, uid(req)]
    );

    if (!result.changes) {
      return res.status(404).json({ success: false, message: 'Notificacao nao encontrada.' });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: publicError(err) });
  }
});

module.exports = router;
