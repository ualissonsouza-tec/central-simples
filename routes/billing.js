// ROTAS DE PLANOS E PAGAMENTOS
// Entrega planos, status de assinatura, checkout e historico de pagamentos.

const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { publicError } = require('../lib/security');
const {
  createCheckout,
  getBillingStatusForUserId,
  getPlan,
  getPlans,
  listPayments,
} = require('../lib/billing');

const router = express.Router();
router.use(requireAuth);

function uid(req) {
  return req.user?.userId ?? null;
}

router.get('/plans', (req, res) => {
  res.json({
    success: true,
    data: getPlans(),
    trialDays: 15,
  });
});

router.get('/status', async (req, res) => {
  try {
    const billing = await getBillingStatusForUserId(uid(req));
    const payments = uid(req) === null ? [] : await listPayments(uid(req));
    res.json({
      success: true,
      data: billing,
      payments,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: publicError(err) });
  }
});

router.post('/checkout', async (req, res) => {
  try {
    if (uid(req) === null) {
      return res.status(400).json({
        success: false,
        message: 'O usuário master não precisa contratar plano.',
      });
    }

    const planId = String(req.body.plan || '').trim();
    const plan = getPlan(planId);
    if (!plan) {
      return res.status(400).json({ success: false, message: 'Plano inválido.' });
    }

    const payer = req.body.payer || {};
    const payerName = String(payer.name || '').trim();
    const payerDocument = String(payer.document || '').replace(/\D/g, '');
    const payerEmail = String(payer.email || '').trim();

    if (payerName.length < 3 || payerDocument.length < 11 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payerEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Preencha nome, CPF/CNPJ e e-mail corretamente.',
      });
    }

    const payment = await createCheckout({
      userId: uid(req),
      planId: plan.id,
      paymentMethod: String(req.body.payment_method || 'pix'),
      payer,
    });
    const billing = await getBillingStatusForUserId(uid(req));

    res.status(201).json({
      success: true,
      payment,
      billing,
      message: payment.localAutoApprove
        ? 'Plano ativado em modo de teste local.'
        : 'Pedido de pagamento criado. A ativação automática será finalizada quando integrarmos o gateway bancário.',
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: publicError(err) });
  }
});

module.exports = router;
