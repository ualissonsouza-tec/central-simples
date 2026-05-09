// ============================================================================
// BANCO DE DADOS - SQLITE LOCAL
// Responsavel por criar tabelas, aplicar migracoes simples e exportar a conexao.
// Quando migrarmos para PostgreSQL, este arquivo vira a principal referencia.
// ============================================================================

// ----------------------------------------------------------------------------
// 1. Imports e caminho do arquivo do banco
// ----------------------------------------------------------------------------
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, '..', 'central_simples.db');

const DB_DIR = path.dirname(DB_PATH);
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('[DB] Erro:', err.message);
    process.exit(1);
  }
  console.log('[DB] Conectado em:', DB_PATH);
});

// ----------------------------------------------------------------------------
// 2. Helper de migracao incremental
// ----------------------------------------------------------------------------
function addCol(table, col, def, done = () => {}) {
  db.all(`PRAGMA table_info(${table})`, (err, cols) => {
    if (err || !cols) {
      done();
      return;
    }
    if (cols.some((item) => item.name === col)) {
      done();
      return;
    }

    db.run(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`, (runErr) => {
      if (runErr) {
        console.error(`[DB] Migracao ${table}.${col}:`, runErr.message);
        done();
        return;
      }
      console.log(`[DB] Coluna adicionada: ${table}.${col}`);
      done();
    });
  });
}

function runMigrationsSequentially(migrations, done = () => {}) {
  let index = 0;

  function next() {
    if (index >= migrations.length) {
      done();
      return;
    }

    const [table, col, def] = migrations[index];
    index += 1;
    addCol(table, col, def, next);
  }

  next();
}

function createIndex(sql) {
  db.run(sql, (err) => {
    if (err) console.error('[DB] Indice:', err.message);
  });
}

// ----------------------------------------------------------------------------
// 3. Configuracao, schema inicial, migracoes e indices
// ----------------------------------------------------------------------------
db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA busy_timeout = 5000');
  db.run('PRAGMA temp_store = MEMORY');

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    email         TEXT NOT NULL UNIQUE,
    document_type TEXT DEFAULT '',
    document_number TEXT DEFAULT '',
    password_hash TEXT NOT NULL,
    plan          TEXT NOT NULL DEFAULT 'free',
    trial_started_at TEXT DEFAULT NULL,
    trial_ends_at TEXT DEFAULT NULL,
    subscription_plan TEXT DEFAULT '',
    subscription_status TEXT NOT NULL DEFAULT 'trialing',
    subscription_started_at TEXT DEFAULT NULL,
    subscription_ends_at TEXT DEFAULT NULL,
    signup_ip_hash TEXT DEFAULT '',
    signup_device_hash TEXT DEFAULT '',
    privacy_accepted_at TEXT DEFAULT NULL,
    privacy_version TEXT DEFAULT '',
    active        INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  // Tabelas principais do SaaS
  db.run(`CREATE TABLE IF NOT EXISTS company_profile (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL DEFAULT 'Minha Empresa',
    logo_path    TEXT DEFAULT NULL,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  db.run(`INSERT OR IGNORE INTO company_profile (id, company_name) VALUES (1, 'Central Simples')`);

  db.run(`CREATE TABLE IF NOT EXISTS clients (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    email      TEXT DEFAULT '',
    phone      TEXT DEFAULT '',
    whatsapp   TEXT DEFAULT '',
    address    TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  // Tabelas de orcamento, modelos e historico do cliente
  db.run(`CREATE TABLE IF NOT EXISTS orcamentos (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id   INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    description TEXT DEFAULT '',
    total_value REAL NOT NULL DEFAULT 0,
    status      TEXT NOT NULL DEFAULT 'Pendente',
    due_date    TEXT DEFAULT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS orcamento_items (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    orcamento_id INTEGER NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
    description  TEXT NOT NULL,
    quantity     REAL NOT NULL DEFAULT 1,
    unit_price   REAL NOT NULL DEFAULT 0,
    total        REAL GENERATED ALWAYS AS (quantity * unit_price) STORED
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS orcamento_templates (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id               INTEGER DEFAULT NULL,
    name                  TEXT NOT NULL,
    title                 TEXT NOT NULL DEFAULT '',
    description           TEXT DEFAULT '',
    items_json            TEXT NOT NULL DEFAULT '[]',
    checklist_json        TEXT NOT NULL DEFAULT '[]',
    default_validity_days INTEGER NOT NULL DEFAULT 7,
    created_at            TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS client_notes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER DEFAULT NULL,
    client_id  INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    note       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  // Tabelas de seguranca, cobrancas, notificacoes e assinatura
  db.run(`CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    used_at    TEXT DEFAULT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS scheduled_charges (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id           INTEGER DEFAULT NULL,
    client_id         INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    title             TEXT NOT NULL,
    amount            REAL NOT NULL DEFAULT 0,
    schedule_type     TEXT NOT NULL DEFAULT 'weekly',
    weekday           INTEGER DEFAULT NULL,
    interval_days     INTEGER DEFAULT NULL,
    next_run_at       TEXT DEFAULT NULL,
    last_sent_at      TEXT DEFAULT NULL,
    active            INTEGER NOT NULL DEFAULT 1,
    pix_key           TEXT DEFAULT '',
    receiver_name     TEXT DEFAULT '',
    notes             TEXT DEFAULT '',
    last_error        TEXT DEFAULT '',
    created_at        TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS material_rules (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id              INTEGER DEFAULT NULL,
    client_id            INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    orcamento_id         INTEGER DEFAULT NULL REFERENCES orcamentos(id) ON DELETE SET NULL,
    title                TEXT NOT NULL,
    service_type         TEXT DEFAULT '',
    area_total           REAL NOT NULL DEFAULT 0,
    area_done            REAL NOT NULL DEFAULT 0,
    daily_area           REAL NOT NULL DEFAULT 0,
    loss_percent         REAL NOT NULL DEFAULT 10,
    delivery_days        INTEGER NOT NULL DEFAULT 1,
    safety_days          INTEGER NOT NULL DEFAULT 1,
    workdays_json        TEXT NOT NULL DEFAULT '[1,2,3,4,5]',
    materials_json       TEXT NOT NULL DEFAULT '[]',
    owner_whatsapp       TEXT DEFAULT '',
    active               INTEGER NOT NULL DEFAULT 1,
    last_request_sent_at TEXT DEFAULT NULL,
    last_alerted_at      TEXT DEFAULT NULL,
    last_error           TEXT DEFAULT '',
    created_at           TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS notifications (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER DEFAULT NULL,
    kind        TEXT NOT NULL DEFAULT 'info',
    title       TEXT NOT NULL,
    body        TEXT DEFAULT '',
    entity_type TEXT DEFAULT '',
    entity_id   INTEGER DEFAULT NULL,
    action_url  TEXT DEFAULT '',
    read_at     TEXT DEFAULT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS push_subscriptions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER DEFAULT NULL,
    endpoint   TEXT NOT NULL UNIQUE,
    p256dh     TEXT NOT NULL,
    auth       TEXT NOT NULL,
    user_agent TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS subscription_payments (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id            INTEGER DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
    plan               TEXT NOT NULL,
    amount_cents       INTEGER NOT NULL DEFAULT 0,
    currency           TEXT NOT NULL DEFAULT 'BRL',
    payment_method     TEXT NOT NULL DEFAULT 'pix',
    status             TEXT NOT NULL DEFAULT 'pending_gateway',
    payer_json         TEXT NOT NULL DEFAULT '{}',
    external_reference TEXT DEFAULT '',
    gateway_payload    TEXT NOT NULL DEFAULT '{}',
    created_at         TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE INDEX IF NOT EXISTS idx_templates_user_name ON orcamento_templates(user_id, name)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_scheduled_charges_user_client ON scheduled_charges(user_id, client_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_scheduled_charges_next_run ON scheduled_charges(active, next_run_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id, expires_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON notifications(user_id, read_at, created_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id, updated_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_subscription_payments_user_created ON subscription_payments(user_id, created_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_material_rules_user_client ON material_rules(user_id, client_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_material_rules_active_user ON material_rules(active, user_id, updated_at)`);

  console.log('[DB] Tabelas verificadas.');

  // Migracoes leves para bancos locais antigos que ainda nao possuem colunas novas.
  const migrations = [
    ['clients', 'user_id', 'INTEGER DEFAULT NULL'],
    ['clients', 'cpf', "TEXT DEFAULT ''"],
    ['clients', 'priority_tag', "TEXT NOT NULL DEFAULT 'Normal'"],
    ['clients', 'notes', "TEXT DEFAULT ''"],
    ['clients', 'last_contact_at', 'TEXT DEFAULT NULL'],
    ['clients', 'updated_at', 'TEXT DEFAULT NULL'],
    ['users', 'trial_started_at', 'TEXT DEFAULT NULL'],
    ['users', 'trial_ends_at', 'TEXT DEFAULT NULL'],
    ['users', 'document_type', "TEXT DEFAULT ''"],
    ['users', 'document_number', "TEXT DEFAULT ''"],
    ['users', 'subscription_plan', "TEXT DEFAULT ''"],
    ['users', 'subscription_status', "TEXT NOT NULL DEFAULT 'trialing'"],
    ['users', 'subscription_started_at', 'TEXT DEFAULT NULL'],
    ['users', 'subscription_ends_at', 'TEXT DEFAULT NULL'],
    ['users', 'signup_ip_hash', "TEXT DEFAULT ''"],
    ['users', 'signup_device_hash', "TEXT DEFAULT ''"],
    ['users', 'privacy_accepted_at', 'TEXT DEFAULT NULL'],
    ['users', 'privacy_version', "TEXT DEFAULT ''"],
    ['orcamentos', 'user_id', 'INTEGER DEFAULT NULL'],
    ['orcamentos', 'approval_token', 'TEXT DEFAULT NULL'],
    ['orcamentos', 'approval_sent_at', 'TEXT DEFAULT NULL'],
    ['orcamentos', 'approved_at', 'TEXT DEFAULT NULL'],
    ['orcamentos', 'rejected_at', 'TEXT DEFAULT NULL'],
    ['orcamentos', 'client_decision_note', "TEXT DEFAULT ''"],
    ['orcamentos', 'last_whatsapp_sent_at', 'TEXT DEFAULT NULL'],
    ['orcamentos', 'last_follow_up_at', 'TEXT DEFAULT NULL'],
    ['orcamentos', 'follow_up_stage', 'INTEGER NOT NULL DEFAULT 0'],
    ['orcamentos', 'recurrence_rule', "TEXT DEFAULT ''"],
    ['orcamentos', 'recurrence_next_date', 'TEXT DEFAULT NULL'],
    ['orcamentos', 'template_name', "TEXT DEFAULT ''"],
    ['orcamentos', 'checklist_json', "TEXT NOT NULL DEFAULT '[]'"],
    ['orcamentos', 'internal_notes', "TEXT DEFAULT ''"],
    ['orcamentos', 'service_date', 'TEXT DEFAULT NULL'],
    ['orcamentos', 'reminder_sent_at', 'TEXT DEFAULT NULL'],
    ['orcamentos', 'closing_message_sent_at', 'TEXT DEFAULT NULL'],
    ['orcamentos', 'return_reminder_date', 'TEXT DEFAULT NULL'],
    ['orcamentos', 'price_cost', 'REAL NOT NULL DEFAULT 0'],
    ['orcamentos', 'price_hours', 'REAL NOT NULL DEFAULT 0'],
    ['orcamentos', 'price_hour_rate', 'REAL NOT NULL DEFAULT 0'],
    ['orcamentos', 'price_displacement', 'REAL NOT NULL DEFAULT 0'],
    ['orcamentos', 'auto_followup_enabled', 'INTEGER NOT NULL DEFAULT 1'],
    ['orcamentos', 'auto_charge_enabled', 'INTEGER NOT NULL DEFAULT 0'],
    ['orcamentos', 'last_automation_error', "TEXT DEFAULT ''"],
    ['company_profile', 'user_id', 'INTEGER DEFAULT NULL'],
    ['company_profile', 'pix_key', "TEXT DEFAULT ''"],
    ['company_profile', 'pix_receiver_name', "TEXT DEFAULT ''"],
    ['company_profile', 'pix_message_suffix', "TEXT DEFAULT ''"],
    ['material_rules', 'last_error', "TEXT DEFAULT ''"],
    ['material_rules', 'last_alerted_at', 'TEXT DEFAULT NULL'],
  ];

  // Indices de performance para login, listagens, automacoes e futura migracao.
  setTimeout(() => {
    runMigrationsSequentially(migrations, () => {
      createIndex(`CREATE INDEX IF NOT EXISTS idx_clients_user_name ON clients(user_id, name)`);
      createIndex(`CREATE INDEX IF NOT EXISTS idx_clients_user_whatsapp ON clients(user_id, whatsapp)`);
      createIndex(`CREATE INDEX IF NOT EXISTS idx_client_notes_user_client_created ON client_notes(user_id, client_id, created_at)`);
      createIndex(`CREATE INDEX IF NOT EXISTS idx_company_profile_user ON company_profile(user_id)`);
      createIndex(`CREATE INDEX IF NOT EXISTS idx_orcamento_items_orcamento ON orcamento_items(orcamento_id)`);
      createIndex(`CREATE INDEX IF NOT EXISTS idx_orcamentos_user_status ON orcamentos(user_id, status, due_date)`);
      createIndex(`CREATE INDEX IF NOT EXISTS idx_orcamentos_user_created ON orcamentos(user_id, created_at)`);
      createIndex(`CREATE INDEX IF NOT EXISTS idx_orcamentos_followup_queue
        ON orcamentos(auto_followup_enabled, status, approval_sent_at, follow_up_stage)`);
      createIndex(`CREATE INDEX IF NOT EXISTS idx_orcamentos_charge_queue
        ON orcamentos(auto_charge_enabled, status, due_date, reminder_sent_at)`);
      createIndex(`CREATE INDEX IF NOT EXISTS idx_orcamentos_token ON orcamentos(approval_token)`);
      createIndex(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_document_number_unique
        ON users(document_number)
        WHERE document_number IS NOT NULL AND document_number <> ''`);
      createIndex(`CREATE INDEX IF NOT EXISTS idx_users_lower_username_active ON users(LOWER(username), active)`);
      createIndex(`CREATE INDEX IF NOT EXISTS idx_users_lower_email_active ON users(LOWER(email), active)`);
      createIndex(`CREATE INDEX IF NOT EXISTS idx_users_signup_ip_created ON users(signup_ip_hash, created_at)`);
      createIndex(`CREATE INDEX IF NOT EXISTS idx_users_signup_device_created ON users(signup_device_hash, created_at)`);
      createIndex(`CREATE INDEX IF NOT EXISTS idx_scheduled_charges_user_next_run ON scheduled_charges(user_id, active, next_run_at)`);
      createIndex(`CREATE INDEX IF NOT EXISTS idx_material_rules_user_active ON material_rules(user_id, active, updated_at)`);
      createIndex(`CREATE INDEX IF NOT EXISTS idx_material_rules_alert_queue ON material_rules(active, last_alerted_at, updated_at)`);
      db.run('PRAGMA optimize');
      db.run('PRAGMA foreign_keys = ON');
      console.log('[DB] Migracoes concluidas.');
    });
  }, 200);
});

// ----------------------------------------------------------------------------
// 4. Export da conexao compartilhada
// ----------------------------------------------------------------------------
module.exports = db;
