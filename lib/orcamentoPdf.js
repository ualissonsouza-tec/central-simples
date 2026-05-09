const fs = require('fs');
const path = require('path');
// ============================================================================
// GERADOR DE PDF DO ORCAMENTO
// Monta o documento enviado ao cliente com logo, itens, total e assinatura.
// ============================================================================

// ----------------------------------------------------------------------------
// 1. Dependencias e helpers de formatacao
// ----------------------------------------------------------------------------
const PDFDocument = require('pdfkit');

function brl(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value) || 0);
}

function fmtDate(value) {
  if (!value) return '--';
  try {
    const iso = String(value).slice(0, 10);
    return new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR');
  } catch {
    return String(value);
  }
}

function parseChecklist(raw) {
  try {
    const parsed = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (typeof item === 'string') {
          return { text: item.trim(), done: false };
        }
        return {
          text: String(item?.text || '').trim(),
          done: Boolean(item?.done),
        };
      })
      .filter((item) => item.text);
  } catch {
    return [];
  }
}

function statusPalette(status) {
  const map = {
    Aprovado: { bg: '#dcfce7', fg: '#166534' },
    Pendente: { bg: '#fef3c7', fg: '#92400e' },
    Rascunho: { bg: '#e2e8f0', fg: '#475569' },
    Recusado: { bg: '#fee2e2', fg: '#991b1b' },
    Pago: { bg: '#dbeafe', fg: '#1d4ed8' },
  };
  return map[status] || map.Rascunho;
}

// ----------------------------------------------------------------------------
// 2. Desenho de componentes reutilizaveis do PDF
// ----------------------------------------------------------------------------
function ensureSpace(doc, amount, state) {
  if (state.y + amount <= doc.page.height - 60) return;
  doc.addPage();
  state.y = 50;
}

function drawSectionTitle(doc, state, title) {
  ensureSpace(doc, 26, state);
  doc.roundedRect(60, state.y, doc.page.width - 120, 18, 6).fill('#0d1b2a');
  doc
    .fillColor('#ffffff')
    .font('Helvetica-Bold')
    .fontSize(8)
    .text(title.toUpperCase(), 68, state.y + 5);
  state.y += 28;
}

function drawLineField(doc, state, label, value) {
  ensureSpace(doc, 26, state);
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text(label, 60, state.y);
  doc.font('Helvetica').fontSize(9).fillColor('#0f172a').text(value || '--', 60, state.y + 10, {
    width: doc.page.width - 120,
  });
  state.y += 26;
}

function drawCompanyHeader(doc, company, options) {
  const width = doc.page.width;
  doc.rect(0, 0, width, 112).fill('#0d1b2a');

  const logoPath = company?.logo_path ? path.join(__dirname, '..', company.logo_path) : null;
  const hasLogo = logoPath && fs.existsSync(logoPath);
  const cx = 96;
  const cy = 56;
  const radius = 34;

  if (hasLogo) {
    doc.save();
    doc.circle(cx, cy, radius).clip();
    doc.image(logoPath, cx - radius, cy - radius, { width: radius * 2, height: radius * 2 });
    doc.restore();
    doc.circle(cx, cy, radius + 2).lineWidth(1.5).strokeColor('#7dd3fc').stroke();
  } else {
    doc.circle(cx, cy, radius).fill('#2563eb');
    const initials = (company?.company_name || 'CS')
      .split(' ')
      .slice(0, 2)
      .map((chunk) => chunk[0] || '')
      .join('')
      .toUpperCase();
    doc
      .font('Helvetica-Bold')
      .fontSize(22)
      .fillColor('#ffffff')
      .text(initials, cx - radius, cy - 10, { width: radius * 2, align: 'center' });
  }

  doc.font('Helvetica-Bold').fontSize(18).fillColor('#ffffff').text(
    company?.company_name || 'Central Simples',
    146,
    28,
    { width: width - 206 }
  );

  const subtitle = options.kind === 'receipt' ? 'Recibo de pagamento' : 'Orçamento oficial';
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#bfdbfe')
    .text(subtitle, 146, 54, { width: width - 206 });

  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor('#bfdbfe')
    .text(options.referenceLabel, 0, 40, { width: width - 60, align: 'right' });
}

function drawItemsTable(doc, state, items) {
  if (!items.length) return;
  drawSectionTitle(doc, state, 'Itens');

  const x = 60;
  const widths = [270, 60, 90, 90];
  const cols = [
    x,
    x + widths[0],
    x + widths[0] + widths[1],
    x + widths[0] + widths[1] + widths[2],
  ];

  ensureSpace(doc, 28, state);
  doc.rect(x, state.y, widths.reduce((sum, value) => sum + value, 0), 18).fill('#eff6ff');
  ['Descricao', 'Qtd', 'Unitario', 'Total'].forEach((label, index) => {
    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#1e3a8a')
      .text(label, cols[index] + 6, state.y + 5, { width: widths[index] - 12 });
  });
  state.y += 18;

  items.forEach((item, index) => {
    const total = Number(item.total) || (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
    const height = Math.max(
      22,
      doc.heightOfString(String(item.description || '--'), {
        width: widths[0] - 12,
      }) + 10
    );
    ensureSpace(doc, height + 2, state);
    doc
      .rect(x, state.y, widths.reduce((sum, value) => sum + value, 0), height)
      .fill(index % 2 === 0 ? '#ffffff' : '#f8fafc');
    doc.font('Helvetica').fontSize(8.5).fillColor('#0f172a').text(item.description || '--', cols[0] + 6, state.y + 6, {
      width: widths[0] - 12,
    });
    doc.text(String(item.quantity || 0), cols[1] + 6, state.y + 6, { width: widths[1] - 12 });
    doc.text(brl(item.unit_price || 0), cols[2] + 6, state.y + 6, { width: widths[2] - 12 });
    doc.text(brl(total), cols[3] + 6, state.y + 6, { width: widths[3] - 12 });
    state.y += height;
  });
}

// ----------------------------------------------------------------------------
// 3. Renderizacao completa do PDF
// ----------------------------------------------------------------------------
function renderOrcamentoPdf(res, payload, options = {}) {
  const company = payload.company || {};
  const orc = payload.orc || {};
  const items = payload.items || [];
  const checklist = parseChecklist(orc.checklist_json);
  const kind = options.kind || 'budget';

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 60, right: 60 },
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="${kind === 'receipt' ? 'recibo' : 'orcamento'}-${String(orc.id || 0).padStart(4, '0')}.pdf"`
  );
  res.setHeader('Cache-Control', 'no-store');

  doc.pipe(res);

  drawCompanyHeader(doc, company, {
    kind,
    referenceLabel: `${kind === 'receipt' ? 'RECIBO' : 'ORCAMENTO'} #${String(orc.id || 0).padStart(4, '0')}`,
  });

  const state = { y: 130 };
  const palette = statusPalette(orc.status);

  doc.font('Helvetica-Bold').fontSize(16).fillColor('#0f172a').text(orc.title || 'Orcamento', 60, state.y);
  state.y += 22;

  doc.roundedRect(60, state.y, 86, 18, 9).fill(palette.bg);
  doc
    .font('Helvetica-Bold')
    .fontSize(8)
    .fillColor(palette.fg)
    .text((orc.status || 'Rascunho').toUpperCase(), 60, state.y + 5, { width: 86, align: 'center' });
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor('#64748b')
    .text(
      `Emitido em ${fmtDate(orc.created_at)}   |   Valido ate ${fmtDate(orc.due_date)}   |   Atendimento ${fmtDate(orc.service_date)}`,
      0,
      state.y + 5,
      { width: doc.page.width - 60, align: 'right' }
    );
  state.y += 32;

  drawSectionTitle(doc, state, kind === 'receipt' ? 'Dados do pagamento' : 'Dados do cliente');
  drawLineField(doc, state, 'Cliente', orc.client_name);
  drawLineField(doc, state, 'WhatsApp', orc.client_whatsapp || orc.client_phone);
  drawLineField(doc, state, 'Email', orc.client_email);
  drawLineField(doc, state, 'Endereco', orc.client_address);
  if (orc.client_cpf) {
    drawLineField(doc, state, 'CPF', orc.client_cpf);
  }

  if (orc.description) {
    drawSectionTitle(doc, state, kind === 'receipt' ? 'Referencia' : 'Escopo');
    ensureSpace(doc, 60, state);
    const height = Math.max(42, doc.heightOfString(String(orc.description), { width: doc.page.width - 132 }) + 16);
    doc.roundedRect(60, state.y, doc.page.width - 120, height, 10).fill('#f8fafc');
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#0f172a')
      .text(String(orc.description), 68, state.y + 10, { width: doc.page.width - 136 });
    state.y += height + 10;
  }

  drawItemsTable(doc, state, items);

  if (checklist.length) {
    drawSectionTitle(doc, state, 'Checklist');
    checklist.forEach((item) => {
      ensureSpace(doc, 20, state);
      doc
        .roundedRect(60, state.y + 2, 10, 10, 2)
        .lineWidth(1)
        .strokeColor(item.done ? '#22c55e' : '#94a3b8')
        .stroke();
      if (item.done) {
        doc
          .font('Helvetica-Bold')
          .fontSize(9)
          .fillColor('#22c55e')
          .text('x', 61.5, state.y + 1.5);
      }
      doc.font('Helvetica').fontSize(9).fillColor('#0f172a').text(item.text, 78, state.y, {
        width: doc.page.width - 138,
      });
      state.y += 18;
    });
  }

  if (orc.client_decision_note) {
    drawSectionTitle(doc, state, 'Retorno do cliente');
    drawLineField(doc, state, 'Mensagem', orc.client_decision_note);
  }

  ensureSpace(doc, 54, state);
  doc.roundedRect(60, state.y + 10, doc.page.width - 120, 34, 10).fill('#0d1b2a');
  doc
    .font('Helvetica-Bold')
    .fontSize(8)
    .fillColor('#bfdbfe')
    .text(kind === 'receipt' ? 'Valor recebido' : 'Total geral', 72, state.y + 20);
  doc
    .font('Helvetica-Bold')
    .fontSize(16)
    .fillColor('#ffffff')
    .text(brl(orc.total_value || 0), 0, state.y + 16, {
      width: doc.page.width - 72,
      align: 'right',
    });
  state.y += 58;

  if (options.approvalUrl && kind !== 'receipt') {
    drawSectionTitle(doc, state, 'Aprovacao digital');
    drawLineField(doc, state, 'Link publico', options.approvalUrl);
  }

  const footerY = doc.page.height - 44;
  doc.moveTo(60, footerY).lineTo(doc.page.width - 60, footerY).lineWidth(0.5).strokeColor('#cbd5e1').stroke();
  doc
    .font('Helvetica')
    .fontSize(7.5)
    .fillColor('#64748b')
    .text(
      `${company?.company_name || 'Central Simples'} | Gerado em ${new Date().toLocaleString('pt-BR')}`,
      60,
      footerY + 10,
      { width: doc.page.width - 120, align: 'center' }
    );

  doc.end();
}

module.exports = {
  renderOrcamentoPdf,
};
