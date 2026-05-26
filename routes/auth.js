// ============================================================================
// ROTAS DE AUTENTICACAO
// Login, cadastro, recuperacao de senha, cookies de sessao e logout.
// ============================================================================

// ----------------------------------------------------------------------------
// 1. Imports e dependencias
// ----------------------------------------------------------------------------
const crypto = require('crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { ensureTrialForUser, getBillingStatusForUserId, getTrialDays } = require('../lib/billing');
const { normalizeCpfCnpj } = require('../lib/documentValidator');
const { isConfigured: isEmailConfigured, sendPasswordResetEmail } = require('../lib/emailService');
const {
  checkRateLimit,
  getRequestIp,
  hashPassword,
  sha256,
  verifyPassword,
} = require('../lib/security');

const router = express.Router();

// ----------------------------------------------------------------------------
// 2. Helpers de banco, seguranca e sessao
// ----------------------------------------------------------------------------
function newResetToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function dbGet(sql, p = []) {
  return new Promise((ok, er) => db.get(sql, p, (e, r) => e ? er(e) : ok(r)));
}

function dbRun(sql, p = []) {
  return new Promise((ok, er) => db.run(sql, p, function runCallback(e) {
    e ? er(e) : ok({ lastID: this.lastID, changes: this.changes });
  }));
}

function clientKey(req) {
  return getRequestIp(req);
}

function envNumber(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getSignupWindowHours() {
  return Math.max(1, Math.floor(envNumber('SIGNUP_LIMIT_WINDOW_HOURS', 24)));
}

function getSignupLimit(name, fallback) {
  return Math.max(1, Math.floor(envNumber(name, fallback)));
}

function signupHash(...parts) {
  const pepper = process.env.SIGNUP_HASH_PEPPER || process.env.JWT_SECRET || 'central-simples-local';
  return sha256([pepper, ...parts.map((part) => String(part || '').trim().toLowerCase())].join(':'));
}

function getDeviceKey(req) {
  const deviceId = String(req.body?.device_id || '').trim().slice(0, 120);
  if (/^[a-zA-Z0-9._:-]{16,120}$/.test(deviceId)) {
    return signupHash('device', deviceId);
  }

  const userAgent = String(req.get('user-agent') || 'unknown').slice(0, 400);
  return signupHash('fallback-device', getRequestIp(req), userAgent);
}

function setCookie(res, token) {
  res.cookie('cs_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  });
}

function genericRecoveryResponse(res) {
  return res.json({
    success: true,
    message: 'Se este e-mail estiver cadastrado, voce recebera as instrucoes em breve.',
  });
}

// ----------------------------------------------------------------------------
// 3. Login
// ----------------------------------------------------------------------------
router.post('/login', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');

  if (!password) {
    return res.status(400).json({ success: false, message: 'Senha e obrigatoria.' });
  }

  if (!checkRateLimit(req, res, [
    { name: 'login-ip', limit: 60, windowMs: 15 * 60 * 1000 },
    { name: 'login-account', limit: 10, windowMs: 15 * 60 * 1000, key: `${clientKey(req)}:${username || 'legacy'}` },
  ])) return;

  // Pequeno atraso para reduzir ataque de tentativa automatizada sem afetar uso normal.
  await new Promise((resolve) => setTimeout(resolve, 350));

  try {
    const masterUser = (process.env.MASTER_USERNAME || 'admin').toLowerCase();
    const masterPass = process.env.MASTER_PASSWORD;

    const isUsernameMatch = !username || username.toLowerCase() === masterUser;
    if (isUsernameMatch && password === masterPass) {
      const token = jwt.sign(
        { role: 'master', username: masterUser, userId: null, plan: 'master' },
        process.env.JWT_SECRET,
        { expiresIn: '8h', algorithm: 'HS256' }
      );
      setCookie(res, token);
      return res.json({ success: true, role: 'master' });
    }

    if (!username) {
      return res.status(401).json({ success: false, message: 'Usuario ou senha incorretos.' });
    }

    const user = await dbGet(
      'SELECT * FROM users WHERE LOWER(username)=LOWER(?) AND active=1',
      [username]
    );

    const verification = verifyPassword(password, user?.password_hash);
    if (!user || !verification.ok) {
      return res.status(401).json({ success: false, message: 'Usuario ou senha incorretos.' });
    }

    if (verification.legacy) {
      await dbRun(
        `UPDATE users
         SET password_hash = ?, updated_at = datetime('now')
         WHERE id = ?`,
        [hashPassword(password), user.id]
      );
    }

    const trialUser = await ensureTrialForUser(user);
    const billing = await getBillingStatusForUserId(trialUser.id);
    const token = jwt.sign(
      { role: billing.plan, username: trialUser.username, userId: trialUser.id, plan: billing.plan },
      process.env.JWT_SECRET,
      { expiresIn: '8h', algorithm: 'HS256' }
    );
    setCookie(res, token);
    return res.json({ success: true, role: billing.plan, username: trialUser.username, billing });
  } catch (err) {
    console.error('[AUTH login]', err.message);
    return res.status(500).json({ success: false, message: 'Erro interno.' });
  }
});

// ----------------------------------------------------------------------------
// 4. Cadastro de usuario com CPF/CNPJ e limites anti-abuso
// ----------------------------------------------------------------------------
router.post('/register', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const documentInput = String(req.body.document || req.body.document_number || req.body.cpf_cnpj || '').trim();
  const password = String(req.body.password || '');
  const privacyAccepted = req.body.privacy_accepted === true
    || req.body.privacy_accepted === 'true'
    || req.body.privacy_accepted === 'on';
  const documentDigitsForLimit = documentInput.replace(/\D/g, '');

  if (!checkRateLimit(req, res, [
    { name: 'register-ip', limit: 20, windowMs: 60 * 60 * 1000 },
    { name: 'register-account', limit: 5, windowMs: 60 * 60 * 1000, key: `${clientKey(req)}:${username || email || 'empty'}` },
    { name: 'register-document', limit: 5, windowMs: 60 * 60 * 1000, key: `${clientKey(req)}:${documentDigitsForLimit || 'empty'}` },
  ])) return;

  if (!username || !email || !documentInput || !password) {
    return res.status(400).json({ success: false, message: 'Preencha todos os campos.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Senha deve ter pelo menos 8 caracteres.' });
  }
  if (!privacyAccepted) {
    return res.status(400).json({ success: false, message: 'Aceite a Politica de Privacidade para criar sua conta.' });
  }
  if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username)) {
    return res.status(400).json({ success: false, message: 'Usuario: 3 a 32 caracteres usando letras, numeros, ponto, underline ou hifen.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'E-mail invalido.' });
  }

  const documentData = normalizeCpfCnpj(documentInput);
  if (!documentData.ok) {
    return res.status(400).json({ success: false, message: documentData.message });
  }

  try {
    const signupWindowHours = getSignupWindowHours();
    const signupWindowModifier = `-${signupWindowHours} hours`;
    const signupIpHash = signupHash(getRequestIp(req));
    const signupDeviceHash = getDeviceKey(req);
    const maxPerIp = getSignupLimit('SIGNUP_MAX_PER_IP_WINDOW', 2);
    const maxPerDevice = getSignupLimit('SIGNUP_MAX_PER_DEVICE_WINDOW', 2);
    const privacyVersion = String(process.env.PRIVACY_VERSION || '2026-05-09').slice(0, 50);

    const exists = await dbGet(
      `SELECT id, document_number
       FROM users
       WHERE LOWER(username)=LOWER(?) OR LOWER(email)=LOWER(?) OR document_number=?
       LIMIT 1`,
      [username, email, documentData.digits]
    );
    if (exists) {
      if (exists.document_number === documentData.digits) {
        return res.status(409).json({ success: false, message: 'Este CPF/CNPJ ja possui cadastro no sistema.' });
      }
      return res.status(409).json({ success: false, message: 'Usuario ou e-mail ja cadastrado.' });
    }

    const ipRecent = await dbGet(
      `SELECT COUNT(*) AS total
       FROM users
       WHERE signup_ip_hash = ?
         AND datetime(created_at) >= datetime('now', ?)`,
      [signupIpHash, signupWindowModifier]
    );
    if (Number(ipRecent?.total || 0) >= maxPerIp) {
      return res.status(429).json({
        success: false,
        message: 'Muitos cadastros recentes nesta rede. Aguarde um pouco ou fale com o suporte.',
      });
    }

    const deviceRecent = await dbGet(
      `SELECT COUNT(*) AS total
       FROM users
       WHERE signup_device_hash = ?
         AND datetime(created_at) >= datetime('now', ?)`,
      [signupDeviceHash, signupWindowModifier]
    );
    if (Number(deviceRecent?.total || 0) >= maxPerDevice) {
      return res.status(429).json({
        success: false,
        message: 'Muitos cadastros recentes neste aparelho. Aguarde um pouco ou fale com o suporte.',
      });
    }

    const trialDays = getTrialDays();
    const trialModifier = `+${trialDays} days`;

    await dbRun(
      `INSERT INTO users (
         username, email, document_type, document_number, password_hash, plan,
         trial_started_at, trial_ends_at, subscription_status,
         signup_ip_hash, signup_device_hash, privacy_accepted_at, privacy_version,
         active, created_at
       ) VALUES (?, ?, ?, ?, ?, 'free', datetime('now'), datetime('now', ?), 'trialing', ?, ?, datetime('now'), ?, 1, datetime('now'))`,
      [
        username,
        email,
        documentData.type,
        documentData.digits,
        hashPassword(password),
        trialModifier,
        signupIpHash,
        signupDeviceHash,
        privacyVersion,
      ]
    );

    return res.status(201).json({ success: true, message: `Conta criada! Seu teste gratis de ${trialDays} dias esta ativo.` });
  } catch (err) {
    console.error('[AUTH register]', err.message);
    if (err.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({ success: false, message: 'Cadastro duplicado. Confira usuario, e-mail ou CPF/CNPJ.' });
    }
    return res.status(500).json({ success: false, message: 'Erro ao criar conta.' });
  }
});

// ----------------------------------------------------------------------------
// 5. Recuperacao e redefinicao de senha
// ----------------------------------------------------------------------------
router.post('/forgot-password', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();

  if (!checkRateLimit(req, res, [
    { name: 'forgot-ip', limit: 10, windowMs: 60 * 60 * 1000 },
    { name: 'forgot-email', limit: 5, windowMs: 60 * 60 * 1000, key: `${clientKey(req)}:${email || 'empty'}` },
  ])) return;

  if (!email) {
    return res.status(400).json({ success: false, message: 'E-mail e obrigatorio.' });
  }
  if (!isEmailConfigured()) {
    return res.status(503).json({
      success: false,
      message: 'Envio de e-mail ainda nao configurado no servidor.',
    });
  }

  try {
    const user = await dbGet(
      'SELECT id, username, email FROM users WHERE LOWER(email)=LOWER(?) AND active=1 LIMIT 1',
      [email]
    );

    if (!user) return genericRecoveryResponse(res);

    await dbRun(
      `UPDATE password_reset_tokens
       SET used_at = datetime('now')
       WHERE user_id = ? AND used_at IS NULL`,
      [user.id]
    );

    const token = newResetToken();
    await dbRun(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES (?, ?, datetime('now', '+1 hour'))`,
      [user.id, sha256(token)]
    );

    await sendPasswordResetEmail({
      to: user.email,
      username: user.username,
      token,
    });

    return genericRecoveryResponse(res);
  } catch (err) {
    console.error('[AUTH forgot-password]', err.message);
    return res.status(500).json({ success: false, message: 'Nao foi possivel enviar a recuperacao agora.' });
  }
});

router.post('/reset-password', async (req, res) => {
  const token = String(req.body.token || '').trim();
  const password = String(req.body.password || '');

  if (!checkRateLimit(req, res, [
    { name: 'reset-ip', limit: 30, windowMs: 60 * 60 * 1000 },
    { name: 'reset-token', limit: 10, windowMs: 60 * 60 * 1000, key: `${clientKey(req)}:${sha256(token || 'empty')}` },
  ])) return;

  if (!token) {
    return res.status(400).json({ success: false, message: 'Token de recuperacao ausente.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Senha deve ter pelo menos 8 caracteres.' });
  }

  try {
    const row = await dbGet(
      `SELECT prt.id, prt.user_id, u.username
       FROM password_reset_tokens prt
       JOIN users u ON u.id = prt.user_id
       WHERE prt.token_hash = ?
         AND prt.used_at IS NULL
         AND datetime(prt.expires_at) > datetime('now')
         AND u.active = 1
       LIMIT 1`,
      [sha256(token)]
    );

    if (!row) {
      return res.status(400).json({ success: false, message: 'Link invalido ou expirado. Solicite uma nova recuperacao.' });
    }

    await dbRun(
      `UPDATE users
       SET password_hash = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [hashPassword(password), row.user_id]
    );
    await dbRun(
      `UPDATE password_reset_tokens
       SET used_at = datetime('now')
       WHERE user_id = ? AND used_at IS NULL`,
      [row.user_id]
    );

    return res.json({ success: true, message: 'Senha redefinida com sucesso. Faca login para continuar.' });
  } catch (err) {
    console.error('[AUTH reset-password]', err.message);
    return res.status(500).json({ success: false, message: 'Nao foi possivel redefinir a senha agora.' });
  }
});

// ----------------------------------------------------------------------------
// 6. Logout
// ----------------------------------------------------------------------------
router.post('/logout', (req, res) => {
  res.clearCookie('cs_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
  return res.json({ success: true });
});

module.exports = router;
