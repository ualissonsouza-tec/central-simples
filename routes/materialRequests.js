// ROTAS DE PLANEJAMENTO DE MATERIAIS
// Regras por obra para calcular total, saldo restante e pedidos parciais.

const express = require('express');
const db = require('../db/database');
const requireAuth = require('../middleware/requireAuth');
const { requireFeature } = require('../middleware/requireBilling');
const { publicError } = require('../lib/security');
const {
  applyMaterialOrder,
  buildMaterialRequestMessage,
  calculateMaterialPlan,
  normalizeMaterials,
  normalizeWorkdays,
} = require('../lib/materialPlanning');

const router = express.Router();
router.use(requireAuth);
router.use(requireFeature('material_planning', 'planejamento de materiais da obra'));

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

async function validateClient(clientId, userId) {
  if (!clientId) return null;
  return dbGet('SELECT * FROM clients WHERE id = ? AND user_id IS ?', [clientId, userId]);
}

async function validateOrcamento(orcamentoId, userId) {
  if (!orcamentoId) return null;
  return dbGet('SELECT id FROM orcamentos WHERE id = ? AND user_id IS ?', [orcamentoId, userId]);
}

function normalizePayload(body) {
  const clientId = Number(body.client_id) || 0;
  const orcamentoId = body.orcamento_id ? Number(body.orcamento_id) : null;
  const title = String(body.title || '').trim();
  const areaTotal = Number(body.area_total) || 0;
  const areaDone = Math.max(0, Number(body.area_done) || 0);
  const dailyArea = Number(body.daily_area) || 0;
  const workdays = normalizeWorkdays(body.workdays);
  const materials = normalizeMaterials(body.materials);

  if (!clientId || !title || areaTotal <= 0 || dailyArea <= 0) {
    throw Object.assign(new Error('Cliente, titulo, metragem total e producao diaria sao obrigatorios.'), { status: 400 });
  }

  if (!materials.length) {
    throw Object.assign(new Error('Cadastre pelo menos um material com consumo por m2 para calcular a obra.'), { status: 400 });
  }

  return {
    clientId,
    orcamentoId,
    title,
    serviceType: String(body.service_type || '').trim(),
    areaTotal,
    areaDone: Math.min(areaDone, areaTotal),
    dailyArea,
    lossPercent: Math.max(0, Number(body.loss_percent) || 0),
    deliveryDays: Math.max(0, Math.ceil(Number(body.delivery_days) || 0)),
    safetyDays: Math.max(0, Math.ceil(Number(body.safety_days) || 0)),
    workdaysJson: JSON.stringify(workdays),
    materialsJson: JSON.stringify(materials),
    ownerWhatsapp: String(body.owner_whatsapp || '').replace(/\D/g, ''),
    active: body.active === false ? 0 : 1,
  };
}

function attachAnalysis(row) {
  const analysis = calculateMaterialPlan(row);
  return {
    ...row,
    analysis,
    message: buildMaterialRequestMessage(row, analysis),
  };
}

function sendRouteError(res, err) {
  const status = err.status || 500;
  return res.status(status).json({
    success: false,
    message: status < 500 ? err.message : publicError(err),
  });
}

router.get('/', async (req, res) => {
  try {
    const rows = await dbAll(
      `SELECT
         m.*,
         c.name AS client_name,
         c.whatsapp AS client_whatsapp,
         o.title AS orcamento_title
       FROM material_rules m
       JOIN clients c ON c.id = m.client_id
       LEFT JOIN orcamentos o ON o.id = m.orcamento_id
       WHERE m.user_id IS ?
       ORDER BY m.active DESC, m.updated_at DESC, m.created_at DESC`,
      [uid(req)]
    );

    res.json({ success: true, data: rows.map(attachAnalysis) });
  } catch (err) {
    sendRouteError(res, err);
  }
});

router.post('/', async (req, res) => {
  try {
    const payload = normalizePayload(req.body);
    const userId = uid(req);
    const client = await validateClient(payload.clientId, userId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Cliente nao encontrado.' });
    }

    if (payload.orcamentoId && !(await validateOrcamento(payload.orcamentoId, userId))) {
      return res.status(404).json({ success: false, message: 'Orcamento nao encontrado.' });
    }

    const created = await dbRun(
      `INSERT INTO material_rules (
         user_id, client_id, orcamento_id, title, service_type, area_total, area_done,
         daily_area, loss_percent, delivery_days, safety_days, workdays_json, materials_json,
         owner_whatsapp, active, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        userId,
        payload.clientId,
        payload.orcamentoId,
        payload.title,
        payload.serviceType,
        payload.areaTotal,
        payload.areaDone,
        payload.dailyArea,
        payload.lossPercent,
        payload.deliveryDays,
        payload.safetyDays,
        payload.workdaysJson,
        payload.materialsJson,
        payload.ownerWhatsapp || client.whatsapp || '',
        payload.active,
      ]
    );

    res.status(201).json({ success: true, id: created.lastID });
  } catch (err) {
    sendRouteError(res, err);
  }
});

router.put('/:id', async (req, res) => {
  try {
    const current = await dbGet('SELECT * FROM material_rules WHERE id = ? AND user_id IS ?', [req.params.id, uid(req)]);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Regra de material nao encontrada.' });
    }

    const payload = normalizePayload(req.body);
    const userId = uid(req);
    const client = await validateClient(payload.clientId, userId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Cliente nao encontrado.' });
    }

    if (payload.orcamentoId && !(await validateOrcamento(payload.orcamentoId, userId))) {
      return res.status(404).json({ success: false, message: 'Orcamento nao encontrado.' });
    }

    await dbRun(
      `UPDATE material_rules
       SET client_id = ?, orcamento_id = ?, title = ?, service_type = ?, area_total = ?,
           area_done = ?, daily_area = ?, loss_percent = ?, delivery_days = ?, safety_days = ?,
           workdays_json = ?, materials_json = ?, owner_whatsapp = ?, active = ?, updated_at = datetime('now')
       WHERE id = ? AND user_id IS ?`,
      [
        payload.clientId,
        payload.orcamentoId,
        payload.title,
        payload.serviceType,
        payload.areaTotal,
        payload.areaDone,
        payload.dailyArea,
        payload.lossPercent,
        payload.deliveryDays,
        payload.safetyDays,
        payload.workdaysJson,
        payload.materialsJson,
        payload.ownerWhatsapp || client.whatsapp || '',
        payload.active,
        req.params.id,
        userId,
      ]
    );

    res.json({ success: true });
  } catch (err) {
    sendRouteError(res, err);
  }
});

router.post('/:id/mark-sent', async (req, res) => {
  try {
    const result = await dbRun(
      `UPDATE material_rules
       SET last_request_sent_at = datetime('now'), last_alerted_at = datetime('now'),
           last_error = '', updated_at = datetime('now')
       WHERE id = ? AND user_id IS ?`,
      [req.params.id, uid(req)]
    );

    if (!result.changes) {
      return res.status(404).json({ success: false, message: 'Regra de material nao encontrada.' });
    }

    res.json({ success: true });
  } catch (err) {
    sendRouteError(res, err);
  }
});

router.post('/:id/orders', async (req, res) => {
  try {
    const row = await dbGet(
      `SELECT
         m.*,
         c.name AS client_name,
         c.whatsapp AS client_whatsapp
       FROM material_rules m
       JOIN clients c ON c.id = m.client_id
       WHERE m.id = ? AND m.user_id IS ?`,
      [req.params.id, uid(req)]
    );

    if (!row) {
      return res.status(404).json({ success: false, message: 'Planejamento de material nao encontrado.' });
    }

    const order = applyMaterialOrder(row, req.body.items);
    if (!order.orderedItems.length) {
      return res.status(400).json({
        success: false,
        message: 'Informe a quantidade de pelo menos um material para montar o pedido.',
      });
    }

    await dbRun(
      `UPDATE material_rules
       SET materials_json = ?, last_request_sent_at = datetime('now'),
           last_alerted_at = datetime('now'), last_error = '', updated_at = datetime('now')
       WHERE id = ? AND user_id IS ?`,
      [JSON.stringify(order.materials), req.params.id, uid(req)]
    );

    res.json({
      success: true,
      data: {
        items: order.orderedItems,
        analysis: order.analysis,
        message: order.message,
        to: row.owner_whatsapp || row.client_whatsapp || '',
      },
    });
  } catch (err) {
    sendRouteError(res, err);
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await dbRun(
      'DELETE FROM material_rules WHERE id = ? AND user_id IS ?',
      [req.params.id, uid(req)]
    );

    if (!result.changes) {
      return res.status(404).json({ success: false, message: 'Regra de material nao encontrada.' });
    }

    res.json({ success: true });
  } catch (err) {
    sendRouteError(res, err);
  }
});

module.exports = router;
