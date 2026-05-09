const express = require('express');
const fs = require('fs');
const path = require('path');
// ============================================================================
// ROTAS PÚBLICAS DE ORÇAMENTO
// Permite cliente abrir PDF e aprovar/recusar pelo link sem login.
// ============================================================================

const db = require('../db/database');
const { renderOrcamentoPdf } = require('../lib/orcamentoPdf');
const { getAppOrigin, publicError } = require('../lib/security');
const { createNotification } = require('../lib/notifications');
const { sendPushToUser } = require('../lib/pushNotifications');

const router = express.Router();

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

function cleanToken(value) {
  const token = String(value || '').trim();
  return /^[a-f0-9]{32}$/i.test(token) ? token : null;
}

function buildPublicLinks(req, token, company = null) {
  const origin = getAppOrigin(req);
  const links = {
    approval_url: `${origin}/aprovacao.html?token=${token}`,
    pdf_url: `${origin}/api/public/orcamentos/${token}/pdf`,
  };

  if (company?.logo_path) {
    links.logo_url = `${origin}/api/public/orcamentos/${token}/logo`;
  }

  return links;
}

function publicCompany(company, links = {}) {
  return {
    company_name: company?.company_name || 'Central Simples',
    logo_path: company?.logo_path || null,
    logo_url: links.logo_url || null,
  };
}

function publicOrcamentoData(orc, items, company, links) {
  return {
    id: orc.id,
    title: orc.title,
    description: orc.description,
    total_value: orc.total_value,
    status: orc.status,
    due_date: orc.due_date,
    service_date: orc.service_date,
    created_at: orc.created_at,
    updated_at: orc.updated_at,
    client_decision_note: orc.client_decision_note,
    checklist_json: orc.checklist_json,
    client_name: orc.client_name,
    client_whatsapp: orc.client_whatsapp,
    client_address: orc.client_address,
    items,
    company: publicCompany(company, links),
    links,
  };
}

function cleanText(value, max = 500) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, max);
}

function resolveLogoPath(logoPath) {
  if (!logoPath) return null;

  const uploadsRoot = path.resolve(__dirname, '..', 'uploads');
  const fullPath = path.resolve(__dirname, '..', logoPath);

  if (!fullPath.startsWith(`${uploadsRoot}${path.sep}`)) {
    return null;
  }

  return fullPath;
}

async function getCompanyByUser(userId) {
  return (
    (await dbGet(
      'SELECT company_name, logo_path FROM company_profile WHERE user_id IS ? LIMIT 1',
      [userId]
    )) || {
      company_name: 'Central Simples',
      logo_path: null,
    }
  );
}

async function fetchByToken(token) {
  const orc = await dbGet(
    `SELECT
       o.id,
       o.user_id,
       o.title,
       o.description,
       o.total_value,
       o.status,
       o.due_date,
       o.created_at,
       o.updated_at,
       o.approval_token,
       o.client_decision_note,
       o.checklist_json,
       o.service_date,
       c.id AS client_id,
       c.name AS client_name,
       c.whatsapp AS client_whatsapp,
       c.email AS client_email,
       c.phone AS client_phone,
       c.address AS client_address,
       c.cpf AS client_cpf
     FROM orcamentos o
     JOIN clients c ON c.id = o.client_id
     WHERE o.approval_token = ?`,
    [token]
  );

  if (!orc) return null;

  const [items, company] = await Promise.all([
    dbAll(
      'SELECT id, description, quantity, unit_price, total FROM orcamento_items WHERE orcamento_id = ? ORDER BY id ASC',
      [orc.id]
    ),
    getCompanyByUser(orc.user_id ?? null),
  ]);

  return { orc, items, company };
}

router.get('/:token', async (req, res) => {
  try {
    const token = cleanToken(req.params.token);
    if (!token) {
      return res.status(404).json({ success: false, message: 'Orçamento não encontrado.' });
    }

    const bundle = await fetchByToken(token);
    if (!bundle) {
      return res.status(404).json({ success: false, message: 'Orçamento não encontrado.' });
    }

    res.setHeader('Cache-Control', 'no-store');
    res.json({
      success: true,
      data: publicOrcamentoData(
        bundle.orc,
        bundle.items,
        bundle.company,
        buildPublicLinks(req, token, bundle.company)
      ),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: publicError(err) });
  }
});

router.get('/:token/logo', async (req, res) => {
  try {
    const token = cleanToken(req.params.token);
    if (!token) {
      return res.status(404).send('Logo não encontrada.');
    }

    const bundle = await fetchByToken(token);
    const logoPath = resolveLogoPath(bundle?.company?.logo_path);

    if (!logoPath || !fs.existsSync(logoPath)) {
      return res.status(404).send('Logo não encontrada.');
    }

    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.sendFile(logoPath);
  } catch (err) {
    res.status(500).send(publicError(err, 'Erro ao carregar logo.'));
  }
});

router.get('/:token/pdf', async (req, res) => {
  try {
    const token = cleanToken(req.params.token);
    if (!token) {
      return res.status(404).send('Orçamento não encontrado.');
    }

    const bundle = await fetchByToken(token);
    if (!bundle) {
      return res.status(404).send('Orçamento não encontrado.');
    }

    renderOrcamentoPdf(
      res,
      {
        orc: bundle.orc,
        items: bundle.items,
        company: publicCompany(bundle.company),
      },
      {
        kind: 'budget',
        approvalUrl: buildPublicLinks(req, token).approval_url,
      }
    );
  } catch (err) {
    console.error('[PUBLIC PDF]', err.message);
    if (!res.headersSent) {
      res.status(500).send(publicError(err, 'Erro ao gerar PDF.'));
    }
  }
});

router.post('/:token/decision', async (req, res) => {
  try {
    const token = cleanToken(req.params.token);
    if (!token) {
      return res.status(404).json({ success: false, message: 'Orçamento não encontrado.' });
    }

    const bundle = await fetchByToken(token);
    if (!bundle) {
      return res.status(404).json({ success: false, message: 'Orçamento não encontrado.' });
    }

    const decision = String(req.body.decision || '').trim();
    if (!['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'Decisão inválida.' });
    }

    const clientNote = cleanText(req.body.note, 700);
    const visitAddress = cleanText(req.body.visit_address, 300);
    const preferredVisitTime = cleanText(req.body.preferred_visit_time, 180);
    const noteParts = [];

    if (visitAddress) noteParts.push(`Endereço para visita: ${visitAddress}`);
    if (preferredVisitTime) noteParts.push(`Melhor dia e horário: ${preferredVisitTime}`);
    if (clientNote) noteParts.push(`Mensagem do cliente: ${clientNote}`);

    const note = noteParts.join('\n\n').slice(0, 1000);
    const status = decision === 'approve' ? 'Aprovado' : 'Recusado';
    const field = decision === 'approve' ? 'approved_at' : 'rejected_at';

    const result = await dbRun(
      `UPDATE orcamentos
       SET status = ?, ${field} = datetime('now'), client_decision_note = ?, updated_at = datetime('now')
       WHERE approval_token = ?`,
      [status, note, token]
    );

    if (!result.changes) {
      return res.status(404).json({ success: false, message: 'Orçamento não encontrado.' });
    }

    if (visitAddress && bundle.orc.client_id) {
      await dbRun(
        `UPDATE clients
         SET address = ?, updated_at = datetime('now')
         WHERE id = ?`,
        [visitAddress, bundle.orc.client_id]
      );
    }

    if (bundle.orc.status !== status) {
      const approved = decision === 'approve';
      const title = approved ? 'Orçamento aprovado pelo cliente' : 'Orçamento recusado pelo cliente';
      const body = `${bundle.orc.client_name || 'Cliente'} ${approved ? 'aprovou' : 'recusou'} "${bundle.orc.title || 'orçamento'}" no valor de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(bundle.orc.total_value) || 0)}.`;
      const actionUrl = `/orcamentos.html?orcamento=${bundle.orc.id}`;

      await createNotification({
        userId: bundle.orc.user_id ?? null,
        kind: approved ? 'budget_approved' : 'budget_rejected',
        title,
        body,
        entityType: 'orcamento',
        entityId: bundle.orc.id,
        actionUrl,
      });
      await sendPushToUser(bundle.orc.user_id ?? null, {
        title,
        body,
        url: actionUrl,
      });
    }

    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ success: false, message: publicError(err) });
  }
});

module.exports = router;

