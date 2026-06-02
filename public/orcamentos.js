// ORCAMENTOS - JS

const BASE_TEMPLATES = [
  {
    id: 'builtin-pedreiro-semanal',
    profession: 'Pedreiro',
    name: 'Obra semanal',
    title: 'Serviço de pedreiro - etapa semanal',
    description: 'Mão de obra, materiais combinados, limpeza básica da área e entrega da etapa semanal.',
    default_validity_days: 7,
    items: [
      { description: 'Mão de obra semanal', quantity: 1, unit_price: 1200 },
      { description: 'Materiais e insumos', quantity: 1, unit_price: 450 },
      { description: 'Deslocamento', quantity: 1, unit_price: 80 }
    ],
    checklist: [
      { text: 'Confirmar medidas e escopo da etapa', done: false },
      { text: 'Registrar fotos antes e depois', done: false },
      { text: 'Combinar data do pagamento semanal', done: false }
    ]
  },
  {
    id: 'builtin-eletricista-instalacao',
    profession: 'Eletricista',
    name: 'Instalação elétrica',
    title: 'Instalação elétrica residencial',
    description: 'Instalação, revisão de pontos, testes de segurança e organização do quadro conforme combinado.',
    default_validity_days: 5,
    items: [
      { description: 'Visita técnica', quantity: 1, unit_price: 120 },
      { description: 'Mão de obra elétrica', quantity: 1, unit_price: 520 },
      { description: 'Materiais elétricos', quantity: 1, unit_price: 280 }
    ],
    checklist: [
      { text: 'Desligar energia antes do serviço', done: false },
      { text: 'Testar pontos instalados', done: false },
      { text: 'Orientar cliente sobre uso seguro', done: false }
    ]
  },
  {
    id: 'builtin-encanador-reparo',
    profession: 'Encanador',
    name: 'Reparo hidráulico',
    title: 'Reparo hidráulico com teste de vazamento',
    description: 'Identificação do vazamento, troca de peças necessárias e teste final de pressão.',
    default_validity_days: 4,
    items: [
      { description: 'Diagnóstico hidráulico', quantity: 1, unit_price: 150 },
      { description: 'Reparo e vedação', quantity: 1, unit_price: 360 },
      { description: 'Peças e conexões', quantity: 1, unit_price: 140 }
    ],
    checklist: [
      { text: 'Localizar ponto do vazamento', done: false },
      { text: 'Testar pressão após reparo', done: false },
      { text: 'Enviar orientação de manutenção', done: false }
    ]
  },
  {
    id: 'builtin-diarista-faxina',
    profession: 'Diarista',
    name: 'Faxina completa',
    title: 'Faxina completa residencial',
    description: 'Limpeza geral de cômodos, cozinha, banheiros e organização leve dos ambientes.',
    default_validity_days: 3,
    items: [
      { description: 'Diária de limpeza', quantity: 1, unit_price: 220 },
      { description: 'Produtos de limpeza', quantity: 1, unit_price: 45 }
    ],
    checklist: [
      { text: 'Confirmar endereço e horário', done: false },
      { text: 'Confirmar se produtos serão levados', done: false },
      { text: 'Agendar próxima faxina', done: false }
    ]
  },
  {
    id: 'builtin-beleza-manutencao',
    profession: 'Beleza',
    name: 'Atendimento de beleza',
    title: 'Pacote de atendimento de beleza',
    description: 'Serviço personalizado com preparação, execução, finalização e orientação de cuidados.',
    default_validity_days: 5,
    items: [
      { description: 'Atendimento principal', quantity: 1, unit_price: 160 },
      { description: 'Materiais descartáveis/produtos', quantity: 1, unit_price: 35 }
    ],
    checklist: [
      { text: 'Confirmar alergias ou restrições', done: false },
      { text: 'Registrar preferência da cliente', done: false },
      { text: 'Agendar manutenção/retorno', done: false }
    ]
  },
  {
    id: 'builtin-mecanico-revisao',
    profession: 'Mecânico',
    name: 'Revisão automotiva',
    title: 'Revisão e manutenção automotiva',
    description: 'Inspeção, diagnóstico, troca de itens combinados e relatório simples do serviço executado.',
    default_validity_days: 7,
    items: [
      { description: 'Diagnóstico do veículo', quantity: 1, unit_price: 180 },
      { description: 'Mão de obra', quantity: 1, unit_price: 420 },
      { description: 'Peças e fluidos', quantity: 1, unit_price: 350 }
    ],
    checklist: [
      { text: 'Registrar quilometragem', done: false },
      { text: 'Listar peças trocadas', done: false },
      { text: 'Definir próxima revisão', done: false }
    ]
  },
  {
    id: 'builtin-design-social',
    profession: 'Designer/Social media',
    name: 'Pacote mensal de artes',
    title: 'Pacote mensal de criação para redes sociais',
    description: 'Planejamento, criação de artes, ajustes e entrega dos arquivos finais para publicação.',
    default_validity_days: 10,
    items: [
      { description: 'Planejamento de conteúdo', quantity: 1, unit_price: 180 },
      { description: 'Artes para redes sociais', quantity: 8, unit_price: 55 },
      { description: 'Ajustes inclusos', quantity: 1, unit_price: 80 }
    ],
    checklist: [
      { text: 'Receber briefing e referências', done: false },
      { text: 'Enviar prévia para aprovação', done: false },
      { text: 'Entregar arquivos finais', done: false }
    ]
  },
  {
    id: 'builtin-tecnico-manutencao',
    profession: 'Assistência técnica',
    name: 'Manutenção técnica',
    title: 'Manutenção técnica com garantia',
    description: 'Diagnóstico, execução do reparo, testes finais e orientação de uso após o atendimento.',
    default_validity_days: 6,
    items: [
      { description: 'Diagnóstico técnico', quantity: 1, unit_price: 120 },
      { description: 'Mão de obra do reparo', quantity: 1, unit_price: 280 },
      { description: 'Peças/componentes', quantity: 1, unit_price: 160 }
    ],
    checklist: [
      { text: 'Testar equipamento antes do reparo', done: false },
      { text: 'Registrar peça substituída', done: false },
      { text: 'Testar equipamento com o cliente', done: false }
    ]
  }
];

const STATUS_MAP = {
  Aprovado: 'badge-green',
  Pendente: 'badge-amber',
  Rascunho: 'badge-gray',
  Recusado: 'badge-red',
  Pago: 'badge-blue'
};

const WEEKDAY_LABELS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const FEATURE_WINDOW_TITLES = {
  calculadora: 'Calculadora de preço',
  automacoes: 'Automações',
  modelos: 'Modelos por profissão',
  cobrancas: 'Cobranças automáticas',
  historico: 'Histórico do cliente',
  pipeline: 'Pipeline de orçamentos'
};

let _orcs = [];
let _clients = [];
let _scheduledCharges = [];
let _templates = [];
let _billing = null;
let _currentFolder = 'pipeline';
let _activeFeatureWindow = null;
let _chargeWhatsappResolver = null;
const _featureWindowEntries = new Map();
let _company = {
  company_name: 'Central Simples',
  logo_path: null,
  logo_data_url: '',
  pix_key: '',
  pix_receiver_name: '',
  pix_message_suffix: '',
  whatsapp_auto_ready: false
};

function preencherUsuarioMobile(nome) {
  const el = document.getElementById('mobile-nome-usuario');
  if (el) el.textContent = nome || 'usuário';
}

function estaNoOnboarding() {
  return new URLSearchParams(window.location.search).get('onboarding') === '1';
}

function voltarDashboardAposOnboarding() {
  if (!estaNoOnboarding()) return false;
  setTimeout(() => {
    window.location.href = '/dashboard.html?onboarding=1';
  }, 850);
  return true;
}

function billingHas(feature) {
  if (!_billing) return true;
  if (_billing.features?.includes('all')) return true;
  return Boolean(_billing.active && _billing.features?.includes(feature));
}

function premiumUpsell(title, text) {
  return `
    <div class="empty-state">
      <strong style="display:block;color:#fff;margin-bottom:.35rem;">${title}</strong>
      ${text}<br>
      <a class="btn btn-primary" href="/planos.html" style="margin-top:.85rem;">Ver planos</a>
    </div>
  `;
}

function prepararJanelasFuncionalidade() {
  document.querySelectorAll('[data-folder-section]').forEach((section) => {
    const folder = section.dataset.folderSection;
    if (!folder || _featureWindowEntries.has(folder)) return;

    const placeholder = document.createComment(`feature-window-${folder}`);
    section.before(placeholder);
    section.hidden = true;
    _featureWindowEntries.set(folder, { section, placeholder });
  });
}

function devolverFuncionalidadeAberta() {
  if (!_activeFeatureWindow) return;

  const entry = _featureWindowEntries.get(_activeFeatureWindow);
  if (entry?.section) {
    entry.section.hidden = true;
    entry.placeholder.after(entry.section);
  }

  _activeFeatureWindow = null;
}

function mostrarPastaOrcamentos(folder = 'pipeline') {
  const targetFolder = folder === 'todos' ? 'pipeline' : folder;
  const entry = _featureWindowEntries.get(targetFolder);
  const modal = document.getElementById('feature-window-modal');
  const modalBody = document.getElementById('feature-window-body');
  const modalTitle = document.getElementById('feature-window-title');

  if (!entry || !modal || !modalBody || !modalTitle) return;

  if (_activeFeatureWindow && _activeFeatureWindow !== targetFolder) {
    const previous = _featureWindowEntries.get(_activeFeatureWindow);
    if (previous?.section) {
      previous.section.hidden = true;
      previous.placeholder.after(previous.section);
    }
  }

  _currentFolder = targetFolder;
  _activeFeatureWindow = targetFolder;
  modalTitle.textContent = FEATURE_WINDOW_TITLES[targetFolder] || 'Funcionalidade';
  entry.section.hidden = false;
  modalBody.replaceChildren(entry.section);
  modal.classList.add('open');

  document.querySelectorAll('[data-folder-button]').forEach((button) => {
    button.classList.toggle('active', button.dataset.folderButton === targetFolder);
  });
}

function fecharJanelaFuncionalidade() {
  document.getElementById('feature-window-modal')?.classList.remove('open');
  devolverFuncionalidadeAberta();
  document.querySelectorAll('[data-folder-button]').forEach((button) => {
    button.classList.remove('active');
  });
}

function aplicarDestinoInicialOrcamentos() {
  const params = new URLSearchParams(window.location.search);
  const folder = params.get('folder');
  const pastasValidas = ['pipeline', 'calculadora', 'automacoes', 'modelos', 'cobrancas', 'historico'];

  if (params.get('new') === '1') {
    abrirModalNovo();
    return;
  }

  if (pastasValidas.includes(folder)) {
    mostrarPastaOrcamentos(folder);
  }

  const cobrancaId = Number(params.get('cobranca') || params.get('scheduled_charge') || 0);
  if (folder === 'cobrancas' && cobrancaId) {
    setTimeout(() => editarCobrancaProgramada(cobrancaId), 80);
  }

  const orcamentoId = Number(params.get('orcamento') || 0);
  if (folder === 'pipeline' && orcamentoId) {
    setTimeout(() => {
      const row = document.querySelector(`[data-orcamento-id="${orcamentoId}"]`);
      row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      row?.classList.add('row-highlight');
      setTimeout(() => row?.classList.remove('row-highlight'), 2400);
    }, 120);
  }
}

prepararJanelasFuncionalidade();

(async function init() {
  try {
    const profileRes = await fetch('/api/company/profile', { credentials: 'same-origin' });
    if (profileRes.status === 401) {
      window.location.replace('/login.html');
      return;
    }

    const profileData = await profileRes.json();
    if (profileData.success && profileData.data) {
      _company = profileData.data;
    }

    try {
      const me = await (await fetch('/api/me', { credentials: 'same-origin' })).json();
      _billing = me.billing || null;
      preencherUsuarioMobile(me.username || me.name || me.email || 'usuário');
    } catch {}

    document.getElementById('guard').remove();
    await carregarBase();
    resetCobrancaProgramadaForm();
    aplicarDestinoInicialOrcamentos();
  } catch (err) {
    window.location.replace('/login.html');
  }
})();

document.getElementById('modal').addEventListener('click', (event) => {
  if (event.target.id === 'modal') fecharModal();
});

document.getElementById('client-history-modal').addEventListener('click', (event) => {
  if (event.target.id === 'client-history-modal') fecharHistoricoCliente();
});

document.getElementById('feature-window-modal').addEventListener('click', (event) => {
  if (event.target.id === 'feature-window-modal') fecharJanelaFuncionalidade();
});

document.getElementById('charge-whatsapp-modal').addEventListener('click', (event) => {
  if (event.target.id === 'charge-whatsapp-modal') cancelarCobrancaWhatsapp();
});

document.getElementById('btn-sair').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
  window.location.href = '/login.html';
});

function toast(msg, type = 'success') {
  const t = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  t.className = `toast ${type}`;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
}

function brl(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
}

function valorDecimalInput(value) {
  return Number(String(value || '').replace(',', '.')) || 0;
}

function solicitarDadosCobranca(orc) {
  const modal = document.getElementById('charge-whatsapp-modal');
  document.getElementById('charge-client-name').value = orc.client_name || 'Cliente';
  document.getElementById('charge-amount').value = (Number(orc.total_value) || 0).toFixed(2);
  document.getElementById('charge-pix-key').value = _company.pix_key || '';
  document.getElementById('charge-receiver-name').value = _company.pix_receiver_name || _company.company_name || '';
  document.getElementById('charge-message-note').value = _company.pix_message_suffix || 'Se já foi pago, pode desconsiderar.';
  modal.classList.add('open');
  setTimeout(() => document.getElementById('charge-amount')?.focus(), 50);
  return new Promise((resolve) => {
    _chargeWhatsappResolver = resolve;
  });
}

function fecharModalCobrancaWhatsapp(result = null) {
  document.getElementById('charge-whatsapp-modal')?.classList.remove('open');
  if (_chargeWhatsappResolver) {
    _chargeWhatsappResolver(result);
    _chargeWhatsappResolver = null;
  }
}

function cancelarCobrancaWhatsapp() {
  fecharModalCobrancaWhatsapp(null);
}

function confirmarCobrancaWhatsapp() {
  const amount = valorDecimalInput(document.getElementById('charge-amount').value);
  const pixKey = document.getElementById('charge-pix-key').value.trim();
  const receiverName = document.getElementById('charge-receiver-name').value.trim();
  const note = document.getElementById('charge-message-note').value.trim();

  if (amount <= 0) {
    toast('Informe o valor da cobrança.', 'error');
    return;
  }
  if (!pixKey) {
    toast('Informe a chave Pix para a cobrança.', 'error');
    return;
  }

  fecharModalCobrancaWhatsapp({
    amount,
    pix_key: pixKey,
    receiver_name: receiverName,
    note,
  });
}

function fmtDate(value) {
  if (!value) return '--';
  const iso = String(value).slice(0, 10);
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
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

function daysFromToday(dateStr) {
  if (!dateStr) return null;
  const base = new Date(`${todayIso()}T12:00:00`);
  const target = new Date(`${String(dateStr).slice(0, 10)}T12:00:00`);
  return Math.round((target - base) / 86400000);
}

function parseChecklist(raw) {
  try {
    const parsed = Array.isArray(raw) ? raw : JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getChecklistProgress(raw) {
  const list = parseChecklist(raw);
  if (!list.length) return null;
  const done = list.filter((item) => item?.done).length;
  return { done, total: list.length };
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getAllTemplates() {
  return [
    ..._templates.map((tpl) => ({ ...tpl, profession: tpl.profession || 'Meus modelos' })),
    ...BASE_TEMPLATES
  ];
}

function getTemplateById(id) {
  return getAllTemplates().find((item) => String(item.id) === String(id));
}

function getProfessions() {
  return [...new Set(getAllTemplates().map((tpl) => tpl.profession || 'Meus modelos'))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function preencherSelectProfissoes() {
  const select = document.getElementById('profession-filter');
  if (!select) return;
  const current = select.value;
  select.innerHTML = `<option value="">Todas as profissões</option>` + getProfessions()
    .map((profession) => `<option value="${escapeHtml(profession)}">${escapeHtml(profession)}</option>`)
    .join('');
  if (current && getProfessions().includes(current)) select.value = current;
}

function limparFiltroProfissao() {
  document.getElementById('profession-filter').value = '';
  renderTemplates();
}

function getOrcById(id) {
  return _orcs.find((item) => Number(item.id) === Number(id));
}

function getScheduledChargeById(id) {
  return _scheduledCharges.find((item) => Number(item.id) === Number(id));
}

function getClientById(id) {
  return _clients.find((item) => Number(item.id) === Number(id));
}

function getWeekdayLabel(value) {
  return WEEKDAY_LABELS[Number(value)] || 'Sábado';
}

function getScheduledCadenceLabel(item) {
  if (item.schedule_type === 'interval') {
    return `A cada ${Number(item.interval_days || 7)} dias`;
  }
  return `Semanal em ${getWeekdayLabel(item.weekday)}`;
}

function isScheduledChargeDue(item) {
  return Boolean(item?.active && item?.next_run_at && daysFromToday(item.next_run_at) <= 0);
}

function getFollowupMeta(orc) {
  if (orc.status !== 'Pendente' || !orc.approval_sent_at) return null;
  const stage = Number(orc.follow_up_stage || 0);
  const marks = [1, 3, 7];
  if (stage >= marks.length) return null;
  const target = addDays(String(orc.approval_sent_at).slice(0, 10), marks[stage]);
  const diff = daysFromToday(target);
  return {
    stage: stage + 1,
    target,
    due: diff !== null && diff <= 0
  };
}

function isChargeDue(orc) {
  if (!orc.due_date || !['Pendente', 'Aprovado'].includes(orc.status)) return false;
  const diff = daysFromToday(orc.due_date);
  if (diff === null || diff > 1) return false;
  if (!orc.reminder_sent_at) return true;
  return String(orc.reminder_sent_at).slice(0, 10) < String(orc.due_date).slice(0, 10);
}

function isRecurrenceDue(orc) {
  return Boolean(orc.recurrence_rule && orc.recurrence_next_date && daysFromToday(orc.recurrence_next_date) <= 0);
}

function isReturnDue(orc) {
  return Boolean(orc.return_reminder_date && daysFromToday(orc.return_reminder_date) <= 0);
}

function isClosingDue(orc) {
  return orc.status === 'Pago' && !orc.closing_message_sent_at;
}

function getAutomationBadges(orc) {
  const badges = [];
  const followUp = getFollowupMeta(orc);
  if (orc.recurrence_rule) badges.push({ label: `Recorrente ${orc.recurrence_rule}`, tone: 'ok' });
  if (orc.auto_followup_enabled) badges.push({ label: 'Auto follow-up', tone: 'primary' });
  if (orc.auto_charge_enabled) badges.push({ label: 'Auto cobrança', tone: 'warn' });
  if (orc.approval_token) badges.push({ label: 'Link ativo', tone: 'primary' });
  if (followUp) badges.push({ label: `Follow-up ${followUp.stage}`, tone: followUp.due ? 'warn' : 'primary' });
  if (isChargeDue(orc)) badges.push({ label: 'Cobrar hoje', tone: 'danger' });
  if (isReturnDue(orc)) badges.push({ label: 'Retorno pendente', tone: 'warn' });
  if (isClosingDue(orc)) badges.push({ label: 'Pós-serviço', tone: 'ok' });
  const checklist = getChecklistProgress(orc.checklist_json);
  if (checklist) badges.push({ label: `Checklist ${checklist.done}/${checklist.total}`, tone: checklist.done === checklist.total ? 'ok' : 'primary' });
  if (orc.client_priority && orc.client_priority !== 'Normal') badges.push({ label: orc.client_priority, tone: 'warn' });
  if (orc.last_automation_error) badges.push({ label: 'Falha automática', tone: 'danger' });
  return badges;
}

async function carregarBase() {
  const [orcRes, templateRes, clientRes, scheduledRes] = await Promise.all([
    fetch('/api/orcamentos', { credentials: 'same-origin' }),
    fetch('/api/orcamentos/templates', { credentials: 'same-origin' }),
    fetch('/api/clients', { credentials: 'same-origin' }),
    fetch('/api/cobrancas-programadas', { credentials: 'same-origin' })
  ]);
  const orcData = await orcRes.json();
  const templateData = await templateRes.json();
  const clientData = await clientRes.json();
  const scheduledData = await scheduledRes.json();
  _orcs = orcData.success ? orcData.data : [];
  _clients = clientData.success ? clientData.data : [];
  _scheduledCharges = scheduledData.success ? scheduledData.data : [];
  _templates = templateData.success ? templateData.data : [];
  preencherEmpresaModal();
  renderTudo();
}

function renderTudo() {
  renderResumo();
  renderAgenda();
  preencherSelectProfissoes();
  renderTemplates();
  preencherSelectModelos();
  atualizarStatusAutomacao();
  preencherSelectClientesCobranca();
  preencherSelectClientesHistorico();
  renderClientHistoryPreview();
  renderClientInsights();
  renderScheduledCharges();
  renderTabela();
  atualizarPreviewCalculo();
}

function renderResumo() {
  const ativos = _orcs.filter((item) => item.status !== 'Recusado');
  const totalCarteira = ativos.reduce((sum, item) => sum + (Number(item.total_value) || 0), 0);
  const aprovados = _orcs.filter((item) => ['Aprovado', 'Pago'].includes(item.status));
  const aprovadosValor = aprovados.reduce((sum, item) => sum + (Number(item.total_value) || 0), 0);
  const followups = _orcs.filter((item) => getFollowupMeta(item)?.due).length;
  const scheduledDue = _scheduledCharges.filter(isScheduledChargeDue).length;
  const scheduledActive = _scheduledCharges.filter((item) => item.active).length;
  const cobrancas = _orcs.filter(isChargeDue).length + scheduledDue;
  const recorrencias = _orcs.filter((item) => item.recurrence_rule).length;
  const mesAtual = todayIso().slice(0, 7);
  const totalMes = _orcs
    .filter((item) => String(item.created_at || '').slice(0, 7) === mesAtual)
    .reduce((sum, item) => sum + (Number(item.total_value) || 0), 0);

  document.getElementById('summary-grid').innerHTML = `
    <div class="kpi-card kpi-blue">
      <div class="kpi-label">Carteira ativa</div>
      <div class="kpi-value">${brl(totalCarteira)}</div>
      <div class="kpi-sub">Orçamentos em aberto ou em execução</div>
    </div>
    <div class="kpi-card kpi-green">
      <div class="kpi-label">Aprovados + pagos</div>
      <div class="kpi-value">${brl(aprovadosValor)}</div>
      <div class="kpi-sub">${aprovados.length} oportunidades confirmadas</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Follow-ups do dia</div>
      <div class="kpi-value">${followups}</div>
      <div class="kpi-sub">Ações para não deixar proposta esfriar</div>
    </div>
    <div class="kpi-card kpi-gold">
      <div class="kpi-label">Cobrancas pendentes</div>
      <div class="kpi-value">${cobrancas}</div>
      <div class="kpi-sub">Lembretes de vencimento e inadimplencia</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Cobranças automáticas</div>
      <div class="kpi-value">${scheduledActive}</div>
      <div class="kpi-sub">${scheduledDue} regras prontas para disparar hoje</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Recorrentes</div>
      <div class="kpi-value">${recorrencias}</div>
      <div class="kpi-sub">Serviços prontos para gerar novos ciclos</div>
    </div>
    <div class="kpi-card kpi-blue">
      <div class="kpi-label">Resumo do mês</div>
      <div class="kpi-value">${brl(totalMes)}</div>
      <div class="kpi-sub">${_orcs.length} orçamentos no pipeline total</div>
    </div>`;
}

function getAgendaItems() {
  const items = [];

  _orcs.forEach((orc) => {
    const followUp = getFollowupMeta(orc);
    if (followUp?.due) {
      items.push({
        priority: 1,
        id: orc.id,
        kind: 'followup',
        title: `Follow-up ${followUp.stage} com ${orc.client_name}`,
        text: `${orc.title} | enviado em ${fmtDate(orc.approval_sent_at)}`
      });
    }

    if (isChargeDue(orc)) {
      const diff = daysFromToday(orc.due_date);
      items.push({
        priority: diff < 0 ? 0 : 2,
        id: orc.id,
        kind: 'charge',
        title: diff < 0 ? `Cobrança atrasada para ${orc.client_name}` : `Cobrar ${orc.client_name}`,
        text: `${orc.title} | vencimento ${fmtDate(orc.due_date)}`
      });
    }

    if (isRecurrenceDue(orc)) {
      items.push({
        priority: 3,
        id: orc.id,
        kind: 'recurrence',
        title: `Gerar nova recorrência para ${orc.client_name}`,
        text: `${orc.title} | próxima data ${fmtDate(orc.recurrence_next_date)}`
      });
    }

    if (isClosingDue(orc)) {
      items.push({
        priority: 4,
        id: orc.id,
        kind: 'closing',
        title: `Pós-serviço para ${orc.client_name}`,
        text: `${orc.title} | envie agradecimento e feedback`
      });
    }

    if (isReturnDue(orc)) {
      items.push({
        priority: 5,
        id: orc.id,
        kind: 'return',
        title: `Lembrar retorno para ${orc.client_name}`,
        text: `${orc.title} | retorno sugerido ${fmtDate(orc.return_reminder_date)}`
      });
    }
  });

  _scheduledCharges.forEach((charge) => {
    if (!isScheduledChargeDue(charge)) return;
    items.push({
      priority: 2,
      id: charge.id,
      kind: 'scheduled_charge',
      title: `Cobrança automática para ${charge.client_name}`,
      text: `${charge.title} | ${brl(charge.amount)} | próximo disparo ${fmtDate(charge.next_run_at)}`
    });
  });

  return items.sort((a, b) => a.priority - b.priority).slice(0, 8);
}

function renderAgenda() {
  const agenda = getAgendaItems();
  const container = document.getElementById('agenda-list');

  if (!agenda.length) {
    container.innerHTML = `<div class="empty-state">A agenda automática está em dia. Conforme você enviar orçamentos, lembretes e recorrências, as próximas ações vão aparecer aqui.</div>`;
    return;
  }

  container.innerHTML = agenda.map((item) => `
    <div class="agenda-item">
      <strong>${escapeHtml(item.title)}</strong>
      <p>${escapeHtml(item.text)}</p>
      <div class="action-row">
        <button class="action-chip primary" onclick="executarAgenda(${item.id}, '${item.kind}')">${rotuloAgenda(item.kind)}</button>
        ${item.kind === 'scheduled_charge'
          ? `<button class="action-chip" onclick="editarCobrancaProgramada(${item.id})">Editar regra</button>`
          : `<button class="action-chip" onclick="abrirModalEditar(${item.id})">Abrir</button>`}
      </div>
    </div>
  `).join('');
}

function rotuloAgenda(kind) {
  if (kind === 'followup') return 'Enviar follow-up';
  if (kind === 'charge') return 'Cobrar';
  if (kind === 'scheduled_charge') return 'Editar cobrança';
  if (kind === 'recurrence') return 'Gerar recorrência';
  if (kind === 'closing') return 'Enviar pós-serviço';
  if (kind === 'return') return 'Lembrar retorno';
  return 'Executar';
}

function renderTemplates() {
  const container = document.getElementById('template-list');
  if (!billingHas('templates')) {
    container.innerHTML = premiumUpsell(
      'Modelos por profissão são do plano Profissional.',
      'Assine o plano Profissional para aplicar modelos prontos, salvar seus próprios modelos e acelerar a criação de propostas.'
    );
    return;
  }

  const profession = document.getElementById('profession-filter')?.value || '';
  const templates = getAllTemplates().filter((tpl) => !profession || tpl.profession === profession);

  if (!templates.length) {
    container.innerHTML = `<div class="empty-state">Nenhum modelo encontrado para esta profissão.</div>`;
    return;
  }

  container.innerHTML = templates.map((tpl) => {
    const custom = !String(tpl.id).startsWith('builtin-');
    return `
      <div class="template-item">
        <span class="template-profession">${escapeHtml(tpl.profession || 'Meus modelos')}</span>
        <strong>${escapeHtml(tpl.name)}</strong>
        <p>${escapeHtml(tpl.description || tpl.title || 'Modelo pronto para acelerar criação de propostas.')}</p>
        <div class="template-meta">
          <span class="mini-pill">${(tpl.items || []).length} itens</span>
          <span class="mini-pill warn">${(tpl.checklist || []).length} checkpoints</span>
          <span class="mini-pill ok">${tpl.default_validity_days || 7} dias</span>
        </div>
        <div class="action-row">
          <button class="action-chip primary" onclick="usarModeloNoNovo('${escapeHtml(tpl.id)}')">Usar agora</button>
          ${custom ? `<button class="action-chip danger" onclick="excluirTemplate(${tpl.id})">Excluir</button>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function preencherSelectModelos() {
  const select = document.getElementById('modal-template-select');
  select.innerHTML = `<option value="">Escolha um modelo pronto</option>` + getAllTemplates().map((tpl) => (
    `<option value="${escapeHtml(tpl.id)}">${escapeHtml(tpl.profession || 'Modelo')} - ${escapeHtml(tpl.name)}</option>`
  )).join('');
}

function atualizarStatusAutomacao() {
  const note = document.getElementById('automation-server-note');
  if (!note) return;

  note.className = `status-banner${_company.whatsapp_auto_ready ? ' ready' : ''}`;
  note.textContent = _company.whatsapp_auto_ready
    ? 'O servidor já está pronto para enviar follow-up, cobranças no vencimento e cobranças recorrentes direto no WhatsApp.'
    : 'As regras já podem ser salvas agora, mas o disparo automático no WhatsApp só acontece depois que as credenciais da API forem configuradas no servidor.';

  const pixInput = document.getElementById('scheduled-pix-key');
  const receiverInput = document.getElementById('scheduled-receiver-name');
  if (pixInput) {
    pixInput.placeholder = _company.pix_key || 'Usar chave Pix salva nas configurações';
  }
  if (receiverInput) {
    receiverInput.placeholder = _company.pix_receiver_name || _company.company_name || 'Usar nome salvo nas configurações';
  }
}

function syncScheduledActiveSelects(value = 'true') {
  document.getElementById('scheduled-active').value = value;
  document.getElementById('scheduled-active-interval').value = value;
}

function getScheduledActiveValue() {
  const type = document.getElementById('scheduled-type').value;
  return (type === 'interval'
    ? document.getElementById('scheduled-active-interval').value
    : document.getElementById('scheduled-active').value) === 'true';
}

function preencherSelectClientesCobranca(selectedValue = null) {
  const select = document.getElementById('scheduled-client-id');
  if (!select) return;

  const currentValue = selectedValue ?? select.value;
  if (!_clients.length) {
    select.innerHTML = `<option value="">Crie um orçamento primeiro para cadastrar clientes</option>`;
    return;
  }

  select.innerHTML = `<option value="">Selecione um cliente</option>` + _clients.map((client) => (
    `<option value="${client.id}">${escapeHtml(client.name)}${client.whatsapp ? ` - ${escapeHtml(client.whatsapp)}` : ''}</option>`
  )).join('');

  const targetValue = currentValue && _clients.some((client) => String(client.id) === String(currentValue))
    ? String(currentValue)
    : String(_clients[0].id);
  select.value = targetValue;
}

function getClientStats(clientId) {
  const orcs = _orcs.filter((orc) => Number(orc.client_id) === Number(clientId));
  const charges = _scheduledCharges.filter((charge) => Number(charge.client_id) === Number(clientId));
  const open = orcs
    .filter((orc) => ['Pendente', 'Aprovado'].includes(orc.status))
    .reduce((sum, orc) => sum + (Number(orc.total_value) || 0), 0);
  const paid = orcs
    .filter((orc) => orc.status === 'Pago')
    .reduce((sum, orc) => sum + (Number(orc.total_value) || 0), 0);
  const overdue = orcs
    .filter((orc) => orc.due_date && daysFromToday(orc.due_date) < 0 && orc.status !== 'Pago')
    .reduce((sum, orc) => sum + (Number(orc.total_value) || 0), 0);
  const nextCharge = charges
    .filter((charge) => charge.active && charge.next_run_at)
    .sort((a, b) => String(a.next_run_at).localeCompare(String(b.next_run_at)))[0] || null;

  return {
    orcs,
    charges,
    open,
    paid,
    overdue,
    nextCharge,
    lastOrc: orcs.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0] || null,
  };
}

function preencherSelectClientesHistorico(selectedValue = null) {
  const select = document.getElementById('client-history-select');
  if (!select) return;

  const currentValue = selectedValue ?? select.value;
  if (!_clients.length) {
    select.innerHTML = `<option value="">Nenhum cliente cadastrado ainda</option>`;
    renderClientHistoryPreview();
    return;
  }

  select.innerHTML = `<option value="">Selecione um cliente</option>` + _clients.map((client) => (
    `<option value="${client.id}">${escapeHtml(client.name)}${client.whatsapp ? ` - ${escapeHtml(client.whatsapp)}` : ''}</option>`
  )).join('');

  const targetValue = currentValue && _clients.some((client) => String(client.id) === String(currentValue))
    ? String(currentValue)
    : String(_clients[0].id);
  select.value = targetValue;
  select.onchange = renderClientHistoryPreview;
}

function renderClientHistoryPreview() {
  const container = document.getElementById('client-history-preview');
  const select = document.getElementById('client-history-select');
  if (!container || !select || !_clients.length || !select.value) {
    if (container) {
      container.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">Crie um orçamento para cadastrar o primeiro cliente e liberar o histórico completo.</div>`;
    }
    return;
  }

  const stats = getClientStats(select.value);
  container.innerHTML = `
    <div class="client-stat">
      <small>Em aberto</small>
      <strong>${brl(stats.open)}</strong>
    </div>
    <div class="client-stat">
      <small>Pago</small>
      <strong>${brl(stats.paid)}</strong>
    </div>
    <div class="client-stat">
      <small>Atrasado</small>
      <strong>${brl(stats.overdue)}</strong>
    </div>
    <div class="client-stat">
      <small>Registros</small>
      <strong>${stats.orcs.length + stats.charges.length}</strong>
    </div>`;
}

function renderClientInsights() {
  const container = document.getElementById('client-insights-list');
  if (!container) return;

  const insights = _clients.map((client) => {
    const stats = getClientStats(client.id);
    return {
      client,
      stats,
      score: stats.overdue * 3 + stats.open + (stats.nextCharge ? 250 : 0) + stats.orcs.length,
    };
  }).filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (!insights.length) {
    container.innerHTML = `<div class="empty-state">Sem alertas de cliente no momento. Quando alguém tiver valor em aberto ou cobrança ativa, aparece aqui.</div>`;
    return;
  }

  container.innerHTML = insights.map(({ client, stats }) => `
    <div class="history-item">
      <strong>${escapeHtml(client.name)}</strong>
      <p>Em aberto: ${brl(stats.open)} | Atrasado: ${brl(stats.overdue)}${stats.nextCharge ? ` | Próxima cobrança: ${fmtDate(stats.nextCharge.next_run_at)}` : ''}</p>
      <div class="action-row">
        <button class="action-chip primary" onclick="abrirHistoricoCliente(${client.id})">Ver histórico</button>
        <button class="action-chip" onclick="abrirNovoOrcamentoPeloHistorico()">PDF e orçamento</button>
      </div>
    </div>
  `).join('');
}

async function abrirHistoricoClienteSelecionado() {
  const clientId = document.getElementById('client-history-select').value;
  if (!clientId) {
    toast('Selecione um cliente para abrir o histórico.', 'info');
    return;
  }
  await abrirHistoricoCliente(clientId);
}

async function abrirHistoricoCliente(clientId) {
  if (!billingHas('client_history')) {
    window.location.href = '/planos.html';
    return;
  }

  const res = await fetch(`/api/clients/${clientId}/history`, { credentials: 'same-origin' });
  const data = await res.json();
  if (!data.success) {
    toast(data.message || 'Não foi possível abrir o histórico do cliente.', 'error');
    return;
  }
  renderClientHistoryModal(data.data);
  document.getElementById('client-history-modal').classList.add('open');
}

function renderClientHistoryModal(data) {
  const client = data.client || {};
  const orcs = data.orcamentos || [];
  const notes = data.notes || [];
  const charges = data.scheduled_charges || [];
  const open = orcs
    .filter((orc) => ['Pendente', 'Aprovado'].includes(orc.status))
    .reduce((sum, orc) => sum + (Number(orc.total_value) || 0), 0);
  const paid = orcs
    .filter((orc) => orc.status === 'Pago')
    .reduce((sum, orc) => sum + (Number(orc.total_value) || 0), 0);
  const rejected = orcs.filter((orc) => orc.status === 'Recusado').length;
  const activeCharges = charges.filter((charge) => charge.active).length;

  document.getElementById('client-history-title').textContent = `Histórico de ${client.name || 'cliente'}`;
  document.getElementById('client-history-summary').innerHTML = `
    <div class="client-stat">
      <small>Em aberto</small>
      <strong>${brl(open)}</strong>
    </div>
    <div class="client-stat">
      <small>Pago</small>
      <strong>${brl(paid)}</strong>
    </div>
    <div class="client-stat">
      <small>Orçamentos</small>
      <strong>${orcs.length}</strong>
    </div>
    <div class="client-stat">
      <small>Cobranças ativas</small>
      <strong>${activeCharges}</strong>
    </div>`;

  document.getElementById('client-history-orcs').innerHTML = orcs.length
    ? orcs.map((orc) => `
        <div class="history-item">
          <strong>${escapeHtml(orc.title || 'Serviço')}</strong>
          <p>${brl(orc.total_value)} | ${escapeHtml(orc.status)} | criado em ${fmtDate(orc.created_at)}${orc.due_date ? ` | vence ${fmtDate(orc.due_date)}` : ''}</p>
          ${orc.description ? `<p style="margin-top:.45rem;">${escapeHtml(orc.description)}</p>` : ''}
          ${orc.client_decision_note ? `<p style="margin-top:.45rem;color:#bfdbfe;">Retorno do cliente: ${escapeHtml(orc.client_decision_note)}</p>` : ''}
          <div class="action-row">
            <button class="action-chip primary" onclick="fecharHistoricoCliente(); abrirModalEditar(${orc.id})">Abrir orçamento</button>
            <a class="action-chip" href="/api/orcamentos/${orc.id}/pdf" target="_blank">PDF</a>
          </div>
        </div>
      `).join('')
    : `<div class="empty-state">Este cliente ainda não tem orçamentos no histórico.</div>`;

  const chargeCards = charges.map((charge) => `
    <div class="note-item">
      <strong>Cobrança: ${escapeHtml(charge.title)}</strong>
      <p>${brl(charge.amount)} | ${escapeHtml(getScheduledCadenceLabel(charge))} | próximo ${fmtDate(charge.next_run_at)}</p>
      <p>Status: ${charge.active ? 'Ativa' : 'Pausada'}${charge.last_error ? ` | Falha: ${escapeHtml(charge.last_error)}` : ''}</p>
    </div>
  `);

  const noteCards = notes.map((entry) => `
    <div class="note-item">
      <strong>${fmtDate(entry.created_at)}</strong>
      <p>${escapeHtml(entry.note)}</p>
    </div>
  `);

  document.getElementById('client-history-notes').innerHTML = chargeCards.concat(noteCards).length
    ? chargeCards.concat(noteCards).join('')
    : `<div class="empty-state">Nenhuma nota ou cobrança programada para este cliente.</div>`;
}

function fecharHistoricoCliente() {
  document.getElementById('client-history-modal').classList.remove('open');
}

function abrirNovoOrcamentoPeloHistorico() {
  fecharJanelaFuncionalidade();
  setTimeout(() => {
    abrirModalNovo();
    mostrarEtapaModal('pdf');
  }, 80);
}

function atualizarCamposCobrancaProgramada() {
  const type = document.getElementById('scheduled-type').value;
  const weeklyRow = document.getElementById('scheduled-weekly-row');
  const intervalRow = document.getElementById('scheduled-interval-row');
  const activeValue = getScheduledActiveValue() ? 'true' : 'false';

  weeklyRow.style.display = type === 'weekly' ? 'grid' : 'none';
  intervalRow.style.display = type === 'interval' ? 'grid' : 'none';
  syncScheduledActiveSelects(activeValue);
}

function resetCobrancaProgramadaForm() {
  document.getElementById('scheduled-charge-id').value = '';
  document.getElementById('scheduled-title').value = '';
  document.getElementById('scheduled-amount').value = '';
  document.getElementById('scheduled-type').value = 'weekly';
  document.getElementById('scheduled-weekday').value = '6';
  document.getElementById('scheduled-interval-days').value = '7';
  document.getElementById('scheduled-next-run').value = todayIso();
  document.getElementById('scheduled-pix-key').value = '';
  document.getElementById('scheduled-receiver-name').value = '';
  document.getElementById('scheduled-notes').value = '';
  document.getElementById('scheduled-save-label').textContent = 'Ativar cobrança programada';
  syncScheduledActiveSelects('true');
  preencherSelectClientesCobranca();
  atualizarCamposCobrancaProgramada();
}

function renderScheduledCharges() {
  const container = document.getElementById('scheduled-charge-list');
  if (!billingHas('scheduled_charges')) {
    container.innerHTML = premiumUpsell(
      'Cobranças automáticas são do plano Profissional.',
      'Libere cobranças recorrentes por cliente para o sistema lembrar o usuário no dia certo e preparar mensagens de cobrança pelo WhatsApp.'
    );
    return;
  }

  if (!_scheduledCharges.length) {
    container.innerHTML = _clients.length
      ? `<div class="empty-state">Nenhuma cobrança recorrente criada ainda. Use o formulário acima para automatizar cobranças semanais, quinzenais ou no intervalo que você quiser.</div>`
      : `<div class="empty-state">Assim que você tiver clientes cadastrados, poderá programar cobranças automáticas por WhatsApp aqui.</div>`;
    return;
  }

  container.innerHTML = _scheduledCharges.map((item) => {
    const pix = item.pix_key || _company.pix_key || '--';
    const receiver = item.receiver_name || _company.pix_receiver_name || _company.company_name || '--';
    const nextRunTone = isScheduledChargeDue(item) ? 'danger' : item.active ? 'ok' : 'warn';

    return `
      <div class="template-item">
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.client_name || 'Cliente sem nome')} | ${brl(item.amount)} | ${escapeHtml(getScheduledCadenceLabel(item))}</p>
        <div class="template-meta">
          <span class="mini-pill ${item.active ? 'ok' : 'warn'}">${item.active ? 'Ativa' : 'Pausada'}</span>
          <span class="mini-pill ${nextRunTone}">Próximo: ${fmtDate(item.next_run_at)}</span>
          <span class="mini-pill">Pix: ${escapeHtml(pix)}</span>
        </div>
        <p style="margin-top:.7rem;">Recebedor: ${escapeHtml(receiver)}${item.last_sent_at ? ` | último envio em ${fmtDate(item.last_sent_at)}` : ''}</p>
        ${item.notes ? `<p style="margin-top:.45rem;">Obs: ${escapeHtml(item.notes)}</p>` : ''}
        ${item.last_error ? `<p style="margin-top:.45rem;color:#fca5a5;">Ultima falha: ${escapeHtml(item.last_error)}</p>` : ''}
        <div class="action-row">
          <button class="action-chip primary" onclick="editarCobrancaProgramada(${item.id})">Editar</button>
          <button class="action-chip ${item.active ? 'warn' : 'success'}" onclick="alternarCobrancaProgramada(${item.id}, ${item.active ? 'false' : 'true'})">${item.active ? 'Pausar' : 'Reativar'}</button>
          <button class="action-chip danger" onclick="excluirCobrancaProgramada(${item.id})">Excluir</button>
        </div>
      </div>
    `;
  }).join('');
}

function editarCobrancaProgramada(id) {
  const item = getScheduledChargeById(id);
  if (!item) {
    toast('Cobrança programada não encontrada.', 'error');
    return;
  }

  document.getElementById('scheduled-charge-id').value = item.id;
  preencherSelectClientesCobranca(item.client_id);
  document.getElementById('scheduled-title').value = item.title || '';
  document.getElementById('scheduled-amount').value = item.amount || '';
  document.getElementById('scheduled-type').value = item.schedule_type || 'weekly';
  document.getElementById('scheduled-weekday').value = String(item.weekday ?? 6);
  document.getElementById('scheduled-interval-days').value = String(item.interval_days || 7);
  document.getElementById('scheduled-next-run').value = item.next_run_at || todayIso();
  document.getElementById('scheduled-pix-key').value = item.pix_key || '';
  document.getElementById('scheduled-receiver-name').value = item.receiver_name || '';
  document.getElementById('scheduled-notes').value = item.notes || '';
  syncScheduledActiveSelects(item.active ? 'true' : 'false');
  document.getElementById('scheduled-save-label').textContent = 'Atualizar cobrança programada';
  atualizarCamposCobrancaProgramada();
  document.getElementById('scheduled-charge-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function salvarCobrancaProgramada() {
  if (!billingHas('scheduled_charges')) {
    window.location.href = '/planos.html';
    return;
  }

  if (!_clients.length) {
    toast('Cadastre ao menos um cliente antes de criar cobranças automáticas.', 'error');
    return;
  }

  const payload = {
    client_id: Number(document.getElementById('scheduled-client-id').value) || 0,
    title: document.getElementById('scheduled-title').value.trim(),
    amount: Number(document.getElementById('scheduled-amount').value) || 0,
    schedule_type: document.getElementById('scheduled-type').value,
    weekday: Number(document.getElementById('scheduled-weekday').value) || 0,
    interval_days: Number(document.getElementById('scheduled-interval-days').value) || 7,
    next_run_at: document.getElementById('scheduled-next-run').value || todayIso(),
    active: getScheduledActiveValue(),
    pix_key: document.getElementById('scheduled-pix-key').value.trim(),
    receiver_name: document.getElementById('scheduled-receiver-name').value.trim(),
    notes: document.getElementById('scheduled-notes').value.trim()
  };

  if (!payload.client_id || !payload.title || payload.amount <= 0) {
    toast('Preencha cliente, título e valor da cobrança.', 'error');
    return;
  }

  const id = document.getElementById('scheduled-charge-id').value;
  const res = await fetch(id ? `/api/cobrancas-programadas/${id}` : '/api/cobrancas-programadas', {
    method: id ? 'PUT' : 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();

  if (!data.success) {
    toast(data.message || 'Não foi possível salvar a cobrança programada.', 'error');
    return;
  }

  toast(
    _company.whatsapp_auto_ready
      ? (id ? 'Cobrança programada atualizada.' : 'Cobrança programada criada.')
      : 'Regra salva. O disparo automático será ativado quando o WhatsApp do servidor estiver configurado.',
    _company.whatsapp_auto_ready ? 'success' : 'info'
  );
  resetCobrancaProgramadaForm();
  await carregarBase();
}

async function alternarCobrancaProgramada(id, active) {
  const res = await fetch(`/api/cobrancas-programadas/${id}/toggle`, {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active })
  });
  const data = await res.json();

  if (!data.success) {
    toast(data.message || 'Não foi possível alterar a regra.', 'error');
    return;
  }

  toast(active ? 'Cobrança programada reativada.' : 'Cobrança programada pausada.', 'success');
  await carregarBase();
}

async function excluirCobrancaProgramada(id) {
  const ok = await (window.CentralSimplesUi?.confirm?.({
    title: 'Excluir cobrança programada?',
    message: 'Esta regra deixará de gerar lembretes automáticos para o cliente.',
    confirmText: 'Excluir cobrança',
  }) ?? Promise.resolve(confirm('Excluir esta cobrança programada?')));
  if (!ok) return;

  const res = await fetch(`/api/cobrancas-programadas/${id}`, {
    method: 'DELETE',
    credentials: 'same-origin'
  });
  const data = await res.json();

  if (!data.success) {
    toast(data.message || 'Não foi possível excluir a cobrança programada.', 'error');
    return;
  }

  toast('Cobrança programada excluída.', 'success');
  if (String(document.getElementById('scheduled-charge-id').value) === String(id)) {
    resetCobrancaProgramadaForm();
  }
  await carregarBase();
}

function getFilteredOrcs() {
  const busca = document.getElementById('filtro-busca').value.toLowerCase().trim();
  const status = document.getElementById('filtro-status').value;

  return _orcs.filter((orc) => {
    const haystack = [
      orc.client_name,
      orc.title,
      orc.description,
      orc.client_priority,
      orc.client_profile_notes,
      orc.internal_notes
    ].join(' ').toLowerCase();

    const matchesBusca = !busca || haystack.includes(busca);
    const matchesStatus = !status || orc.status === status;
    return matchesBusca && matchesStatus;
  });
}

function renderTabela() {
  const rows = getFilteredOrcs();
  document.getElementById('counter').textContent = `${rows.length} de ${_orcs.length} orçamentos`;
  const tbody = document.getElementById('tbody-orc');

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:2.5rem;">Nenhum orçamento encontrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((orc) => montarLinhaTabela(orc)).join('');
}

function montarLinhaTabela(orc) {
  const badgeCls = STATUS_MAP[orc.status] || 'badge-gray';
  const automacoes = getAutomationBadges(orc).map((badge) => {
    const tone = badge.tone === 'warn' ? 'warn' : badge.tone === 'danger' ? 'danger' : badge.tone === 'ok' ? 'ok' : '';
    return `<span class="mini-pill ${tone}">${escapeHtml(badge.label)}</span>`;
  }).join('');

  const actions = [
    `<a class="action-chip primary" href="/api/orcamentos/${orc.id}/pdf" target="_blank">PDF</a>`,
    `<button class="action-chip success" onclick="enviarMensagemRapida(${orc.id}, 'budget')">Zap</button>`,
    `<button class="action-chip" onclick="copiarLinkAprovacao(${orc.id})">Link</button>`,
    `<button class="action-chip" onclick="abrirModalEditar(${orc.id})">Editar</button>`,
    `<button class="action-chip" onclick="abrirHistoricoCliente(${orc.client_id})">Histórico</button>`,
    `<button class="action-chip" onclick="duplicarOrcamento(${orc.id})">Duplicar</button>`
  ];

  if (getFollowupMeta(orc)?.due || orc.status === 'Pendente') {
    actions.push(`<button class="action-chip warn" onclick="enviarMensagemRapida(${orc.id}, 'followup')">Follow-up</button>`);
  }
  if (isChargeDue(orc) || ['Pendente', 'Aprovado'].includes(orc.status)) {
    actions.push(`<button class="action-chip warn" onclick="enviarMensagemRapida(${orc.id}, 'charge')">Cobrança</button>`);
  }
  if (orc.status === 'Pago') {
    actions.push(`<a class="action-chip primary" href="/api/orcamentos/${orc.id}/receipt" target="_blank">Recibo</a>`);
    actions.push(`<button class="action-chip success" onclick="enviarMensagemRapida(${orc.id}, 'closing')">Pós-serviço</button>`);
  }
  if (isRecurrenceDue(orc)) {
    actions.push(`<button class="action-chip primary" onclick="gerarRecorrencia(${orc.id})">Gerar próximo</button>`);
  }
  actions.push(`<button class="action-chip danger" onclick="excluirOrcamento(${orc.id})">Excluir</button>`);

  return `
    <tr data-orcamento-id="${orc.id}">
      <td style="font-family:monospace;color:var(--muted);">#${String(orc.id).padStart(4, '0')}</td>
      <td>
        <strong style="display:block;color:#fff;">${escapeHtml(orc.client_name || '--')}</strong>
        <span style="font-size:.76rem;color:var(--muted);">${escapeHtml(orc.client_whatsapp || '')}</span>
      </td>
      <td>
        <strong style="display:block;color:#fff;">${escapeHtml(orc.title || '--')}</strong>
        <span class="table-note" style="display:block;font-size:.76rem;color:var(--muted);" title="${escapeHtml(orc.description || '')}">${escapeHtml(orc.description || 'Sem descrição')}</span>
      </td>
      <td>
        <div class="row-meta">${automacoes || '<span style="color:var(--muted);font-size:.78rem;">Sem alertas</span>'}</div>
      </td>
      <td>
        <strong style="display:block;color:var(--sky);">${brl(orc.total_value)}</strong>
        <span style="font-size:.76rem;color:var(--muted);">Validade: ${fmtDate(orc.due_date)}</span>
      </td>
      <td><span class="badge ${badgeCls}">${escapeHtml(orc.status)}</span></td>
      <td><div class="action-row">${actions.join('')}</div></td>
    </tr>
  `;
}

function preencherEmpresaModal() {
  document.getElementById('modal-company-name').textContent = _company.company_name || 'Central Simples';
  const img = document.getElementById('modal-company-logo');
  const ph = document.getElementById('modal-company-ph');
  const logoSrc = _company.logo_data_url || (_company.logo_path ? `/${_company.logo_path}` : '');
  if (logoSrc) {
    img.src = logoSrc;
    img.style.display = 'block';
    ph.style.display = 'none';
  } else {
    img.style.display = 'none';
    ph.style.display = 'block';
    ph.textContent = (_company.company_name || 'CS')
      .split(' ')
      .slice(0, 2)
      .map((part) => part[0] || '')
      .join('')
      .toUpperCase();
  }
}

const MODAL_STEPS = ['pdf', 'servico', 'valores', 'notas'];
let _modalStep = 'pdf';

function mostrarEtapaModal(step = 'pdf') {
  const activeStep = MODAL_STEPS.includes(step) ? step : 'pdf';
  _modalStep = activeStep;

  document.querySelectorAll('[data-modal-step]').forEach((section) => {
    section.classList.toggle('is-hidden', section.dataset.modalStep !== activeStep);
  });

  document.querySelectorAll('.flow-tab').forEach((tab) => {
    const selected = tab.dataset.step === activeStep;
    tab.classList.toggle('active', selected);
    tab.setAttribute('aria-selected', selected ? 'true' : 'false');
  });

  const index = MODAL_STEPS.indexOf(activeStep);
  const prev = document.getElementById('modal-prev-step');
  const next = document.getElementById('modal-next-step');
  if (prev) prev.disabled = index <= 0;
  if (next) next.disabled = index >= MODAL_STEPS.length - 1;
}

function navegarEtapaModal(direction) {
  const currentIndex = MODAL_STEPS.indexOf(_modalStep);
  const nextIndex = Math.min(Math.max(currentIndex + direction, 0), MODAL_STEPS.length - 1);
  mostrarEtapaModal(MODAL_STEPS[nextIndex]);
  document.querySelector('.modal')?.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetModal() {
  document.getElementById('orc-id').value = '';
  document.getElementById('modal-title').textContent = 'Novo orçamento';
  [
    'cli-nome', 'cli-tel', 'cli-email', 'cli-endereco', 'cli-cpf', 'cli-profile-notes',
    'orc-titulo', 'orc-desc', 'orc-vencimento', 'orc-service-date', 'template-name',
    'orc-notes', 'client-note', 'return-date', 'calc-cost', 'calc-hours', 'calc-rate', 'calc-displacement'
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('orc-status').value = 'Pendente';
  document.getElementById('orc-recurrence').value = '';
  document.getElementById('orc-auto-followup').value = 'false';
  document.getElementById('orc-auto-charge').value = 'false';
  document.getElementById('cli-prioridade').value = 'Normal';
  document.getElementById('save-template').value = 'false';
  document.getElementById('template-validity-days').value = '7';
  document.getElementById('modal-template-select').value = '';
  document.getElementById('items-container').innerHTML = '';
  document.getElementById('checklist-container').innerHTML = '';
  document.getElementById('modal-history-list').innerHTML = '';
  document.getElementById('modal-notes-list').innerHTML = '';
  document.getElementById('history-grid').style.display = 'none';
  adicionarItem();
  adicionarChecklistItem();
  calcularTotal();
  atualizarPreviewCalculo();
  mostrarEtapaModal('pdf');
}

function abrirModalNovo() {
  resetModal();
  preencherEmpresaModal();
  document.getElementById('modal').classList.add('open');
}

function abrirCalculadoraMobile() {
  mostrarPastaOrcamentos('calculadora');
}

async function abrirModalEditar(id) {
  const res = await fetch(`/api/orcamentos/${id}`, { credentials: 'same-origin' });
  const data = await res.json();
  if (!data.success) {
    toast(data.message || 'Não foi possível abrir o orçamento.', 'error');
    return;
  }

  const item = data.data;
  resetModal();
  document.getElementById('modal-title').textContent = `Editar orçamento #${String(id).padStart(4, '0')}`;
  document.getElementById('orc-id').value = item.id;
  document.getElementById('cli-nome').value = item.client_name || '';
  document.getElementById('cli-tel').value = item.client_whatsapp || '';
  document.getElementById('cli-email').value = item.client_email || '';
  document.getElementById('cli-endereco').value = item.client_address || '';
  document.getElementById('cli-cpf').value = item.client_cpf || '';
  document.getElementById('cli-prioridade').value = item.client_priority || 'Normal';
  document.getElementById('cli-profile-notes').value = item.client_profile_notes || '';
  document.getElementById('orc-titulo').value = item.title || '';
  document.getElementById('orc-desc').value = item.description || '';
  document.getElementById('orc-status').value = item.status || 'Pendente';
  document.getElementById('orc-vencimento').value = item.due_date || '';
  document.getElementById('orc-service-date').value = item.service_date || '';
  document.getElementById('orc-recurrence').value = item.recurrence_rule || '';
  document.getElementById('orc-auto-followup').value = item.auto_followup_enabled ? 'true' : 'false';
  document.getElementById('orc-auto-charge').value = item.auto_charge_enabled ? 'true' : 'false';
  document.getElementById('template-name').value = item.template_name || '';
  document.getElementById('orc-notes').value = item.internal_notes || '';
  document.getElementById('return-date').value = item.return_reminder_date || '';
  document.getElementById('calc-cost').value = item.price_cost || '';
  document.getElementById('calc-hours').value = item.price_hours || '';
  document.getElementById('calc-rate').value = item.price_hour_rate || '';
  document.getElementById('calc-displacement').value = item.price_displacement || '';

  document.getElementById('items-container').innerHTML = '';
  (item.items || []).forEach((row) => adicionarItem(row));
  if (!(item.items || []).length) adicionarItem();

  document.getElementById('checklist-container').innerHTML = '';
  parseChecklist(item.checklist).forEach((check) => adicionarChecklistItem(check));
  if (!parseChecklist(item.checklist).length) adicionarChecklistItem();

  renderHistoricoModal(item);
  calcularTotal();
  atualizarPreviewCalculo();
  preencherEmpresaModal();
  document.getElementById('modal').classList.add('open');
}

function renderHistoricoModal(item) {
  const grid = document.getElementById('history-grid');
  grid.style.display = 'grid';

  const history = item.client_history || [];
  const notes = item.client_notes_history || [];

  document.getElementById('modal-history-list').innerHTML = history.length
    ? history.map((entry) => `
        <div class="history-item">
          <strong>${escapeHtml(entry.title || 'Serviço')}</strong>
          <p>${brl(entry.total_value)} | ${escapeHtml(entry.status)} | ${fmtDate(entry.created_at)}</p>
        </div>
      `).join('')
    : `<div class="empty-state">Ainda não existe outro orçamento para este cliente.</div>`;

  document.getElementById('modal-notes-list').innerHTML = notes.length
    ? notes.map((entry) => `
        <div class="note-item">
          <strong>${fmtDate(entry.created_at)}</strong>
          <p>${escapeHtml(entry.note)}</p>
        </div>
      `).join('')
    : `<div class="empty-state">Nenhuma anotação salva ainda.</div>`;
}

function fecharModal() {
  document.getElementById('modal').classList.remove('open');
}

function adicionarItem(item = null) {
  const row = document.createElement('div');
  row.className = 'item-row';
  row.innerHTML = `
    <input type="text" placeholder="Descrição do item" value="${escapeHtml(item?.description || '')}" oninput="calcularTotal()" />
    <input type="number" min="0.01" step="any" placeholder="1" value="${item?.quantity ?? 1}" oninput="calcularTotal()" />
    <input type="number" min="0" step="0.01" placeholder="0,00" value="${item?.unit_price ?? ''}" oninput="calcularTotal()" />
    <button class="btn-del-item" onclick="this.closest('.item-row').remove(); calcularTotal();" title="Remover">
      <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>`;
  document.getElementById('items-container').appendChild(row);
}

function adicionarChecklistItem(item = null) {
  const row = document.createElement('div');
  row.className = 'checklist-row';
  row.innerHTML = `
    <input type="checkbox" ${item?.done ? 'checked' : ''} />
    <input type="text" placeholder="Ex: Confirmar horário com o cliente" value="${escapeHtml(item?.text || '')}" />
    <button class="btn-del-item" onclick="this.closest('.checklist-row').remove()" title="Remover">
      <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>`;
  document.getElementById('checklist-container').appendChild(row);
}

function coletarItems() {
  return [...document.querySelectorAll('#items-container .item-row')].map((row) => {
    const inputs = row.querySelectorAll('input');
    return {
      description: inputs[0]?.value.trim(),
      quantity: Number(inputs[1]?.value) || 0,
      unit_price: Number(inputs[2]?.value) || 0
    };
  }).filter((item) => item.description);
}

function coletarChecklist() {
  return [...document.querySelectorAll('#checklist-container .checklist-row')].map((row) => {
    const checkbox = row.querySelector('input[type="checkbox"]');
    const input = row.querySelector('input[type="text"]');
    return {
      text: input?.value.trim(),
      done: Boolean(checkbox?.checked)
    };
  }).filter((item) => item.text);
}

function calcularTotal() {
  const total = coletarItems().reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  document.getElementById('total-display').textContent = brl(total);
  return total;
}

function atualizarPreviewCalculo() {
  const materials = Number(document.getElementById('calc-cost').value) || 0;
  const hours = Number(document.getElementById('calc-hours').value) || 0;
  const rate = Number(document.getElementById('calc-rate').value) || 0;
  const displacement = Number(document.getElementById('calc-displacement').value) || 0;
  const preview = materials + (hours * rate) + displacement;
  document.getElementById('calc-preview').textContent = `Sugestao atual: ${brl(preview)}`;
}

['calc-cost', 'calc-hours', 'calc-rate', 'calc-displacement'].forEach((id) => {
  document.addEventListener('input', (event) => {
    if (event.target && event.target.id === id) atualizarPreviewCalculo();
  });
});

function aplicarCalculo() {
  const materials = Number(document.getElementById('calc-cost').value) || 0;
  const hours = Number(document.getElementById('calc-hours').value) || 0;
  const rate = Number(document.getElementById('calc-rate').value) || 0;
  const displacement = Number(document.getElementById('calc-displacement').value) || 0;
  const container = document.getElementById('items-container');
  container.innerHTML = '';

  if (materials) adicionarItem({ description: 'Materiais', quantity: 1, unit_price: materials });
  if (displacement) adicionarItem({ description: 'Deslocamento', quantity: 1, unit_price: displacement });
  if (hours && rate) adicionarItem({ description: 'Mão de obra', quantity: hours, unit_price: rate });
  if (!container.children.length) adicionarItem();

  calcularTotal();
  toast('Calculo aplicado aos itens.', 'info');
}

function obterCalculoPasta() {
  const materials = Number(document.getElementById('folder-calc-cost').value) || 0;
  const hours = Number(document.getElementById('folder-calc-hours').value) || 0;
  const rate = Number(document.getElementById('folder-calc-rate').value) || 0;
  const displacement = Number(document.getElementById('folder-calc-displacement').value) || 0;
  return {
    materials,
    hours,
    rate,
    displacement,
    total: materials + (hours * rate) + displacement,
  };
}

function atualizarCalculadoraPasta() {
  const calc = obterCalculoPasta();
  const preview = document.getElementById('folder-calc-preview');
  if (preview) preview.textContent = brl(calc.total);
}

['folder-calc-cost', 'folder-calc-hours', 'folder-calc-rate', 'folder-calc-displacement'].forEach((id) => {
  document.addEventListener('input', (event) => {
    if (event.target && event.target.id === id) atualizarCalculadoraPasta();
  });
});

function limparCalculadoraPasta() {
  ['folder-calc-cost', 'folder-calc-hours', 'folder-calc-rate', 'folder-calc-displacement'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  atualizarCalculadoraPasta();
}

function criarOrcamentoComCalculo() {
  const calc = obterCalculoPasta();
  if (!calc.total) {
    toast('Informe pelo menos um valor para calcular.', 'error');
    return;
  }

  abrirModalNovo();
  document.getElementById('calc-cost').value = calc.materials || '';
  document.getElementById('calc-hours').value = calc.hours || '';
  document.getElementById('calc-rate').value = calc.rate || '';
  document.getElementById('calc-displacement').value = calc.displacement || '';

  const container = document.getElementById('items-container');
  container.innerHTML = '';
  if (calc.materials) adicionarItem({ description: 'Materiais', quantity: 1, unit_price: calc.materials });
  if (calc.displacement) adicionarItem({ description: 'Deslocamento', quantity: 1, unit_price: calc.displacement });
  if (calc.hours && calc.rate) adicionarItem({ description: 'Mão de obra', quantity: calc.hours, unit_price: calc.rate });
  if (!container.children.length) adicionarItem({ description: 'Serviço calculado', quantity: 1, unit_price: calc.total });

  calcularTotal();
  mostrarEtapaModal('valores');
  toast('Valor calculado aplicado ao novo orçamento.', 'success');
}

function preencherPayload() {
  return {
    client_name: document.getElementById('cli-nome').value.trim(),
    client_whatsapp: document.getElementById('cli-tel').value.trim().replace(/\D/g, ''),
    client_email: document.getElementById('cli-email').value.trim(),
    client_address: document.getElementById('cli-endereco').value.trim(),
    client_cpf: document.getElementById('cli-cpf').value.trim(),
    client_priority: document.getElementById('cli-prioridade').value,
    client_profile_notes: document.getElementById('cli-profile-notes').value.trim(),
    client_note: document.getElementById('client-note').value.trim(),
    title: document.getElementById('orc-titulo').value.trim(),
    description: document.getElementById('orc-desc').value.trim(),
    status: document.getElementById('orc-status').value,
    due_date: document.getElementById('orc-vencimento').value || null,
    service_date: document.getElementById('orc-service-date').value || null,
    recurrence_rule: document.getElementById('orc-recurrence').value,
    auto_followup_enabled: document.getElementById('orc-auto-followup').value === 'true',
    auto_charge_enabled: document.getElementById('orc-auto-charge').value === 'true',
    template_name: document.getElementById('template-name').value.trim(),
    checklist: coletarChecklist(),
    internal_notes: document.getElementById('orc-notes').value.trim(),
    total_value: calcularTotal(),
    items: coletarItems(),
    price_cost: Number(document.getElementById('calc-cost').value) || 0,
    price_hours: Number(document.getElementById('calc-hours').value) || 0,
    price_hour_rate: Number(document.getElementById('calc-rate').value) || 0,
    price_displacement: Number(document.getElementById('calc-displacement').value) || 0,
    save_template: document.getElementById('save-template').value === 'true',
    template_validity_days: Number(document.getElementById('template-validity-days').value) || 7
  };
}

async function salvarOrcamento(options = {}) {
  const payload = preencherPayload();

  if (!payload.client_name) {
    mostrarEtapaModal('pdf');
    toast('Informe o nome do cliente.', 'error');
    return null;
  }
  if (!payload.title) {
    mostrarEtapaModal('servico');
    toast('Informe o título do serviço.', 'error');
    return null;
  }
  if ((payload.auto_followup_enabled || payload.auto_charge_enabled) && !payload.client_whatsapp) {
    mostrarEtapaModal('pdf');
    toast('Informe o WhatsApp do cliente para usar automações automáticas.', 'error');
    return null;
  }
  if (payload.auto_charge_enabled && !payload.due_date) {
    mostrarEtapaModal('servico');
    toast('Defina a data de vencimento para ativar a cobrança automática.', 'error');
    return null;
  }
  if (!payload.items.length) {
    mostrarEtapaModal('valores');
    toast('Adicione ao menos um item ao orçamento.', 'error');
    return null;
  }

  const id = document.getElementById('orc-id').value;
  const res = await fetch(id ? `/api/orcamentos/${id}` : '/api/orcamentos', {
    method: id ? 'PUT' : 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();

  if (!data.success) {
    toast(data.message || 'Não foi possível salvar.', 'error');
    return null;
  }

  if (document.getElementById('return-date').value) {
    await fetch(`/api/orcamentos/${data.id || id}/automation-event`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'return_scheduled', date: document.getElementById('return-date').value })
    });
  }

  toast(id ? 'Orçamento atualizado com sucesso.' : 'Orçamento criado com sucesso.', 'success');
  await carregarBase();
  if (!options.skipOnboardingRedirect) {
    voltarDashboardAposOnboarding();
  }
  return Number(data.id || id);
}

async function salvarEEnviar(kind) {
  const id = await salvarOrcamento({ skipOnboardingRedirect: true });
  if (!id) return;
  await enviarMensagemRapida(id, kind);
  if (!voltarDashboardAposOnboarding()) {
    fecharModal();
  }
}

async function obterLinks(id, markSent = false) {
  const res = await fetch(`/api/orcamentos/${id}/share-links`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ markSent })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Não foi possível gerar o link.');
  return data.data;
}

function mensagemWhatsApp(kind, orc, links, chargeData = null) {
  const empresa = _company.company_name || 'Central Simples';
  const nome = orc.client_name || 'cliente';
  const validade = fmtDate(orc.due_date);

  if (kind === 'budget') {
    const lines = [
      `Olá ${nome}!`,
      '',
      `Preparei seu orçamento para *${orc.title}*.`,
      'Abra o link abaixo para visualizar o valor, os detalhes do serviço e aprovar ou recusar o seu orçamento.',
    ];
    if (orc.due_date) {
      lines.push(`Validade da proposta: ${validade}`);
    }
    lines.push('');
    lines.push(`Link do orçamento: ${links.approval_url}`);
    lines.push('');
    lines.push('Fico à disposição para qualquer dúvida ou ajuste.');
    lines.push('');
    lines.push(`- ${empresa}`);
    return lines.join('\n');
  }
  if (kind === 'followup') {
    return `Olá ${nome}!\n\nPassando para acompanhar seu orçamento *${orc.title}*.\nSe estiver tudo certo, você pode aprovar por aqui: ${links.approval_url}\n\nFico à disposição para qualquer dúvida.\n\n- ${empresa}`;
  }
  if (kind === 'charge') {
    const chargeAmount = Number(chargeData?.amount ?? orc.total_value) || 0;
    const pixKey = chargeData?.pix_key || _company.pix_key || '';
    const receiverName = chargeData?.receiver_name || _company.pix_receiver_name || empresa;
    const chargeNote = chargeData?.note || _company.pix_message_suffix || 'Se já foi pago, pode desconsiderar.';
    const lines = [
      `Olá ${nome}!`,
      '',
      `Passando para lembrar o pagamento referente a *${orc.title}* no valor de *${brl(chargeAmount)}*.`
    ];
    if (orc.due_date) {
      lines.push(`Vencimento: ${validade}`);
    }
    if (pixKey) {
      lines.push('');
      lines.push(`Pix: ${pixKey}`);
    }
    if (receiverName) {
      lines.push(`Recebedor: ${receiverName}`);
    }
    lines.push('');
    lines.push(chargeNote);
    lines.push('');
    lines.push(`- ${empresa}`);
    return lines.join('\n');
  }
  if (kind === 'closing') {
    return `Olá ${nome}!\n\nObrigado por confiar no meu trabalho em *${orc.title}*.\nSe puder, me diga se ficou tudo certo. Posso te enviar novas opções sempre que você precisar.\n\n- ${empresa}`;
  }
  if (kind === 'return') {
    return `Olá ${nome}!\n\nEstou passando para lembrar da manutenção/retorno de *${orc.title}*.\nSe fizer sentido, eu posso montar um novo horário para você.\n\n- ${empresa}`;
  }
  return `Olá ${nome}!`;
}

async function enviarMensagemRapida(id, kind) {
  const orc = getOrcById(id) || (await (await fetch(`/api/orcamentos/${id}`, { credentials: 'same-origin' })).json()).data;
  const tel = String(orc.client_whatsapp || '').replace(/\D/g, '');
  if (!tel) {
    toast('Este cliente ainda não tem WhatsApp cadastrado.', 'error');
    return;
  }

  let chargeData = null;
  if (kind === 'charge') {
    chargeData = await solicitarDadosCobranca(orc);
    if (!chargeData) return;
  }

  let links = { approval_url: '', pdf_url: '' };
  if (['budget', 'followup'].includes(kind)) {
    links = await obterLinks(id, kind === 'budget');
  }

  const message = mensagemWhatsApp(kind, orc, links, chargeData);
  const whatsappUrl = `https://wa.me/${tel}?text=${encodeURIComponent(message)}`;
  const opened = window.open(whatsappUrl, '_blank', 'noopener');
  if (!opened) window.location.href = whatsappUrl;

  if (kind === 'followup') {
    await registrarEvento(id, 'followup');
  } else if (kind === 'charge') {
    await registrarEvento(id, 'charge_sent');
  } else if (kind === 'closing') {
    await registrarEvento(id, 'closing_sent');
  } else if (kind === 'return') {
    await registrarEvento(id, 'return_scheduled', addDays(todayIso(), 180));
  }

  await carregarBase();
}

async function registrarEvento(id, kind, date = null) {
  await fetch(`/api/orcamentos/${id}/automation-event`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, date })
  });
}

async function copiarLinkAprovacao(id) {
  try {
    const links = await obterLinks(id, false);
    await navigator.clipboard.writeText(links.approval_url);
    toast('Link público copiado.', 'success');
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function copiarLinkSeExistir() {
  const id = document.getElementById('orc-id').value;
  if (!id) {
    toast('Salve o orçamento primeiro para gerar o link.', 'info');
    return;
  }
  await copiarLinkAprovacao(id);
}

function aplicarTemplateSelecionado() {
  const id = document.getElementById('modal-template-select').value;
  if (!id) return;
  aplicarTemplateAoFormulario(id);
}

function aplicarTemplateAoFormulario(id) {
  const tpl = getTemplateById(id);
  if (!tpl) return;
  document.getElementById('template-name').value = tpl.name || '';
  document.getElementById('orc-titulo').value = tpl.title || '';
  document.getElementById('orc-desc').value = tpl.description || '';
  document.getElementById('orc-vencimento').value = addDays(todayIso(), Number(tpl.default_validity_days) || 7);
  document.getElementById('template-validity-days').value = tpl.default_validity_days || 7;
  document.getElementById('items-container').innerHTML = '';
  (tpl.items || []).forEach((item) => adicionarItem(item));
  if (!(tpl.items || []).length) adicionarItem();
  document.getElementById('checklist-container').innerHTML = '';
  (tpl.checklist || []).forEach((item) => adicionarChecklistItem(item));
  if (!(tpl.checklist || []).length) adicionarChecklistItem();
  calcularTotal();
  toast('Modelo aplicado ao formulário.', 'success');
}

function usarModeloNoNovo(id) {
  const tpl = getTemplateById(id);
  if (!tpl) {
    toast('Modelo não encontrado.', 'error');
    return;
  }

  fecharJanelaFuncionalidade();
  setTimeout(() => {
    abrirModalNovo();
    document.getElementById('modal-template-select').value = id;
    aplicarTemplateAoFormulario(id);
    mostrarEtapaModal('pdf');
  }, 80);
}

async function excluirTemplate(id) {
  const ok = await (window.CentralSimplesUi?.confirm?.({
    title: 'Excluir modelo salvo?',
    message: 'Este modelo não aparecerá mais na lista de modelos rápidos.',
    confirmText: 'Excluir modelo',
  }) ?? Promise.resolve(confirm('Excluir este modelo salvo?')));
  if (!ok) return;
  const res = await fetch(`/api/orcamentos/templates/${id}`, {
    method: 'DELETE',
    credentials: 'same-origin'
  });
  const data = await res.json();
  if (!data.success) {
    toast(data.message || 'Não foi possível excluir.', 'error');
    return;
  }
  toast('Modelo removido.', 'success');
  await carregarBase();
}

async function duplicarOrcamento(id) {
  const res = await fetch(`/api/orcamentos/${id}/duplicate`, {
    method: 'POST',
    credentials: 'same-origin'
  });
  const data = await res.json();
  if (!data.success) {
    toast(data.message || 'Não foi possível duplicar.', 'error');
    return;
  }
  toast('Orçamento duplicado.', 'success');
  await carregarBase();
  await abrirModalEditar(data.id);
}

async function gerarRecorrencia(id) {
  const res = await fetch(`/api/orcamentos/${id}/generate-recurrence`, {
    method: 'POST',
    credentials: 'same-origin'
  });
  const data = await res.json();
  if (!data.success) {
    toast(data.message || 'Não foi possível gerar a recorrência.', 'error');
    return;
  }
  toast(`Nova recorrência criada para ${fmtDate(data.generated_for)}.`, 'success');
  await carregarBase();
}

async function excluirOrcamento(id) {
  const ok = await (window.CentralSimplesUi?.confirm?.({
    title: 'Excluir orçamento?',
    message: 'Esta ação não pode ser desfeita. O PDF, itens e histórico deste orçamento serão removidos.',
    confirmText: 'Excluir orçamento',
  }) ?? Promise.resolve(confirm('Excluir este orçamento? Esta ação não pode ser desfeita.')));
  if (!ok) return;
  const res = await fetch(`/api/orcamentos/${id}`, {
    method: 'DELETE',
    credentials: 'same-origin'
  });
  const data = await res.json();
  if (!data.success) {
    toast(data.message || 'Não foi possível excluir.', 'error');
    return;
  }
  toast('Orçamento excluído.', 'success');
  await carregarBase();
}

async function executarAgenda(id, kind) {
  if (kind === 'scheduled_charge') {
    editarCobrancaProgramada(id);
    return;
  }
  if (kind === 'recurrence') {
    await gerarRecorrencia(id);
    return;
  }
  if (kind === 'charge') {
    await enviarMensagemRapida(id, 'charge');
    return;
  }
  if (kind === 'closing') {
    await enviarMensagemRapida(id, 'closing');
    return;
  }
  if (kind === 'return') {
    await enviarMensagemRapida(id, 'return');
    return;
  }
  await enviarMensagemRapida(id, 'followup');
}
