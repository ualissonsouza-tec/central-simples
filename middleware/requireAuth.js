// ============================================================================
// MIDDLEWARE DE AUTENTICACAO
// Valida cookie JWT e bloqueia paginas/APIs protegidas.
// ============================================================================

const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const token = req.cookies?.cs_token;

  if (!token) return deny(req, res, 'Sessao nao encontrada.');

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    return next();
  } catch {
    res.clearCookie('cs_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
    return deny(req, res, 'Sessao invalida ou expirada.');
  }
}

function deny(req, res, message) {
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ success: false, message });
  }
  return res.redirect('/login.html');
}

module.exports = requireAuth;
