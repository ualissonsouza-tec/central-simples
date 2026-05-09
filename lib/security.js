// ============================================================================
// SEGURANCA COMPARTILHADA
// Hash de senha, rate limit, origem das requisicoes e mensagens publicas de erro.
// ============================================================================

// ----------------------------------------------------------------------------
// 1. Criptografia e parametros de senha
// ----------------------------------------------------------------------------
const crypto = require('crypto');

const rateLimitBuckets = new Map();
const RATE_LIMIT_MAX_BUCKETS = 5000;
const SCRYPT_PARAMS = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 32 * 1024 * 1024,
};

// ----------------------------------------------------------------------------
// 2. Hash, verificacao de senha e migracao de hash antigo
// ----------------------------------------------------------------------------
function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function safeEqualBuffer(a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b) || a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function isLegacyPasswordHash(stored) {
  return /^[a-f0-9]{64}$/i.test(String(stored || ''));
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(String(password), salt, 64, SCRYPT_PARAMS);
  return [
    'scrypt',
    SCRYPT_PARAMS.N,
    SCRYPT_PARAMS.r,
    SCRYPT_PARAMS.p,
    salt.toString('base64url'),
    derived.toString('base64url'),
  ].join('$');
}

function verifyPassword(password, stored) {
  const saved = String(stored || '');

  if (isLegacyPasswordHash(saved)) {
    const expected = Buffer.from(saved, 'hex');
    const actual = Buffer.from(sha256(password), 'hex');
    return { ok: safeEqualBuffer(actual, expected), legacy: true };
  }

  const parts = saved.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') {
    return { ok: false, legacy: false };
  }

  const [, n, r, p, saltB64, keyB64] = parts;
  const options = {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: SCRYPT_PARAMS.maxmem,
  };

  if (!options.N || !options.r || !options.p) {
    return { ok: false, legacy: false };
  }

  try {
    const salt = Buffer.from(saltB64, 'base64url');
    const expected = Buffer.from(keyB64, 'base64url');
    const actual = crypto.scryptSync(String(password), salt, expected.length, options);
    return { ok: safeEqualBuffer(actual, expected), legacy: false };
  } catch {
    return { ok: false, legacy: false };
  }
}

function getRequestIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.ip || req.socket?.remoteAddress || 'unknown';
}

// ----------------------------------------------------------------------------
// 3. Rate limit simples em memoria
// ----------------------------------------------------------------------------
function pruneRateLimitBuckets(now) {
  if (rateLimitBuckets.size < RATE_LIMIT_MAX_BUCKETS) return;
  for (const [key, bucket] of rateLimitBuckets.entries()) {
    if (bucket.resetAt <= now) rateLimitBuckets.delete(key);
  }
}

function checkRateLimit(req, res, rules) {
  const now = Date.now();
  pruneRateLimitBuckets(now);

  let blocked = null;

  for (const rule of rules) {
    const rawKey = typeof rule.key === 'function' ? rule.key(req) : rule.key;
    const key = `${rule.name}:${String(rawKey || getRequestIp(req)).toLowerCase()}`;
    const windowMs = Number(rule.windowMs) || 60_000;
    const limit = Number(rule.limit) || 10;
    let bucket = rateLimitBuckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      rateLimitBuckets.set(key, bucket);
    }

    bucket.count += 1;

    if (bucket.count > limit && (!blocked || bucket.resetAt > blocked.resetAt)) {
      blocked = bucket;
    }
  }

  if (!blocked) return true;

  const retryAfter = Math.max(1, Math.ceil((blocked.resetAt - now) / 1000));
  res.setHeader('Retry-After', String(retryAfter));
  res.status(429).json({
    success: false,
    message: 'Muitas tentativas. Aguarde um pouco e tente novamente.',
  });
  return false;
}

// ----------------------------------------------------------------------------
// 4. Origem segura e erros publicos
// ----------------------------------------------------------------------------
function publicError(err, fallback = 'Erro interno.') {
  if (process.env.NODE_ENV === 'production') return fallback;
  return err?.message || fallback;
}

function getAppOrigin(req) {
  const configured = String(process.env.APP_BASE_URL || '').trim().replace(/\/+$/, '');
  if (configured) return configured;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('APP_BASE_URL precisa ser configurada em producao.');
  }

  const host = String(req.get('host') || 'localhost').replace(/[\r\n]/g, '');
  return `${req.protocol}://${host}`;
}

function isSameOrigin(req) {
  const origin = req.get('origin');
  if (!origin) return true;

  try {
    return new URL(origin).host === String(req.get('host') || '');
  } catch {
    return false;
  }
}

module.exports = {
  checkRateLimit,
  getAppOrigin,
  getRequestIp,
  hashPassword,
  isSameOrigin,
  publicError,
  sha256,
  verifyPassword,
};
