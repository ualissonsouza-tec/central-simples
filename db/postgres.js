// ============================================================================
// BANCO DE DADOS - POSTGRESQL/NEON
// Adaptador compatível com a API usada hoje pelo SQLite: get, all e run.
// ============================================================================

const { Pool, types } = require('pg');

types.setTypeParser(20, (value) => Number(value)); // int8/count
types.setTypeParser(1700, (value) => Number(value)); // numeric/decimal

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
  max: Number(process.env.PG_POOL_MAX || 5),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000,
});

const initStatements = [
  `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    document_type TEXT DEFAULT '',
    document_number TEXT DEFAULT '',
    password_hash TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'free',
    trial_started_at TIMESTAMPTZ DEFAULT NULL,
    trial_ends_at TIMESTAMPTZ DEFAULT NULL,
    subscription_plan TEXT DEFAULT '',
    subscription_status TEXT NOT NULL DEFAULT 'trialing',
    subscription_started_at TIMESTAMPTZ DEFAULT NULL,
    subscription_ends_at TIMESTAMPTZ DEFAULT NULL,
    signup_ip_hash TEXT DEFAULT '',
    signup_device_hash TEXT DEFAULT '',
    privacy_accepted_at TIMESTAMPTZ DEFAULT NULL,
    privacy_version TEXT DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS company_profile (
    id SERIAL PRIMARY KEY,
    user_id INTEGER DEFAULT NULL,
    company_name TEXT NOT NULL DEFAULT 'Minha Empresa',
    logo_path TEXT DEFAULT NULL,
    pix_key TEXT DEFAULT '',
    pix_receiver_name TEXT DEFAULT '',
    pix_message_suffix TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `INSERT INTO company_profile (id, company_name)
   VALUES (1, 'Central Simples')
   ON CONFLICT (id) DO NOTHING`,
  `SELECT setval(
    pg_get_serial_sequence('company_profile', 'id'),
    COALESCE((SELECT MAX(id) FROM company_profile), 1),
    true
  )`,
  `CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    user_id INTEGER DEFAULT NULL,
    name TEXT NOT NULL,
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    whatsapp TEXT DEFAULT '',
    address TEXT DEFAULT '',
    cpf TEXT DEFAULT '',
    priority_tag TEXT NOT NULL DEFAULT 'Normal',
    notes TEXT DEFAULT '',
    last_contact_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS orcamentos (
    id SERIAL PRIMARY KEY,
    user_id INTEGER DEFAULT NULL,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    total_value NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Pendente',
    due_date TIMESTAMPTZ DEFAULT NULL,
    approval_token TEXT DEFAULT NULL,
    approval_sent_at TIMESTAMPTZ DEFAULT NULL,
    approved_at TIMESTAMPTZ DEFAULT NULL,
    rejected_at TIMESTAMPTZ DEFAULT NULL,
    client_decision_note TEXT DEFAULT '',
    last_whatsapp_sent_at TIMESTAMPTZ DEFAULT NULL,
    last_follow_up_at TIMESTAMPTZ DEFAULT NULL,
    follow_up_stage INTEGER NOT NULL DEFAULT 0,
    recurrence_rule TEXT DEFAULT '',
    recurrence_next_date TIMESTAMPTZ DEFAULT NULL,
    template_name TEXT DEFAULT '',
    checklist_json TEXT NOT NULL DEFAULT '[]',
    internal_notes TEXT DEFAULT '',
    service_date TIMESTAMPTZ DEFAULT NULL,
    reminder_sent_at TIMESTAMPTZ DEFAULT NULL,
    closing_message_sent_at TIMESTAMPTZ DEFAULT NULL,
    return_reminder_date TIMESTAMPTZ DEFAULT NULL,
    price_cost NUMERIC NOT NULL DEFAULT 0,
    price_hours NUMERIC NOT NULL DEFAULT 0,
    price_hour_rate NUMERIC NOT NULL DEFAULT 0,
    price_displacement NUMERIC NOT NULL DEFAULT 0,
    auto_followup_enabled INTEGER NOT NULL DEFAULT 1,
    auto_charge_enabled INTEGER NOT NULL DEFAULT 0,
    last_automation_error TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS orcamento_items (
    id SERIAL PRIMARY KEY,
    orcamento_id INTEGER NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 1,
    unit_price NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED
  )`,
  `CREATE TABLE IF NOT EXISTS orcamento_templates (
    id SERIAL PRIMARY KEY,
    user_id INTEGER DEFAULT NULL,
    name TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    description TEXT DEFAULT '',
    items_json TEXT NOT NULL DEFAULT '[]',
    checklist_json TEXT NOT NULL DEFAULT '[]',
    default_validity_days INTEGER NOT NULL DEFAULT 7,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS client_notes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER DEFAULT NULL,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS scheduled_charges (
    id SERIAL PRIMARY KEY,
    user_id INTEGER DEFAULT NULL,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    schedule_type TEXT NOT NULL DEFAULT 'weekly',
    weekday INTEGER DEFAULT NULL,
    interval_days INTEGER DEFAULT NULL,
    next_run_at TIMESTAMPTZ DEFAULT NULL,
    last_sent_at TIMESTAMPTZ DEFAULT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    pix_key TEXT DEFAULT '',
    receiver_name TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    last_error TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS material_rules (
    id SERIAL PRIMARY KEY,
    user_id INTEGER DEFAULT NULL,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    orcamento_id INTEGER DEFAULT NULL REFERENCES orcamentos(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    service_type TEXT DEFAULT '',
    area_total NUMERIC NOT NULL DEFAULT 0,
    area_done NUMERIC NOT NULL DEFAULT 0,
    daily_area NUMERIC NOT NULL DEFAULT 0,
    loss_percent NUMERIC NOT NULL DEFAULT 10,
    delivery_days INTEGER NOT NULL DEFAULT 1,
    safety_days INTEGER NOT NULL DEFAULT 1,
    workdays_json TEXT NOT NULL DEFAULT '[1,2,3,4,5]',
    materials_json TEXT NOT NULL DEFAULT '[]',
    owner_whatsapp TEXT DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1,
    last_request_sent_at TIMESTAMPTZ DEFAULT NULL,
    last_alerted_at TIMESTAMPTZ DEFAULT NULL,
    last_error TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER DEFAULT NULL,
    kind TEXT NOT NULL DEFAULT 'info',
    title TEXT NOT NULL,
    body TEXT DEFAULT '',
    entity_type TEXT DEFAULT '',
    entity_id INTEGER DEFAULT NULL,
    action_url TEXT DEFAULT '',
    read_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER DEFAULT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS subscription_payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
    plan TEXT NOT NULL,
    amount_cents INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'BRL',
    payment_method TEXT NOT NULL DEFAULT 'pix',
    status TEXT NOT NULL DEFAULT 'pending_gateway',
    payer_json TEXT NOT NULL DEFAULT '{}',
    external_reference TEXT DEFAULT '',
    gateway_payload TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_templates_user_name ON orcamento_templates(user_id, name)`,
  `CREATE INDEX IF NOT EXISTS idx_scheduled_charges_user_client ON scheduled_charges(user_id, client_id)`,
  `CREATE INDEX IF NOT EXISTS idx_scheduled_charges_next_run ON scheduled_charges(active, next_run_at)`,
  `CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id, expires_at)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON notifications(user_id, read_at, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id, updated_at)`,
  `CREATE INDEX IF NOT EXISTS idx_subscription_payments_user_created ON subscription_payments(user_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_material_rules_user_client ON material_rules(user_id, client_id)`,
  `CREATE INDEX IF NOT EXISTS idx_material_rules_active_user ON material_rules(active, user_id, updated_at)`,
  `CREATE INDEX IF NOT EXISTS idx_clients_user_name ON clients(user_id, name)`,
  `CREATE INDEX IF NOT EXISTS idx_clients_user_whatsapp ON clients(user_id, whatsapp)`,
  `CREATE INDEX IF NOT EXISTS idx_client_notes_user_client_created ON client_notes(user_id, client_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_company_profile_user ON company_profile(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_orcamento_items_orcamento ON orcamento_items(orcamento_id)`,
  `CREATE INDEX IF NOT EXISTS idx_orcamentos_user_status ON orcamentos(user_id, status, due_date)`,
  `CREATE INDEX IF NOT EXISTS idx_orcamentos_user_created ON orcamentos(user_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_orcamentos_followup_queue ON orcamentos(auto_followup_enabled, status, approval_sent_at, follow_up_stage)`,
  `CREATE INDEX IF NOT EXISTS idx_orcamentos_charge_queue ON orcamentos(auto_charge_enabled, status, due_date, reminder_sent_at)`,
  `CREATE INDEX IF NOT EXISTS idx_orcamentos_token ON orcamentos(approval_token)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_document_number_unique
    ON users(document_number)
    WHERE document_number IS NOT NULL AND document_number <> ''`,
  `CREATE INDEX IF NOT EXISTS idx_users_lower_username_active ON users(LOWER(username), active)`,
  `CREATE INDEX IF NOT EXISTS idx_users_lower_email_active ON users(LOWER(email), active)`,
  `CREATE INDEX IF NOT EXISTS idx_users_signup_ip_created ON users(signup_ip_hash, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_users_signup_device_created ON users(signup_device_hash, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_scheduled_charges_user_next_run ON scheduled_charges(user_id, active, next_run_at)`,
  `CREATE INDEX IF NOT EXISTS idx_material_rules_user_active ON material_rules(user_id, active, updated_at)`,
  `CREATE INDEX IF NOT EXISTS idx_material_rules_alert_queue ON material_rules(active, last_alerted_at, updated_at)`,
];

let initPromise = null;

function normalizeSql(sql) {
  let text = String(sql || '').trim();

  text = text.replace(/datetime\('now'\s*,\s*\?\)/gi, "(NOW() + (?::interval))");
  text = text.replace(/datetime\('now'\s*,\s*'\+(\d+)\s+days?'\s*\)/gi, "(NOW() + INTERVAL '$1 days')");
  text = text.replace(/datetime\('now'\s*,\s*'\+(\d+)\s+hours?'\s*\)/gi, "(NOW() + INTERVAL '$1 hours')");
  text = text.replace(/datetime\('now'\s*,\s*'-(\d+)\s+hours?'\s*\)/gi, "(NOW() - INTERVAL '$1 hours')");
  text = text.replace(/datetime\('now'\)/gi, 'NOW()');
  text = text.replace(/datetime\(([^)]+)\)/gi, '$1');
  text = text.replace(/date\(([^)]+)\)/gi, 'DATE($1)');
  text = text.replace(/(\b[\w.]+\b)\s+IS\s+(?!NOT\b|NULL\b)(\b[\w.]+\b)/gi, '$1 IS NOT DISTINCT FROM $2');
  text = text.replace(/(\b[\w.]+\b)\s+IS\s+\?/gi, '$1 IS NOT DISTINCT FROM ?');

  return addPgPlaceholders(text);
}

function addPgPlaceholders(sql) {
  let index = 0;
  let inSingle = false;
  let inDouble = false;
  let output = '';

  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    const next = sql[i + 1];

    if (char === "'" && !inDouble) {
      output += char;
      if (inSingle && next === "'") {
        output += next;
        i += 1;
      } else {
        inSingle = !inSingle;
      }
      continue;
    }

    if (char === '"' && !inSingle) {
      inDouble = !inDouble;
      output += char;
      continue;
    }

    if (char === '?' && !inSingle && !inDouble) {
      index += 1;
      output += `$${index}`;
      continue;
    }

    output += char;
  }

  return output;
}

function shouldReturnId(sql) {
  return /^\s*INSERT\s+INTO\s+/i.test(sql) && !/\sRETURNING\s+/i.test(sql);
}

async function ensureReady() {
  if (!initPromise) {
    initPromise = (async () => {
      for (const statement of initStatements) {
        await pool.query(statement);
      }
      console.log('[DB] PostgreSQL conectado e schema verificado.');
    })().catch((err) => {
      console.error('[DB] PostgreSQL erro:', err.message);
      process.exit(1);
    });
  }
  return initPromise;
}

async function query(sql, params = []) {
  await ensureReady();
  const normalized = normalizeSql(sql);
  const text = shouldReturnId(normalized) ? `${normalized} RETURNING id` : normalized;
  return pool.query(text, params);
}

function normalizeArgs(params, callback) {
  if (typeof params === 'function') {
    return { params: [], callback: params };
  }

  return { params: Array.isArray(params) ? params : [], callback };
}

function all(sql, params = [], callback = () => {}) {
  const args = normalizeArgs(params, callback);
  query(sql, args.params)
    .then((result) => args.callback(null, result.rows))
    .catch((err) => args.callback(err));
}

function get(sql, params = [], callback = () => {}) {
  const args = normalizeArgs(params, callback);
  query(sql, args.params)
    .then((result) => args.callback(null, result.rows[0]))
    .catch((err) => args.callback(err));
}

function run(sql, params = [], callback = () => {}) {
  const args = normalizeArgs(params, callback);
  query(sql, args.params)
    .then((result) => {
      const ctx = {
        lastID: result.rows?.[0]?.id,
        changes: result.rowCount,
      };
      args.callback.call(ctx, null);
    })
    .catch((err) => args.callback(err));
}

function serialize(callback = () => {}) {
  callback();
}

if (process.env.POSTGRES_SKIP_INIT !== '1') {
  ensureReady();
}

module.exports = {
  all,
  get,
  run,
  serialize,
  _pool: pool,
  _normalizeSql: normalizeSql,
};
