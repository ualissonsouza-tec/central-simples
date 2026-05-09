// server.js — Central Simples
// ─────────────────────────────────────────────────────────────────────────────
// Execute com: node server.js
// ─────────────────────────────────────────────────────────────────────────────

// ============================================================================
// MAPA DE MANUTENCAO
// 1. Ambiente e seguranca basica
// 2. Banco e dependencias de rotas
// 3. Middlewares globais
// 4. Arquivos estaticos e paginas HTML
// 5. APIs publicas e protegidas
// 6. Tratamento de erro e inicializacao
// ============================================================================

// ----------------------------------------------------------------------------
// 1. Ambiente e seguranca basica
// ----------------------------------------------------------------------------
require('dotenv').config();

const express      = require('express');
const cookieParser = require('cookie-parser');
const jwt          = require('jsonwebtoken');
const path         = require('path');
const { isSameOrigin, publicError } = require('./lib/security');

// ── Valida variáveis obrigatórias ─────────────────────────────────────────────
['MASTER_PASSWORD', 'JWT_SECRET'].forEach(k => {
  if (!process.env[k]) {
    console.error(`[ENV] Variável obrigatória ausente: ${k}`);
    process.exit(1);
  }
});

if (process.env.NODE_ENV === 'production') {
  if (String(process.env.JWT_SECRET || '').length < 32) {
    console.error('[ENV] JWT_SECRET precisa ter pelo menos 32 caracteres em producao.');
    process.exit(1);
  }
  if (String(process.env.MASTER_PASSWORD || '').length < 12) {
    console.error('[ENV] MASTER_PASSWORD precisa ter pelo menos 12 caracteres em producao.');
    process.exit(1);
  }
}

// ----------------------------------------------------------------------------
// 2. Banco e dependencias de rotas
// ----------------------------------------------------------------------------
// ── Banco de dados ────────────────────────────────────────────────────────────
require('./db/database');

// ── Middlewares ───────────────────────────────────────────────────────────────
const requireAuth   = require('./middleware/requireAuth');
const authRoutes    = require('./routes/auth');
const companyRoutes = require('./routes/company');
const orcRoutes     = require('./routes/orcamentos');
const clientRoutes  = require('./routes/clients');
const publicOrcRoutes = require('./routes/publicOrcamentos');
const scheduledChargeRoutes = require('./routes/scheduledCharges');
const notificationRoutes = require('./routes/notifications');
const billingRoutes = require('./routes/billing');
const { getBillingStatusForUserId } = require('./lib/billing');
const { startAutomationEngine } = require('./lib/automationEngine');

const app  = express();
const PORT = process.env.PORT || 3000;

// ----------------------------------------------------------------------------
// 3. Middlewares globais do Express
// ----------------------------------------------------------------------------
app.disable('x-powered-by');
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.use(express.json({ limit: '512kb' }));
app.use(express.urlencoded({ extended: true, limit: '512kb' }));
app.use(cookieParser());

app.use((req, res, next) => {
  const unsafeMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  if (!unsafeMethod || isSameOrigin(req)) return next();

  return res.status(403).json({
    success: false,
    message: 'Origem da requisicao nao permitida.',
  });
});

// ----------------------------------------------------------------------------
// 4. Arquivos estaticos e paginas HTML
// ----------------------------------------------------------------------------
// Rotas HTML protegidas precisam vir antes do express.static. Caso contrario,
// dashboard.html e orcamentos.html poderiam ser entregues sem requireAuth.

// Paginas publicas necessarias antes do login.
['login', 'reset-password', 'aprovacao', 'privacidade'].forEach(page => {
  app.get(`/${page}.html`, (req, res) =>
    res.sendFile(path.join(__dirname, 'public', `${page}.html`))
  );
});

// Raiz redireciona para dashboard.
app.get(['/', '/index.html'], requireAuth, (req, res) =>
  res.redirect('/dashboard.html')
);

// Paginas protegidas.
['dashboard', 'configuracoes', 'orcamentos', 'planos', 'pagamento'].forEach(page => {
  app.get(`/${page}.html`, requireAuth, (req, res) =>
    res.sendFile(path.join(__dirname, 'public', `${page}.html`))
  );
});

// Assets publicos: CSS, JS, manifest, service worker e imagens do PWA.
app.use(express.static(path.join(__dirname, 'public'), {
  index: false,
  redirect: false,
}));

// Uploads de logo protegidos por sessao. A logo publica do cliente passa pela
// rota tokenizada /api/public/orcamentos/:token/logo.
app.use('/uploads', requireAuth, express.static(path.join(__dirname, 'uploads'), {
  index: false,
  redirect: false,
}));

// ----------------------------------------------------------------------------
// 5. APIs publicas e protegidas
// ----------------------------------------------------------------------------
// ── API PÚBLICA ───────────────────────────────────────────────────────────────
app.use('/api', authRoutes);
app.use('/api/public/orcamentos', publicOrcRoutes);

// ── API /me — retorna dados do usuário logado (para exibir nome no dashboard) ─
app.get('/api/me', requireAuth, async (req, res) => {
  const billing = await getBillingStatusForUserId(req.user?.userId ?? null);
  res.json({
    success:  true,
    username: req.user.username || process.env.MASTER_USERNAME || 'admin',
    role:     req.user.role     || 'master',
    plan:     billing.plan,
    billing,
  });
});

// ── API PROTEGIDAS ────────────────────────────────────────────────────────────
app.use('/api/company',    companyRoutes);
app.use('/api/orcamentos', orcRoutes);
app.use('/api/clients',    clientRoutes);
app.use('/api/cobrancas-programadas', scheduledChargeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/billing', billingRoutes);

// ----------------------------------------------------------------------------
// 6. Fallback, erro global e inicializacao do servidor
// ----------------------------------------------------------------------------
// ── CATCH-ALL ─────────────────────────────────────────────────────────────────
// Rotas de API inexistentes retornam 404 JSON (não redireciona)
// Tudo o mais redireciona para o dashboard
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'Rota não encontrada.' });
  }
  res.redirect('/dashboard.html');
});

// ── ERRO GLOBAL ───────────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[ERRO]', err.message);
  res.status(err.status || 500).json({ success: false, message: publicError(err) });
});

// ── INICIAR ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║       Central Simples v2.0           ║');
  console.log('  ╠══════════════════════════════════════╣');
  console.log(`  ║  http://localhost:${PORT}               ║`);
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');
});

startAutomationEngine();
