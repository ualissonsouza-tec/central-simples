const crypto = require('crypto');
// ============================================================================
// ROTAS DE ORCAMENTOS
// Centraliza CRUD, PDF, modelos, link publico, recorrencia e eventos automaticos.
// ============================================================================

// ----------------------------------------------------------------------------
// 1. Imports, router e acesso ao banco
// ----------------------------------------------------------------------------
const express = require('express');
const db = require('../db/database');
const requireAuth = require('../middleware/requireAuth');
const { requireActiveSubscription, requireFeature } = require('../middleware/requireBilling');
const { renderOrcamentoPdf } = require('../lib/orcamentoPdf');
const { getAppOrigin, publicError } = require('../lib/security');

const router = express.Router();
router.use(requireAuth);

// ----------------------------------------------------------------------------
// 2. Helpers genericos de banco, datas e normalizacao
// ----------------------------------------------------------------------------
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

function parseJsonArray(raw) {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeChecklist(list) {
  if (!Array.isArray(list)) return '[]';
  return JSON.stringify(
    list
      .map((item) => {
        if (typeof item === 'string') {
          return { text: item.trim(), done: false };
        }
        return {
          text: String(item?.text || '').trim(),
          done: Boolean(item?.done),
        };
      })
      .filter((item) => item.text)
  );
}

function normalizeItems(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => ({
      description: String(item?.description || '').trim(),
      quantity: Number(item?.quantity) || 0,
      unit_price: Number(item?.unit_price) || 0,
    }))
    .filter((item) => item.description);
}

function isValidStatus(status) {
  return ['Rascunho', 'Pendente', 'Aprovado', 'Recusado', 'Pago'].includes(status);
}

function validStatus(status) {
  return isValidStatus(status) ? status : 'Pendente';
}

function validRecurrence(rule) {
  return ['Semanal', 'Quinzenal', 'Mensal', 'Trimestral', 'Semestral', 'Anual'].includes(rule)
    ? rule
    : '';
}

function addDays(base, amount) {
  const date = new Date(`${base}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return date.toISOString().slice(0, 10);
}

function addMonths(base, amount) {
  const date = new Date(`${base}T12:00:00`);
  date.setMonth(date.getMonth() + amount);
  return date.toISOString().slice(0, 10);
}

function nextRecurrenceDate(base, rule) {
  if (!base || !rule) return null;
  switch (rule) {
    case 'Semanal':
      return addDays(base, 7);
    case 'Quinzenal':
      return addDays(base, 15);
    case 'Mensal':
      return addMonths(base, 1);
    case 'Trimestral':
      return addMonths(base, 3);
    case 'Semestral':
      return addMonths(base, 6);
    case 'Anual':
      return addMonths(base, 12);
    default:
      return null;
  }
}

function buildPublicLinks(req, token) {
  const origin = getAppOrigin(req);
  return {
    approval_url: `${origin}/aprovacao.html?token=${token}`,
    pdf_url: `${origin}/api/public/orcamentos/${token}/pdf`,
  };
}

function newToken() {
  return crypto.randomBytes(16).toString('hex');
}

// ----------------------------------------------------------------------------
// 3. Helpers de empresa, token publico e dados relacionados
// ----------------------------------------------------------------------------
async function getCompanyByUser(userId) {
  return (
    (await dbGet('SELECT * FROM company_profile WHERE user_id IS ? LIMIT 1', [userId])) || {
      company_name: 'Central Simples',
      logo_path: null,
      logo_data_url: '',
    }
  );
}

async function ensureApprovalTokenById(id, userId) {
  const current = await dbGet('SELECT approval_token FROM orcamentos WHERE id = ? AND user_id IS ?', [id, userId]);
  if (!current) return null;
  if (current.approval_token) return current.approval_token;

  const token = newToken();
  await dbRun(
    `UPDATE orcamentos
     SET approval_token = ?, updated_at = datetime('now')
     WHERE id = ? AND user_id IS ?`,
    [token, id, userId]
  );
  return token;
}

// ----------------------------------------------------------------------------
// 4. Clientes, modelos, notas e itens do orcamento
// ----------------------------------------------------------------------------
async function upsertClient(payload, userId, existingClientId = null) {
  const name = String(payload.client_name || '').trim();
  if (!name) throw new Error('client_name e obrigatorio.');

  const whatsapp = String(payload.client_whatsapp || '').trim();
  const email = String(payload.client_email || '').trim();
  const address = String(payload.client_address || '').trim();
  const cpf = String(payload.client_cpf || '').trim();
  const priority = String(payload.client_priority || 'Normal').trim() || 'Normal';
  const notes = String(payload.client_profile_notes || '').trim();

  if (existingClientId) {
    await dbRun(
      `UPDATE clients
       SET name = ?, email = ?, phone = ?, whatsapp = ?, address = ?, cpf = ?, priority_tag = ?, notes = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [name, email, whatsapp, whatsapp, address, cpf, priority, notes, existingClientId]
    );
    return existingClientId;
  }

  let client = null;
  if (whatsapp) {
    client = await dbGet(
      'SELECT id FROM clients WHERE whatsapp = ? AND user_id IS ? LIMIT 1',
      [whatsapp, userId]
    );
  }
  if (!client) {
    client = await dbGet(
      'SELECT id FROM clients WHERE name = ? AND user_id IS ? LIMIT 1',
      [name, userId]
    );
  }

  if (client) {
    await dbRun(
      `UPDATE clients
       SET name = ?, email = ?, phone = ?, whatsapp = ?, address = ?, cpf = ?, priority_tag = ?, notes = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [name, email, whatsapp, whatsapp, address, cpf, priority, notes, client.id]
    );
    return client.id;
  }

  const created = await dbRun(
    `INSERT INTO clients (user_id, name, email, phone, whatsapp, address, cpf, priority_tag, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, name, email, whatsapp, whatsapp, address, cpf, priority, notes]
  );
  return created.lastID;
}

async function saveTemplateIfNeeded(payload, userId) {
  if (!payload.save_template) return;

  const name = String(payload.template_name || '').trim();
  if (!name) return;

  const itemsJson = JSON.stringify(normalizeItems(payload.items));
  const checklistJson = normalizeChecklist(payload.checklist);
  const title = String(payload.title || '').trim();
  const description = String(payload.description || '').trim();
  const defaultValidityDays = Number(payload.template_validity_days) || 7;

  const existing = await dbGet(
    'SELECT id FROM orcamento_templates WHERE name = ? AND user_id IS ? LIMIT 1',
    [name, userId]
  );

  if (existing) {
    await dbRun(
      `UPDATE orcamento_templates
       SET title = ?, description = ?, items_json = ?, checklist_json = ?, default_validity_days = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [title, description, itemsJson, checklistJson, defaultValidityDays, existing.id]
    );
    return existing.id;
  }

  const inserted = await dbRun(
    `INSERT INTO orcamento_templates (user_id, name, title, description, items_json, checklist_json, default_validity_days)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, name, title, description, itemsJson, checklistJson, defaultValidityDays]
  );
  return inserted.lastID;
}

async function saveClientNoteIfNeeded(clientId, note, userId) {
  const text = String(note || '').trim();
  if (!text) return;
  await dbRun(
    'INSERT INTO client_notes (user_id, client_id, note) VALUES (?, ?, ?)',
    [userId, clientId, text]
  );
}

async function replaceItems(orcamentoId, items) {
  await dbRun('DELETE FROM orcamento_items WHERE orcamento_id = ?', [orcamentoId]);
  for (const item of normalizeItems(items)) {
    await dbRun(
      'INSERT INTO orcamento_items (orcamento_id, description, quantity, unit_price) VALUES (?, ?, ?, ?)',
      [orcamentoId, item.description, item.quantity || 1, item.unit_price || 0]
    );
  }
}

async function fetchOrcamentoRow(id, userId) {
  return dbGet(
    `SELECT
       o.*,
       c.name AS client_name,
       c.whatsapp AS client_whatsapp,
       c.email AS client_email,
       c.phone AS client_phone,
       c.address AS client_address,
       c.cpf AS client_cpf,
       c.priority_tag AS client_priority,
       c.notes AS client_profile_notes
     FROM orcamentos o
     JOIN clients c ON c.id = o.client_id
     WHERE o.id = ? AND o.user_id IS ?`,
    [id, userId]
  );
}

async function fetchOrcamentoBundle(id, userId) {
  const orc = await fetchOrcamentoRow(id, userId);
  if (!orc) return null;

  const [items, clientHistory, clientNotes, company] = await Promise.all([
    dbAll('SELECT * FROM orcamento_items WHERE orcamento_id = ? ORDER BY id ASC', [id]),
    dbAll(
      `SELECT id, title, status, total_value, created_at, due_date, service_date
       FROM orcamentos
       WHERE client_id = ? AND user_id IS ? AND id <> ?
       ORDER BY created_at DESC
       LIMIT 6`,
      [orc.client_id, userId, id]
    ),
    dbAll(
      `SELECT id, note, created_at
       FROM client_notes
       WHERE client_id = ? AND user_id IS ?
       ORDER BY created_at DESC
       LIMIT 8`,
      [orc.client_id, userId]
    ),
    getCompanyByUser(userId),
  ]);

  const token = orc.approval_token || null;
  return {
    ...orc,
    checklist: parseJsonArray(orc.checklist_json || '[]'),
    items,
    client_history: clientHistory,
    client_notes_history: clientNotes,
    company,
    share_urls: null,
  };
}

// ----------------------------------------------------------------------------
// 5. Criacao e edicao principal do orcamento
// ----------------------------------------------------------------------------
async function createOrcamento(payload, userId) {
  const clientId = await upsertClient(payload, userId);
  await saveClientNoteIfNeeded(clientId, payload.client_note, userId);

  const status = validStatus(payload.status);
  const recurrenceRule = validRecurrence(payload.recurrence_rule);
  const serviceDate = payload.service_date || null;
  const dueDate = payload.due_date || null;
  const recurrenceBase = serviceDate || dueDate || todayIso();
  const checklistJson = normalizeChecklist(payload.checklist);
  const approvalToken = newToken();

  const inserted = await dbRun(
    `INSERT INTO orcamentos (
       user_id, client_id, title, description, total_value, status, due_date,
       approval_token, recurrence_rule, recurrence_next_date, template_name, checklist_json,
       internal_notes, service_date, price_cost, price_hours, price_hour_rate,
       price_displacement, auto_followup_enabled, auto_charge_enabled, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [
      userId,
      clientId,
      String(payload.title || '').trim(),
      String(payload.description || '').trim(),
      Number(payload.total_value) || 0,
      status,
      dueDate,
      approvalToken,
      recurrenceRule,
      nextRecurrenceDate(recurrenceBase, recurrenceRule),
      String(payload.template_name || '').trim(),
      checklistJson,
      String(payload.internal_notes || '').trim(),
      serviceDate,
      Number(payload.price_cost) || 0,
      Number(payload.price_hours) || 0,
      Number(payload.price_hour_rate) || 0,
      Number(payload.price_displacement) || 0,
      payload.auto_followup_enabled === false ? 0 : 1,
      payload.auto_charge_enabled ? 1 : 0,
    ]
  );

  await replaceItems(inserted.lastID, payload.items);
  await saveTemplateIfNeeded(payload, userId);

  return { id: inserted.lastID, clientId, approvalToken };
}

async function updateOrcamento(id, payload, userId) {
  const current = await dbGet('SELECT * FROM orcamentos WHERE id = ? AND user_id IS ?', [id, userId]);
  if (!current) return null;

  const clientId = await upsertClient(payload, userId, current.client_id);
  await saveClientNoteIfNeeded(clientId, payload.client_note, userId);

  const title = String(payload.title || current.title || '').trim();
  const description = String(payload.description || '').trim();
  const status = validStatus(payload.status || current.status);
  const dueDate = payload.due_date || null;
  const serviceDate = payload.service_date || null;
  const recurrenceRule = validRecurrence(payload.recurrence_rule);
  const recurrenceBase = serviceDate || dueDate || todayIso();

  await dbRun(
    `UPDATE orcamentos
     SET title = ?, description = ?, total_value = ?, status = ?, due_date = ?,
         recurrence_rule = ?, recurrence_next_date = ?, template_name = ?,
         checklist_json = ?, internal_notes = ?, service_date = ?, price_cost = ?,
         price_hours = ?, price_hour_rate = ?, price_displacement = ?, auto_followup_enabled = ?,
         auto_charge_enabled = ?, updated_at = datetime('now')
     WHERE id = ? AND user_id IS ?`,
    [
      title,
      description,
      Number(payload.total_value) || 0,
      status,
      dueDate,
      recurrenceRule,
      nextRecurrenceDate(recurrenceBase, recurrenceRule),
      String(payload.template_name || '').trim(),
      normalizeChecklist(payload.checklist),
      String(payload.internal_notes || '').trim(),
      serviceDate,
      Number(payload.price_cost) || 0,
      Number(payload.price_hours) || 0,
      Number(payload.price_hour_rate) || 0,
      Number(payload.price_displacement) || 0,
      payload.auto_followup_enabled === false ? 0 : 1,
      payload.auto_charge_enabled ? 1 : 0,
      id,
      userId,
    ]
  );

  if (Array.isArray(payload.items)) {
    await replaceItems(id, payload.items);
  }
  await saveTemplateIfNeeded(payload, userId);
  return { id, clientId };
}

// ----------------------------------------------------------------------------
// 6. Rotas de modelos salvos
// ----------------------------------------------------------------------------
router.get('/templates', requireFeature('templates', 'modelos de orçamento'), async (req, res) => {
  try {
    const rows = await dbAll(
      `SELECT * FROM orcamento_templates
       WHERE user_id IS ?
       ORDER BY updated_at DESC, created_at DESC`,
      [uid(req)]
    );

    res.json({
      success: true,
      data: rows.map((row) => ({
        ...row,
        items: parseJsonArray(row.items_json),
        checklist: parseJsonArray(row.checklist_json),
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: publicError(err) });
  }
});

router.post('/templates', requireFeature('templates', 'modelos de orçamento'), async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) {
      return res.status(400).json({ success: false, message: 'Nome do modelo obrigatorio.' });
    }

    const payload = {
      ...req.body,
      template_name: name,
      save_template: true,
    };
    const id = await saveTemplateIfNeeded(payload, uid(req));
    res.status(201).json({ success: true, id });
  } catch (err) {
    res.status(500).json({ success: false, message: publicError(err) });
  }
});

router.delete('/templates/:templateId', requireFeature('templates', 'modelos de orçamento'), async (req, res) => {
  try {
    const result = await dbRun(
      'DELETE FROM orcamento_templates WHERE id = ? AND user_id IS ?',
      [req.params.templateId, uid(req)]
    );
    if (!result.changes) {
      return res.status(404).json({ success: false, message: 'Modelo nao encontrado.' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: publicError(err) });
  }
});

// ----------------------------------------------------------------------------
// 7. Compartilhamento, duplicacao, recorrencia e eventos automaticos
// ----------------------------------------------------------------------------
router.post('/:id/share-links', requireActiveSubscription('envio de orçamentos pelo WhatsApp'), async (req, res) => {
  try {
    const token = await ensureApprovalTokenById(req.params.id, uid(req));
    if (!token) {
      return res.status(404).json({ success: false, message: 'Orcamento nao encontrado.' });
    }

    const markSent = Boolean(req.body.markSent);
    if (markSent) {
      await dbRun(
        `UPDATE orcamentos
         SET approval_sent_at = COALESCE(approval_sent_at, datetime('now')),
             last_whatsapp_sent_at = datetime('now'),
             updated_at = datetime('now')
         WHERE id = ? AND user_id IS ?`,
        [req.params.id, uid(req)]
      );
      await dbRun(
        `UPDATE clients
         SET last_contact_at = datetime('now'), updated_at = datetime('now')
         WHERE id = (SELECT client_id FROM orcamentos WHERE id = ? AND user_id IS ?)`,
        [req.params.id, uid(req)]
      );
    }

    res.json({
      success: true,
      data: {
        token,
        ...buildPublicLinks(req, token),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: publicError(err) });
  }
});

router.post('/:id/duplicate', requireActiveSubscription('duplicar orçamentos'), async (req, res) => {
  try {
    const current = await fetchOrcamentoBundle(req.params.id, uid(req));
    if (!current) {
      return res.status(404).json({ success: false, message: 'Orcamento nao encontrado.' });
    }

    const payload = {
      client_name: current.client_name,
      client_whatsapp: current.client_whatsapp,
      client_email: current.client_email,
      client_address: current.client_address,
      client_cpf: current.client_cpf,
      client_priority: current.client_priority,
      client_profile_notes: current.client_profile_notes,
      title: current.title,
      description: current.description,
      total_value: current.total_value,
      status: 'Rascunho',
      due_date: null,
      service_date: null,
      recurrence_rule: '',
      template_name: current.template_name,
      checklist: parseJsonArray(current.checklist_json),
      internal_notes: current.internal_notes,
      price_cost: current.price_cost,
      price_hours: current.price_hours,
      price_hour_rate: current.price_hour_rate,
      price_displacement: current.price_displacement,
      auto_followup_enabled: Boolean(current.auto_followup_enabled),
      auto_charge_enabled: Boolean(current.auto_charge_enabled),
      items: current.items,
    };

    const created = await createOrcamento(payload, uid(req));
    res.status(201).json({ success: true, id: created.id });
  } catch (err) {
    res.status(500).json({ success: false, message: publicError(err) });
  }
});

router.post('/:id/generate-recurrence', requireFeature('automations', 'recorrência automática'), async (req, res) => {
  try {
    const current = await fetchOrcamentoBundle(req.params.id, uid(req));
    if (!current) {
      return res.status(404).json({ success: false, message: 'Orcamento nao encontrado.' });
    }
    if (!current.recurrence_rule) {
      return res.status(400).json({ success: false, message: 'Este orcamento nao tem recorrencia.' });
    }

    const baseDate =
      current.recurrence_next_date ||
      nextRecurrenceDate(current.service_date || current.due_date || todayIso(), current.recurrence_rule);

    if (!baseDate) {
      return res.status(400).json({ success: false, message: 'Nao foi possivel calcular a proxima data.' });
    }

    const payload = {
      client_name: current.client_name,
      client_whatsapp: current.client_whatsapp,
      client_email: current.client_email,
      client_address: current.client_address,
      client_cpf: current.client_cpf,
      client_priority: current.client_priority,
      client_profile_notes: current.client_profile_notes,
      title: current.title,
      description: current.description,
      total_value: current.total_value,
      status: 'Pendente',
      due_date: current.due_date ? baseDate : null,
      service_date: current.service_date ? baseDate : null,
      recurrence_rule: '',
      template_name: current.template_name,
      checklist: parseJsonArray(current.checklist_json),
      internal_notes: current.internal_notes,
      price_cost: current.price_cost,
      price_hours: current.price_hours,
      price_hour_rate: current.price_hour_rate,
      price_displacement: current.price_displacement,
      auto_followup_enabled: Boolean(current.auto_followup_enabled),
      auto_charge_enabled: Boolean(current.auto_charge_enabled),
      items: current.items,
    };

    const created = await createOrcamento(payload, uid(req));
    await dbRun(
      `UPDATE orcamentos
       SET recurrence_next_date = ?, updated_at = datetime('now')
       WHERE id = ? AND user_id IS ?`,
      [nextRecurrenceDate(baseDate, current.recurrence_rule), req.params.id, uid(req)]
    );

    res.status(201).json({ success: true, id: created.id, generated_for: baseDate });
  } catch (err) {
    res.status(500).json({ success: false, message: publicError(err) });
  }
});

router.post('/:id/automation-event', requireFeature('automations', 'automações de orçamento'), async (req, res) => {
  try {
    const current = await dbGet(
      'SELECT id, client_id, return_reminder_date FROM orcamentos WHERE id = ? AND user_id IS ?',
      [req.params.id, uid(req)]
    );
    if (!current) {
      return res.status(404).json({ success: false, message: 'Orcamento nao encontrado.' });
    }

    const kind = String(req.body.kind || '').trim();
    const customDate = req.body.date ? String(req.body.date) : null;

    if (kind === 'budget_sent') {
      const token = await ensureApprovalTokenById(req.params.id, uid(req));
      await dbRun(
        `UPDATE orcamentos
         SET approval_sent_at = COALESCE(approval_sent_at, datetime('now')),
             last_whatsapp_sent_at = datetime('now'),
             updated_at = datetime('now')
         WHERE id = ? AND user_id IS ?`,
        [req.params.id, uid(req)]
      );
      await dbRun('UPDATE clients SET last_contact_at = datetime(\'now\'), updated_at = datetime(\'now\') WHERE id = ?', [current.client_id]);
      return res.json({ success: true, data: buildPublicLinks(req, token) });
    }

    if (kind === 'followup') {
      await dbRun(
        `UPDATE orcamentos
         SET last_follow_up_at = datetime('now'),
             follow_up_stage = COALESCE(follow_up_stage, 0) + 1,
             updated_at = datetime('now')
         WHERE id = ? AND user_id IS ?`,
        [req.params.id, uid(req)]
      );
      await dbRun('UPDATE clients SET last_contact_at = datetime(\'now\'), updated_at = datetime(\'now\') WHERE id = ?', [current.client_id]);
      return res.json({ success: true });
    }

    if (kind === 'charge_sent') {
      await dbRun(
        `UPDATE orcamentos
         SET reminder_sent_at = datetime('now'),
             updated_at = datetime('now')
         WHERE id = ? AND user_id IS ?`,
        [req.params.id, uid(req)]
      );
      await dbRun('UPDATE clients SET last_contact_at = datetime(\'now\'), updated_at = datetime(\'now\') WHERE id = ?', [current.client_id]);
      return res.json({ success: true });
    }

    if (kind === 'closing_sent') {
      await dbRun(
        `UPDATE orcamentos
         SET closing_message_sent_at = datetime('now'),
             updated_at = datetime('now')
         WHERE id = ? AND user_id IS ?`,
        [req.params.id, uid(req)]
      );
      return res.json({ success: true });
    }

    if (kind === 'return_scheduled') {
      const targetDate = customDate || current.return_reminder_date || addDays(todayIso(), 30);
      await dbRun(
        `UPDATE orcamentos
         SET return_reminder_date = ?,
             updated_at = datetime('now')
         WHERE id = ? AND user_id IS ?`,
        [targetDate, req.params.id, uid(req)]
      );
      return res.json({ success: true, date: targetDate });
    }

    res.status(400).json({ success: false, message: 'Evento invalido.' });
  } catch (err) {
    res.status(500).json({ success: false, message: publicError(err) });
  }
});

// ----------------------------------------------------------------------------
// 8. PDFs, recibos e mudanca de status
// ----------------------------------------------------------------------------
router.get('/:id/pdf', requireActiveSubscription('PDF de orçamento'), async (req, res) => {
  try {
    const bundle = await fetchOrcamentoBundle(req.params.id, uid(req));
    if (!bundle) {
      return res.status(404).send('Orcamento nao encontrado.');
    }

    const token = bundle.approval_token || (await ensureApprovalTokenById(req.params.id, uid(req)));
    renderOrcamentoPdf(
      res,
      {
        orc: bundle,
        items: bundle.items,
        company: bundle.company,
      },
      {
        kind: 'budget',
        approvalUrl: token ? buildPublicLinks(req, token).approval_url : null,
      }
    );
  } catch (err) {
    console.error('[PDF]', err.message);
    if (!res.headersSent) {
      res.status(500).send(publicError(err, 'Erro ao gerar PDF.'));
    }
  }
});

router.get('/:id/receipt', requireActiveSubscription('recibos em PDF'), async (req, res) => {
  try {
    const bundle = await fetchOrcamentoBundle(req.params.id, uid(req));
    if (!bundle) {
      return res.status(404).send('Orcamento nao encontrado.');
    }

    renderOrcamentoPdf(
      res,
      {
        orc: bundle,
        items: bundle.items,
        company: bundle.company,
      },
      { kind: 'receipt' }
    );
  } catch (err) {
    console.error('[RECIBO]', err.message);
    if (!res.headersSent) {
      res.status(500).send(publicError(err, 'Erro ao gerar recibo.'));
    }
  }
});

router.put('/:id/status', requireActiveSubscription('atualização de status'), async (req, res) => {
  const status = String(req.body.status || '');
  if (!isValidStatus(status)) {
    return res.status(400).json({ success: false, message: 'Status invalido.' });
  }

  try {
    const updates = ['status = ?', 'updated_at = datetime(\'now\')'];
    const params = [status];

    if (status === 'Aprovado') updates.push('approved_at = datetime(\'now\')');
    if (status === 'Recusado') updates.push('rejected_at = datetime(\'now\')');

    params.push(req.params.id, uid(req));
    await dbRun(
      `UPDATE orcamentos SET ${updates.join(', ')} WHERE id = ? AND user_id IS ?`,
      params
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: publicError(err) });
  }
});

// ----------------------------------------------------------------------------
// 9. CRUD principal usado pela tela de orcamentos
// ----------------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const rows = await dbAll(
      `SELECT
         o.*,
         c.name AS client_name,
         c.whatsapp AS client_whatsapp,
         c.email AS client_email,
         c.phone AS client_phone,
         c.address AS client_address,
         c.cpf AS client_cpf,
         c.priority_tag AS client_priority,
         c.notes AS client_profile_notes
       FROM orcamentos o
       JOIN clients c ON c.id = o.client_id
       WHERE o.user_id IS ?
       ORDER BY datetime(o.created_at) DESC`,
      [uid(req)]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: publicError(err) });
  }
});

router.post('/', requireActiveSubscription('criação de orçamentos'), async (req, res) => {
  try {
    if (!String(req.body.client_name || '').trim() || !String(req.body.title || '').trim()) {
      return res.status(400).json({ success: false, message: 'client_name e title sao obrigatorios.' });
    }
    const created = await createOrcamento(req.body, uid(req));
    res.status(201).json({ success: true, id: created.id, token: created.approvalToken });
  } catch (err) {
    res.status(500).json({ success: false, message: publicError(err) });
  }
});

router.put('/:id', requireActiveSubscription('edição de orçamentos'), async (req, res) => {
  try {
    const updated = await updateOrcamento(req.params.id, req.body, uid(req));
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Orcamento nao encontrado.' });
    }
    res.json({ success: true, id: updated.id });
  } catch (err) {
    res.status(500).json({ success: false, message: publicError(err) });
  }
});

router.delete('/:id', requireActiveSubscription('exclusão de orçamentos'), async (req, res) => {
  try {
    const result = await dbRun('DELETE FROM orcamentos WHERE id = ? AND user_id IS ?', [req.params.id, uid(req)]);
    if (!result.changes) {
      return res.status(404).json({ success: false, message: 'Orcamento nao encontrado.' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: publicError(err) });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const bundle = await fetchOrcamentoBundle(req.params.id, uid(req));
    if (!bundle) {
      return res.status(404).json({ success: false, message: 'Orcamento nao encontrado.' });
    }

    if (bundle.approval_token) {
      bundle.share_urls = buildPublicLinks(req, bundle.approval_token);
    }

    res.json({ success: true, data: bundle });
  } catch (err) {
    res.status(500).json({ success: false, message: publicError(err) });
  }
});

module.exports = router;

