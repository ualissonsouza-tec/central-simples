// GUARDA DE ASSINATURA NO FRONTEND
// Redireciona para planos/pagamento quando trial ou plano nao permitem acesso.

(function setupCentralSimplesBilling() {
  const openPages = new Set(['/login.html', '/reset-password.html', '/aprovacao.html', '/planos.html', '/pagamento.html']);

  function currentPath() {
    return window.location.pathname || '/dashboard.html';
  }

  function isOpenBillingPage() {
    return openPages.has(currentPath());
  }

  async function fetchBillingStatus() {
    const res = await fetch('/api/billing/status', { credentials: 'same-origin' });
    if (res.status === 401) {
      window.location.replace('/login.html');
      return null;
    }
    return res.json();
  }

  async function guardBilling() {
    try {
      const data = await fetchBillingStatus();
      if (!data?.success) return null;
      window.CentralSimplesBilling.status = data.data;

      if (data.data?.requiresPayment && !isOpenBillingPage()) {
        const next = encodeURIComponent(currentPath());
        window.location.replace(`/planos.html?expired=1&next=${next}`);
      }
      return data.data;
    } catch {
      return null;
    }
  }

  window.CentralSimplesBilling = {
    status: null,
    fetchBillingStatus,
    guardBilling,
  };

  guardBilling();
})();
