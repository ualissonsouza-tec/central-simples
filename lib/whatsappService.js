// SERVICO DE WHATSAPP
// Encapsula envio por API oficial ou registra pendencia quando nao configurado.

function getConfig() {
  return {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v23.0',
    apiBase: process.env.WHATSAPP_API_BASE || 'https://graph.facebook.com',
    templateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'pt_BR',
  };
}

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function isConfigured() {
  const config = getConfig();
  return Boolean(config.accessToken && config.phoneNumberId);
}

async function sendPayload(payload) {
  const config = getConfig();
  if (!isConfigured()) {
    throw new Error('Integração do WhatsApp não configurada no servidor.');
  }

  const url = `${config.apiBase}/${config.apiVersion}/${config.phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `Erro ao enviar mensagem (${res.status}).`);
  }

  return data;
}

async function sendTextMessage({ to, body }) {
  const phone = normalizePhone(to);
  if (!phone) {
    throw new Error('Telefone do WhatsApp inválido.');
  }

  return sendPayload({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: 'text',
    text: {
      preview_url: true,
      body: String(body || ''),
    },
  });
}

async function sendTemplateMessage({ to, templateName, parameters = [] }) {
  const phone = normalizePhone(to);
  if (!phone) {
    throw new Error('Telefone do WhatsApp inválido.');
  }
  if (!templateName) {
    throw new Error('Template do WhatsApp não informado.');
  }

  const config = getConfig();
  const bodyParameters = parameters.map((value) => ({
    type: 'text',
    text: String(value ?? ''),
  }));

  return sendPayload({
    messaging_product: 'whatsapp',
    to: phone,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: config.templateLanguage,
      },
      components: bodyParameters.length
        ? [
            {
              type: 'body',
              parameters: bodyParameters,
            },
          ]
        : [],
    },
  });
}

module.exports = {
  getConfig,
  isConfigured,
  normalizePhone,
  sendTextMessage,
  sendTemplateMessage,
};
