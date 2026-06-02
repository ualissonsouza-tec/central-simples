// PWA E UI COMPARTILHADA
// Service worker, instalacao do app, push, mascaras e modal de confirmacao.

(function setupCentralSimplesPwa() {
  let deferredInstallPrompt = null;

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
      return;
    }
    fn();
  }

  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    try {
      await navigator.serviceWorker.register('/sw.js');
    } catch {}
  }

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; i += 1) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }

  function ensureInstallButton() {
    if (isStandalone() || document.getElementById('pwa-install-button')) return;

    const button = document.createElement('button');
    button.id = 'pwa-install-button';
    button.type = 'button';
    button.textContent = 'Instalar app';
    button.style.cssText = [
      'position:fixed',
      'right:16px',
      'bottom:16px',
      'z-index:80',
      'display:none',
      'border:1px solid rgba(125,211,252,.28)',
      'border-radius:999px',
      'padding:10px 14px',
      'background:linear-gradient(135deg,#2563eb,#0ea5e9)',
      'color:#fff',
      'font:700 13px DM Sans, sans-serif',
      'box-shadow:0 18px 40px rgba(0,0,0,.28)',
      'cursor:pointer',
    ].join(';');

    button.addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;
      button.style.display = 'none';
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice.catch(() => null);
      deferredInstallPrompt = null;
    });

    document.body.appendChild(button);
  }

  function onlyDigits(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function formatCpfCnpj(value) {
    const digits = onlyDigits(value).slice(0, 14);
    if (digits.length <= 11) {
      return digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }

    return digits
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  }

  function formatCep(value) {
    return onlyDigits(value).slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2');
  }

  function formatPhone(value) {
    const digits = onlyDigits(value).slice(0, 13);
    if (digits.startsWith('55') && digits.length > 11) {
      return digits
        .replace(/^(\d{2})(\d{2})(\d{5})(\d{0,4}).*/, '+$1 ($2) $3-$4')
        .replace(/-$/, '');
    }
    if (digits.length <= 10) {
      return digits
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
    }
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
  }

  function formatCardNumber(value) {
    return onlyDigits(value).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
  }

  function formatCardExp(value) {
    return onlyDigits(value).slice(0, 4).replace(/^(\d{2})(\d)/, '$1/$2');
  }

  function setupInputMasks() {
    const masks = [
      { ids: ['cad-document', 'payer-document', 'cli-cpf'], format: formatCpfCnpj },
      { ids: ['payer-whatsapp', 'cli-tel'], format: formatPhone },
      { ids: ['payer-cep'], format: formatCep },
      { ids: ['card-number'], format: formatCardNumber },
      { ids: ['card-exp'], format: formatCardExp },
      { ids: ['card-cvv'], format: (value) => onlyDigits(value).slice(0, 4) },
      { ids: ['payer-state'], format: (value) => String(value || '').replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase() },
    ];

    masks.forEach(({ ids, format }) => {
      ids.forEach((id) => {
        const input = document.getElementById(id);
        if (!input || input.dataset.csMaskReady === 'true') return;

        input.dataset.csMaskReady = 'true';
        input.addEventListener('input', () => {
          input.value = format(input.value);
        });
      });
    });
  }

  function ensureConfirmModal() {
    let overlay = document.getElementById('cs-confirm-overlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'cs-confirm-overlay';
    overlay.innerHTML = `
      <div class="modal cs-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="cs-confirm-title">
        <div class="cs-confirm-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
        <h2 id="cs-confirm-title">Confirmar ação</h2>
        <p id="cs-confirm-message">Tem certeza?</p>
        <div class="cs-confirm-actions">
          <button class="btn btn-ghost" id="cs-confirm-cancel" type="button">Cancelar</button>
          <button class="btn btn-danger" id="cs-confirm-ok" type="button">Confirmar</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    return overlay;
  }

  function confirmAction(options = {}) {
    const overlay = ensureConfirmModal();
    const title = document.getElementById('cs-confirm-title');
    const message = document.getElementById('cs-confirm-message');
    const cancel = document.getElementById('cs-confirm-cancel');
    const ok = document.getElementById('cs-confirm-ok');

    title.textContent = options.title || 'Confirmar ação';
    message.textContent = options.message || 'Tem certeza que deseja continuar?';
    cancel.textContent = options.cancelText || 'Cancelar';
    ok.textContent = options.confirmText || 'Confirmar';
    ok.className = `btn ${options.danger === false ? 'btn-primary' : 'btn-danger'}`;

    return new Promise((resolve) => {
      function close(result) {
        overlay.classList.remove('open');
        cancel.removeEventListener('click', onCancel);
        ok.removeEventListener('click', onOk);
        overlay.removeEventListener('click', onOverlay);
        document.removeEventListener('keydown', onKeydown);
        resolve(result);
      }

      function onCancel() { close(false); }
      function onOk() { close(true); }
      function onOverlay(event) {
        if (event.target === overlay) close(false);
      }
      function onKeydown(event) {
        if (event.key === 'Escape') close(false);
      }

      cancel.addEventListener('click', onCancel);
      ok.addEventListener('click', onOk);
      overlay.addEventListener('click', onOverlay);
      document.addEventListener('keydown', onKeydown);
      overlay.classList.add('open');
      ok.focus({ preventScroll: true });
    });
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    const button = document.getElementById('pwa-install-button');
    if (button && !isStandalone()) button.style.display = 'inline-flex';
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    const button = document.getElementById('pwa-install-button');
    if (button) button.style.display = 'none';
  });

  window.CentralSimplesPwa = {
    async requestNotificationPermission() {
      if (!('Notification' in window)) return 'unsupported';
      if (Notification.permission === 'granted') return 'granted';
      if (Notification.permission === 'denied') return 'denied';
      return Notification.requestPermission();
    },
    async enablePushNotifications() {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported';

      const permission = await this.requestNotificationPermission();
      if (permission !== 'granted') return permission;

      const keyRes = await fetch('/api/notifications/push/public-key', { credentials: 'same-origin' });
      const keyData = await keyRes.json();
      if (!keyData.success || !keyData.configured || !keyData.publicKey) return 'not-configured';

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
      });

      const saveRes = await fetch('/api/notifications/push/subscribe', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription }),
      });
      const saveData = await saveRes.json();
      return saveData.success ? 'subscribed' : 'failed';
    },
    showLocalNotification(title, options = {}) {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      navigator.serviceWorker?.ready
        ?.then((registration) => registration.showNotification(title, {
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          ...options,
        }))
        .catch(() => new Notification(title, options));
    },
  };

  window.CentralSimplesUi = {
    confirm: confirmAction,
    refreshMasks: setupInputMasks,
  };

  ready(() => {
    setupInputMasks();
    ensureInstallButton();
    registerServiceWorker();
  });
})();
