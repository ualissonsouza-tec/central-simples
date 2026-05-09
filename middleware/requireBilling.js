// ============================================================================
// MIDDLEWARE DE ASSINATURA
// Bloqueia recursos premium quando trial/plano nao permite uso.
// ============================================================================

const { getBillingStatusForUserId, hasFeature } = require('../lib/billing');

function sendBillingRequired(res, status, featureName = 'este recurso') {
  return res.status(402).json({
    success: false,
    billing_required: true,
    message: `Para usar ${featureName}, escolha um plano da Central Simples.`,
    billing: status,
    redirect: '/planos.html',
  });
}

function requireActiveSubscription(featureName = 'este recurso') {
  return async (req, res, next) => {
    if (req.user?.role === 'master' || req.user?.plan === 'master') return next();

    try {
      const status = await getBillingStatusForUserId(req.user?.userId ?? null);
      if (status.active) return next();
      return sendBillingRequired(res, status, featureName);
    } catch (err) {
      return next(err);
    }
  };
}

function requireFeature(featureKey, featureName = 'este recurso') {
  return async (req, res, next) => {
    if (req.user?.role === 'master' || req.user?.plan === 'master') return next();

    try {
      const status = await getBillingStatusForUserId(req.user?.userId ?? null);
      if (hasFeature(status, featureKey)) return next();
      return sendBillingRequired(res, status, featureName);
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = {
  requireActiveSubscription,
  requireFeature,
};
