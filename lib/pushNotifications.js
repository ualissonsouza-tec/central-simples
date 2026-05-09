// ============================================================================
// PUSH NOTIFICATIONS
// Gerencia chaves VAPID e envio de avisos para o PWA instalado.
// ============================================================================

// ----------------------------------------------------------------------------
// 1. Dependencias e configuracao
// ----------------------------------------------------------------------------
const webpush = require('web-push');
const db = require('../db/database');

const publicKey = String(process.env.VAPID_PUBLIC_KEY || '').trim();
const privateKey = String(process.env.VAPID_PRIVATE_KEY || '').trim();
const subject = String(process.env.VAPID_SUBJECT || process.env.APP_BASE_URL || 'mailto:contato@centralsimples.local').trim();

if (publicKey && privateKey) {
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function runCallback(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function isPushConfigured() {
  return Boolean(publicKey && privateKey);
}

function getPublicKey() {
  return publicKey;
}

async function savePushSubscription(userId, subscription, userAgent = '') {
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    throw new Error('Assinatura push invalida.');
  }

  await dbRun(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(endpoint) DO UPDATE SET
       user_id = excluded.user_id,
       p256dh = excluded.p256dh,
       auth = excluded.auth,
       user_agent = excluded.user_agent,
       updated_at = datetime('now')`,
    [
      userId,
      String(subscription.endpoint),
      String(subscription.keys.p256dh),
      String(subscription.keys.auth),
      String(userAgent || '').slice(0, 300),
    ]
  );
}

async function removePushSubscription(endpoint) {
  if (!endpoint) return;
  await dbRun('DELETE FROM push_subscriptions WHERE endpoint = ?', [endpoint]);
}

async function sendPushToUser(userId, payload) {
  if (!isPushConfigured()) return { sent: 0, skipped: true };

  const rows = await dbAll(
    `SELECT endpoint, p256dh, auth
     FROM push_subscriptions
     WHERE user_id IS ?`,
    [userId]
  );

  let sent = 0;
  await Promise.all(rows.map(async (row) => {
    const subscription = {
      endpoint: row.endpoint,
      keys: {
        p256dh: row.p256dh,
        auth: row.auth,
      },
    };

    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      sent += 1;
    } catch (err) {
      if ([404, 410].includes(Number(err.statusCode))) {
        await removePushSubscription(row.endpoint);
      } else {
        console.error('[PUSH]', err.message);
      }
    }
  }));

  return { sent, skipped: false };
}

module.exports = {
  getPublicKey,
  isPushConfigured,
  savePushSubscription,
  sendPushToUser,
};
