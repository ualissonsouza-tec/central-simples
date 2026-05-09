// ============================================================================
// REGRAS DE PLANOS E ASSINATURAS
// Define trial, recursos premium, bloqueios e pagamentos simulados/pendentes.
// ============================================================================

// ----------------------------------------------------------------------------
// 1. Banco e catalogo de planos
// ----------------------------------------------------------------------------
const db = require('../db/database');

const TRIAL_DAYS = 15;

const PLANS = {
  essential: {
    id: 'essential',
    name: 'Essencial',
    priceCents: 2990,
    priceLabel: 'R$ 29,90',
    cycle: 'mensal',
    recommended: false,
    tagline: 'Para começar organizado e profissional.',
    features: [
      'Clientes organizados',
      'Orçamentos profissionais em PDF',
      'Envio manual pelo WhatsApp',
      'Perfil com logo e Pix',
      'Agenda do dinheiro simples',
    ],
    featureKeys: ['core', 'pdf', 'manual_whatsapp', 'company_profile'],
  },
  professional: {
    id: 'professional',
    name: 'Profissional',
    priceCents: 3990,
    priceLabel: 'R$ 39,90',
    cycle: 'mensal',
    recommended: true,
    tagline: 'O melhor custo-benefício para autônomos.',
    features: [
      'Tudo do Essencial',
      'Cobranças automáticas por cliente',
      'Follow-up automático',
      'Modelos por profissão',
      'Histórico completo do cliente',
      'Avisos quando o cliente aprovar ou recusar',
    ],
    featureKeys: [
      'core',
      'pdf',
      'manual_whatsapp',
      'company_profile',
      'automations',
      'scheduled_charges',
      'templates',
      'client_history',
      'notifications',
    ],
  },
};

const PLAN_ALIASES = {
  premium: 'professional',
};

// ----------------------------------------------------------------------------
// 2. Helpers de banco e datas
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

function toIsoSql(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function addDays(date, days) {
  const copy = new Date(date.getTime());
  copy.setDate(copy.getDate() + days);
  return copy;
}

function addMonths(date, months) {
  const copy = new Date(date.getTime());
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

function parseSqlDate(value) {
  if (!value) return null;
  const parsed = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// ----------------------------------------------------------------------------
// 3. Catalogo publico de planos
// ----------------------------------------------------------------------------
function publicPlan(plan) {
  return {
    id: plan.id,
    name: plan.name,
    priceCents: plan.priceCents,
    priceLabel: plan.priceLabel,
    cycle: plan.cycle,
    recommended: plan.recommended,
    tagline: plan.tagline,
    features: plan.features,
  };
}

function getPlans() {
  return Object.values(PLANS).map(publicPlan);
}

function getPlan(planId) {
  const id = String(planId || '').trim();
  return PLANS[id] || PLANS[PLAN_ALIASES[id]] || null;
}

// ----------------------------------------------------------------------------
// 4. Trial, status de assinatura e permissoes de recurso
// ----------------------------------------------------------------------------
async function getUser(userId) {
  if (userId === null || userId === undefined) return null;
  return dbGet('SELECT * FROM users WHERE id = ? AND active = 1', [userId]);
}

async function ensureTrialForUser(user) {
  if (!user || (user.trial_started_at && user.trial_ends_at)) return user;

  const started = new Date();
  const ends = addDays(started, TRIAL_DAYS);
  await dbRun(
    `UPDATE users
     SET trial_started_at = ?, trial_ends_at = ?, subscription_status = COALESCE(subscription_status, 'trialing'),
         updated_at = datetime('now')
     WHERE id = ?`,
    [toIsoSql(started), toIsoSql(ends), user.id]
  );

  return {
    ...user,
    trial_started_at: toIsoSql(started),
    trial_ends_at: toIsoSql(ends),
    subscription_status: user.subscription_status || 'trialing',
  };
}

function buildStatus(user) {
  if (!user) {
    return {
      plan: 'master',
      planName: 'Master',
      status: 'active',
      active: true,
      trialActive: false,
      trialEndsAt: null,
      subscriptionEndsAt: null,
      daysRemaining: null,
      requiresPayment: false,
      features: ['all'],
      message: 'Acesso administrativo.',
    };
  }

  const now = new Date();
  const subscriptionPlan = getPlan(user.subscription_plan || user.plan);
  const subscriptionEndsAt = parseSqlDate(user.subscription_ends_at);
  const subscriptionActive =
    subscriptionPlan
    && user.subscription_status === 'active'
    && (!subscriptionEndsAt || subscriptionEndsAt >= now);

  if (subscriptionActive) {
    return {
      plan: subscriptionPlan.id,
      planName: subscriptionPlan.name,
      status: 'active',
      active: true,
      trialActive: false,
      trialEndsAt: user.trial_ends_at || null,
      subscriptionEndsAt: user.subscription_ends_at || null,
      daysRemaining: null,
      requiresPayment: false,
      features: subscriptionPlan.featureKeys,
      message: `Plano ${subscriptionPlan.name} ativo.`,
    };
  }

  const trialEndsAt = parseSqlDate(user.trial_ends_at);
  const trialActive = trialEndsAt && trialEndsAt >= now;
  if (trialActive) {
    const msPerDay = 24 * 60 * 60 * 1000;
    return {
      plan: 'trial',
      planName: 'Teste grátis',
      status: 'trialing',
      active: true,
      trialActive: true,
      trialEndsAt: user.trial_ends_at || null,
      subscriptionEndsAt: user.subscription_ends_at || null,
      daysRemaining: Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / msPerDay)),
      requiresPayment: false,
      features: PLANS.professional.featureKeys,
      message: 'Teste grátis ativo com todos os recursos liberados.',
    };
  }

  return {
    plan: user.subscription_plan || user.plan || 'free',
    planName: 'Sem plano ativo',
    status: 'expired',
    active: false,
    trialActive: false,
    trialEndsAt: user.trial_ends_at || null,
    subscriptionEndsAt: user.subscription_ends_at || null,
    daysRemaining: 0,
    requiresPayment: true,
    features: [],
    message: 'Seu teste grátis terminou. Escolha um plano para continuar usando os recursos.',
  };
}

async function getBillingStatusForUserId(userId) {
  const user = await ensureTrialForUser(await getUser(userId));
  return buildStatus(user);
}

function hasFeature(status, featureKey) {
  if (!featureKey) return Boolean(status?.active);
  if (status?.features?.includes('all')) return true;
  return Boolean(status?.active && status.features?.includes(featureKey));
}

// ----------------------------------------------------------------------------
// 5. Checkout e historico de pagamentos
// ----------------------------------------------------------------------------
async function createCheckout({ userId, planId, paymentMethod, payer }) {
  const plan = getPlan(planId);
  if (!plan) {
    const err = new Error('Plano inválido.');
    err.status = 400;
    throw err;
  }

  const cleanPaymentMethod = ['pix', 'boleto', 'card'].includes(paymentMethod) ? paymentMethod : 'pix';
  const payerJson = JSON.stringify({
    name: String(payer?.name || '').trim(),
    document: String(payer?.document || '').trim(),
    email: String(payer?.email || '').trim().toLowerCase(),
    whatsapp: String(payer?.whatsapp || '').trim(),
    cep: String(payer?.cep || '').trim(),
    address: String(payer?.address || '').trim(),
    city: String(payer?.city || '').trim(),
    state: String(payer?.state || '').trim().toUpperCase().slice(0, 2),
    card_last4: String(payer?.card_last4 || '').trim().slice(-4),
  });

  const localAutoApprove = process.env.NODE_ENV !== 'production'
    || String(process.env.BILLING_LOCAL_AUTO_APPROVE || '') === '1';
  const status = localAutoApprove ? 'approved_local' : 'pending_gateway';

  const payment = await dbRun(
    `INSERT INTO subscription_payments (
       user_id, plan, amount_cents, currency, payment_method, status, payer_json, created_at, updated_at
     ) VALUES (?, ?, ?, 'BRL', ?, ?, ?, datetime('now'), datetime('now'))`,
    [userId, plan.id, plan.priceCents, cleanPaymentMethod, status, payerJson]
  );

  if (localAutoApprove) {
    const started = new Date();
    const ends = addMonths(started, 1);
    await dbRun(
      `UPDATE users
       SET plan = ?, subscription_plan = ?, subscription_status = 'active',
           subscription_started_at = ?, subscription_ends_at = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [plan.id, plan.id, toIsoSql(started), toIsoSql(ends), userId]
    );
  }

  return {
    id: payment.lastID,
    plan: publicPlan(plan),
    status,
    localAutoApprove,
  };
}

async function listPayments(userId) {
  return dbAll(
    `SELECT id, plan, amount_cents, currency, payment_method, status, external_reference,
            created_at, updated_at
     FROM subscription_payments
     WHERE user_id IS ?
     ORDER BY datetime(created_at) DESC
     LIMIT 12`,
    [userId]
  );
}

module.exports = {
  TRIAL_DAYS,
  getPlans,
  getPlan,
  getBillingStatusForUserId,
  hasFeature,
  createCheckout,
  listPayments,
  ensureTrialForUser,
};
