// MOTOR DE AUTOMACOES
// Dispara follow-ups, cobrancas automaticas e notificacoes de tarefas agendadas.

const crypto = require('crypto');
const db = require('../db/database');
const { isConfigured, sendTextMessage, sendTemplateMessage } = require('./whatsappService');
const { getBillingStatusForUserId, hasFeature } = require('./billing');

let running = false;
let timer = null;

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

function diffDays(from, to = todayIso()) {
  const base = new Date(`${String(from).slice(0, 10)}T12:00:00`);
  const target = new Date(`${String(to).slice(0, 10)}T12:00:00`);
  return Math.round((target - base) / 86400000);
}

function brl(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
}

function fmtDate(value) {
  if (!value) return '--';
  const iso = String(value).slice(0, 10);
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function getBaseUrl() {
  return process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
}

async function userCanUseAutomation(userId, feature = 'automations') {
  if (userId === null || userId === undefined) return true;
  const billing = await getBillingStatusForUserId(userId);
  return hasFeature(billing, feature);
}

async function ensureApprovalToken(row) {
  if (row.approval_token) return row.approval_token;
  const token = crypto.randomBytes(16).toString('hex');
  await dbRun(
    'UPDATE orcamentos SET approval_token = ?, updated_at = datetime(\'now\') WHERE id = ?',
    [token, row.id]
  );
  return token;
}

async function sendWithBestChannel({ to, kind, body, parameters = [] }) {
  const templateName =
    kind === 'followup'
      ? process.env.WHATSAPP_TEMPLATE_FOLLOWUP
      : kind === 'charge'
        ? process.env.WHATSAPP_TEMPLATE_CHARGE
        : kind === 'scheduled_charge'
          ? process.env.WHATSAPP_TEMPLATE_RECURRING_CHARGE || process.env.WHATSAPP_TEMPLATE_CHARGE
          : '';

  if (templateName) {
    return sendTemplateMessage({
      to,
      templateName,
      parameters,
    });
  }

  return sendTextMessage({ to, body });
}

function buildChargeBody({ clientName, title, amount, dueDate, pixKey, receiverName, suffix, notes }) {
  const pieces = [
    `Ola ${clientName}!`,
    '',
    `Passando para lembrar a cobranca de *${brl(amount)}* referente a *${title}*.`,
  ];

  if (dueDate) {
    pieces.push(`Data combinada: ${fmtDate(dueDate)}`);
  }
  if (pixKey) {
    pieces.push('');
    pieces.push(`Pix: ${pixKey}`);
  }
  if (receiverName) {
    pieces.push(`Recebedor: ${receiverName}`);
  }
  if (notes) {
    pieces.push(`Referencia: ${notes}`);
  }
  if (suffix) {
    pieces.push('');
    pieces.push(suffix);
  }

  return pieces.join('\n');
}

async function processFollowups() {
  const rows = await dbAll(
    `SELECT
       o.id,
       o.title,
       o.total_value,
       o.user_id,
       o.approval_token,
       o.follow_up_stage,
       o.approval_sent_at,
       o.client_id,
       c.name AS client_name,
       c.whatsapp AS client_whatsapp,
       cp.company_name
     FROM orcamentos o
     JOIN clients c ON c.id = o.client_id
     LEFT JOIN company_profile cp ON cp.user_id IS o.user_id
     WHERE o.auto_followup_enabled = 1
       AND o.status = 'Pendente'
       AND o.approval_sent_at IS NOT NULL
       AND COALESCE(c.whatsapp, '') <> ''`
  );

  for (const row of rows) {
    if (!(await userCanUseAutomation(row.user_id, 'automations'))) continue;

    const stage = Number(row.follow_up_stage || 0);
    const milestones = [1, 3, 7];
    const sentDate = String(row.approval_sent_at).slice(0, 10);
    const elapsed = diffDays(sentDate);
    const targetStage = milestones.filter((mark) => elapsed >= mark).length;
    if (stage >= milestones.length || targetStage <= stage) continue;

    try {
      const token = await ensureApprovalToken(row);
      const approvalUrl = `${getBaseUrl()}/aprovacao.html?token=${token}`;
      const body = [
        `Ola ${row.client_name}!`,
        '',
        `Estou passando para acompanhar seu orcamento *${row.title}*.`,
        `Se estiver tudo certo, voce pode aprovar por aqui: ${approvalUrl}`,
        '',
        `- ${row.company_name || 'Central Simples'}`
      ].join('\n');

      await sendWithBestChannel({
        to: row.client_whatsapp,
        kind: 'followup',
        body,
        parameters: [row.client_name, row.title, brl(row.total_value), approvalUrl],
      });

      await dbRun(
        `UPDATE orcamentos
         SET last_follow_up_at = datetime('now'),
             follow_up_stage = ?,
             last_automation_error = '',
             updated_at = datetime('now')
         WHERE id = ?`,
        [targetStage, row.id]
      );
      await dbRun('UPDATE clients SET last_contact_at = datetime(\'now\'), updated_at = datetime(\'now\') WHERE id = ?', [row.client_id]);
    } catch (err) {
      await dbRun(
        'UPDATE orcamentos SET last_automation_error = ?, updated_at = datetime(\'now\') WHERE id = ?',
        [err.message, row.id]
      );
    }
  }
}

async function processBudgetCharges() {
  const today = todayIso();
  const rows = await dbAll(
    `SELECT
       o.id,
       o.title,
       o.total_value,
       o.user_id,
       o.due_date,
       o.client_id,
       c.name AS client_name,
       c.whatsapp AS client_whatsapp,
       cp.pix_key,
       cp.pix_receiver_name,
       cp.pix_message_suffix,
       cp.company_name
     FROM orcamentos o
     JOIN clients c ON c.id = o.client_id
     LEFT JOIN company_profile cp ON cp.user_id IS o.user_id
     WHERE o.auto_charge_enabled = 1
       AND o.status IN ('Pendente', 'Aprovado')
       AND o.due_date IS NOT NULL
       AND date(o.due_date) <= date(?)
       AND COALESCE(c.whatsapp, '') <> ''
       AND (o.reminder_sent_at IS NULL OR date(o.reminder_sent_at) < date(o.due_date))`
    ,
    [today]
  );

  for (const row of rows) {
    if (!(await userCanUseAutomation(row.user_id, 'automations'))) continue;

    try {
      const body = buildChargeBody({
        clientName: row.client_name,
        title: row.title,
        amount: row.total_value,
        dueDate: row.due_date,
        pixKey: row.pix_key,
        receiverName: row.pix_receiver_name || row.company_name,
        suffix: row.pix_message_suffix,
      });

      await sendWithBestChannel({
        to: row.client_whatsapp,
        kind: 'charge',
        body,
        parameters: [
          row.client_name,
          row.title,
          brl(row.total_value),
          fmtDate(row.due_date),
          row.pix_key || '',
          row.pix_receiver_name || row.company_name || '',
        ],
      });

      await dbRun(
        `UPDATE orcamentos
         SET reminder_sent_at = datetime('now'),
             last_automation_error = '',
             updated_at = datetime('now')
         WHERE id = ?`,
        [row.id]
      );
      await dbRun('UPDATE clients SET last_contact_at = datetime(\'now\'), updated_at = datetime(\'now\') WHERE id = ?', [row.client_id]);
    } catch (err) {
      await dbRun(
        'UPDATE orcamentos SET last_automation_error = ?, updated_at = datetime(\'now\') WHERE id = ?',
        [err.message, row.id]
      );
    }
  }
}

function advanceScheduledCharge(row) {
  const today = todayIso();
  let nextDate = row.next_run_at || today;

  if (row.schedule_type === 'interval') {
    const interval = Math.max(1, Number(row.interval_days || 7));
    do {
      nextDate = addDays(nextDate, interval);
    } while (nextDate <= today);
    return nextDate;
  }

  do {
    nextDate = addDays(nextDate, 7);
  } while (nextDate <= today);
  return nextDate;
}

async function processScheduledCharges() {
  const today = todayIso();
  const rows = await dbAll(
    `SELECT
       s.*,
       c.name AS client_name,
       c.whatsapp AS client_whatsapp,
       cp.pix_key AS company_pix_key,
       cp.pix_receiver_name AS company_receiver_name,
       cp.pix_message_suffix,
       cp.company_name
     FROM scheduled_charges s
     JOIN clients c ON c.id = s.client_id
     LEFT JOIN company_profile cp ON cp.user_id IS s.user_id
     WHERE s.active = 1
       AND s.next_run_at IS NOT NULL
       AND date(s.next_run_at) <= date(?)
       AND COALESCE(c.whatsapp, '') <> ''`,
    [today]
  );

  for (const row of rows) {
    if (!(await userCanUseAutomation(row.user_id, 'scheduled_charges'))) continue;

    try {
      const body = buildChargeBody({
        clientName: row.client_name,
        title: row.title,
        amount: row.amount,
        dueDate: row.next_run_at,
        pixKey: row.pix_key || row.company_pix_key,
        receiverName: row.receiver_name || row.company_receiver_name || row.company_name,
        suffix: row.pix_message_suffix,
        notes: row.notes,
      });

      await sendWithBestChannel({
        to: row.client_whatsapp,
        kind: 'scheduled_charge',
        body,
        parameters: [
          row.client_name,
          row.title,
          brl(row.amount),
          row.pix_key || row.company_pix_key || '',
          row.receiver_name || row.company_receiver_name || row.company_name || '',
          row.notes || '',
        ],
      });

      await dbRun(
        `UPDATE scheduled_charges
         SET last_sent_at = datetime('now'),
             next_run_at = ?,
             last_error = '',
             updated_at = datetime('now')
         WHERE id = ?`,
        [advanceScheduledCharge(row), row.id]
      );
      await dbRun('UPDATE clients SET last_contact_at = datetime(\'now\'), updated_at = datetime(\'now\') WHERE id = ?', [row.client_id]);
    } catch (err) {
      await dbRun(
        'UPDATE scheduled_charges SET last_error = ?, updated_at = datetime(\'now\') WHERE id = ?',
        [err.message, row.id]
      );
    }
  }
}

async function runCycle() {
  if (running) return;
  running = true;
  try {
    if (isConfigured()) {
      await processFollowups();
      await processBudgetCharges();
      await processScheduledCharges();
    }
  } catch (err) {
    console.error('[AUTOMATION]', err.message);
  } finally {
    running = false;
  }
}

function startAutomationEngine() {
  if (timer) return;
  setTimeout(runCycle, 4000);
  timer = setInterval(runCycle, 60 * 1000);
}

module.exports = {
  startAutomationEngine,
};
