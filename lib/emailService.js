// ============================================================================
// SERVICO DE E-MAIL
// Envia recuperacao de senha e centraliza configuracao SMTP.
// ============================================================================

// ----------------------------------------------------------------------------
// 1. Configuracao SMTP e sanitizacao
// ----------------------------------------------------------------------------
const net = require('net');
const tls = require('tls');

function getConfig() {
  return {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || process.env.SMTP_USER || '',
    appBaseUrl: process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
  };
}

function isConfigured() {
  const config = getConfig();
  return Boolean(config.host && config.port && config.user && config.pass && config.from);
}

function sanitizeHeader(value) {
  return String(value || '').replace(/[\r\n]/g, ' ').trim();
}

function extractEmailAddress(value) {
  const text = sanitizeHeader(value);
  const angleMatch = text.match(/<([^<>]+)>/);
  const candidate = angleMatch ? angleMatch[1] : text;
  const emailMatch = candidate.match(/[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+/);
  return emailMatch ? emailMatch[0] : '';
}

function dotStuff(body) {
  return String(body || '').replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..');
}

// ----------------------------------------------------------------------------
// 2. Cliente SMTP simples sem dependencia externa
// ----------------------------------------------------------------------------
function createPlainClient(socket) {
  let buffer = '';
  const queue = [];
  const waiters = [];

  socket.setEncoding('utf8');
  socket.on('data', (chunk) => {
    buffer += chunk;
    let index;
    while ((index = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, index).replace(/\r$/, '');
      buffer = buffer.slice(index + 1);
      queue.push(line);
    }
    drain();
  });

  function drain() {
    while (waiters.length && queue.length) {
      waiters.shift()(queue.shift());
    }
  }

  function nextLine() {
    if (queue.length) return Promise.resolve(queue.shift());
    return new Promise((resolve) => waiters.push(resolve));
  }

  async function readResponse(expectedCodes = []) {
    const lines = [];
    while (true) {
      const line = await nextLine();
      lines.push(line);
      if (/^\d{3} /.test(line)) break;
    }

    const code = Number(lines[lines.length - 1].slice(0, 3));
    if (expectedCodes.length && !expectedCodes.includes(code)) {
      throw new Error(`SMTP respondeu ${code}: ${lines.join(' ')}`);
    }
    return { code, lines };
  }

  function send(command) {
    socket.write(`${command}\r\n`);
  }

  function close() {
    socket.end();
  }

  return { readResponse, send, close };
}

function connectSocket(config) {
  return new Promise((resolve, reject) => {
    const socket = config.secure
      ? tls.connect(config.port, config.host, { servername: config.host }, () => resolve(socket))
      : net.connect(config.port, config.host, () => resolve(socket));

    socket.setTimeout(15000);
    socket.once('error', reject);
    socket.once('timeout', () => {
      socket.destroy();
      reject(new Error('Timeout ao conectar no servidor SMTP.'));
    });
  });
}

async function upgradeToTls(client, rawSocket, config) {
  client.send(`EHLO ${config.host}`);
  await client.readResponse([250]);
  client.send('STARTTLS');
  await client.readResponse([220]);

  return new Promise((resolve, reject) => {
    const secureSocket = tls.connect({ socket: rawSocket, servername: config.host }, () => {
      resolve(createPlainClient(secureSocket));
    });
    secureSocket.once('error', reject);
  });
}

// ----------------------------------------------------------------------------
// 3. Envio SMTP generico
// ----------------------------------------------------------------------------
async function sendEmail({ to, subject, text }) {
  const config = getConfig();
  if (!isConfigured()) {
    throw new Error('SMTP nao configurado. Defina SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS e SMTP_FROM no servidor.');
  }

  const safeFromHeader = sanitizeHeader(config.from);
  const envelopeFrom = extractEmailAddress(config.from || config.user);
  const safeTo = extractEmailAddress(to);
  const safeSubject = sanitizeHeader(subject);
  if (!envelopeFrom) throw new Error('Remetente de email invalido.');
  if (!safeTo) throw new Error('Destinatario de email invalido.');

  let socket = await connectSocket(config);
  let client = createPlainClient(socket);

  try {
    await client.readResponse([220]);

    if (!config.secure) {
      client = await upgradeToTls(client, socket, config);
      socket = null;
    }

    client.send(`EHLO ${config.host}`);
    await client.readResponse([250]);
    client.send('AUTH LOGIN');
    await client.readResponse([334]);
    client.send(Buffer.from(config.user).toString('base64'));
    await client.readResponse([334]);
    client.send(Buffer.from(config.pass).toString('base64'));
    await client.readResponse([235]);
    client.send(`MAIL FROM:<${envelopeFrom}>`);
    await client.readResponse([250]);
    client.send(`RCPT TO:<${safeTo}>`);
    await client.readResponse([250, 251]);
    client.send('DATA');
    await client.readResponse([354]);

    const message = [
      `From: ${safeFromHeader || envelopeFrom}`,
      `To: ${safeTo}`,
      `Subject: ${safeSubject}`,
      `Date: ${new Date().toUTCString()}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      dotStuff(text),
      '.',
    ].join('\r\n');

    client.send(message);
    await client.readResponse([250]);
    client.send('QUIT');
    await client.readResponse([221]).catch(() => {});
  } finally {
    client.close();
  }
}

// ----------------------------------------------------------------------------
// 4. Template de recuperacao de senha
// ----------------------------------------------------------------------------
async function sendPasswordResetEmail({ to, username, token }) {
  const config = getConfig();
  const resetUrl = `${config.appBaseUrl.replace(/\/$/, '')}/reset-password.html?token=${encodeURIComponent(token)}`;
  const text = [
    `Ola ${username || 'usuario'},`,
    '',
    'Recebemos uma solicitacao para redefinir sua senha no Central Simples.',
    'Para criar uma nova senha, acesse o link abaixo:',
    '',
    resetUrl,
    '',
    'Este link expira em 1 hora. Se voce nao solicitou esta recuperacao, pode ignorar este email.',
    '',
    'Central Simples',
  ].join('\n');

  await sendEmail({
    to,
    subject: 'Redefinicao de senha - Central Simples',
    text,
  });
}

module.exports = {
  getConfig,
  isConfigured,
  sendEmail,
  sendPasswordResetEmail,
};
