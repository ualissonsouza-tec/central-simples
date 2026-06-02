// NOTIFICACOES INTERNAS
// Cria registros de aviso que aparecem no sino do dashboard.

const db = require('../db/database');

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

async function createNotification({
  userId = null,
  kind = 'info',
  title,
  body = '',
  entityType = '',
  entityId = null,
  actionUrl = '',
}) {
  if (!title) return null;

  const result = await dbRun(
    `INSERT INTO notifications (
       user_id, kind, title, body, entity_type, entity_id, action_url
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      String(kind || 'info').trim(),
      String(title).trim().slice(0, 160),
      String(body || '').trim().slice(0, 1000),
      String(entityType || '').trim(),
      entityId,
      String(actionUrl || '').trim(),
    ]
  );

  return result.lastID;
}

module.exports = {
  createNotification,
};
