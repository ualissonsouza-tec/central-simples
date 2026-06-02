// routes/company.js
// Perfil de empresa completamente isolado por usuário.
// Cada usuário tem seu próprio registro — nunca vê dados de outro.

// ROTAS DE CONFIGURACOES DA EMPRESA
// Mantem nome, logo, Pix e status de integracao WhatsApp por usuario.

const express     = require('express');
const multer      = require('multer');
const path        = require('path');
const fs          = require('fs');
const crypto      = require('crypto');
const db          = require('../db/database');
const requireAuth = require('../middleware/requireAuth');
const { requireActiveSubscription } = require('../middleware/requireBilling');
const { isConfigured } = require('../lib/whatsappService');
const { publicError } = require('../lib/security');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `logo-${crypto.randomBytes(12).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const ok = ['.png', '.jpg', '.jpeg'].includes(ext)
      && ['image/png', 'image/jpeg'].includes(file.mimetype);
    cb(ok ? null : new Error('Use PNG ou JPG.'), ok);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

function dbGet(sql, p=[]) {
  return new Promise((ok,er) => db.get(sql,p,(e,r)=>e?er(e):ok(r)));
}
function dbRun(sql, p=[]) {
  return new Promise((ok,er) => db.run(sql,p,function(e){e?er(e):ok({lastID:this.lastID})}));
}

// Retorna o user_id do token (null = master)
function uid(req) { return req.user?.userId ?? null; }

function removeFile(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {}
}

function isAllowedLogoFile(file) {
  if (!file?.path) return false;
  const ext = path.extname(file.originalname).toLowerCase();
  if (!['.png', '.jpg', '.jpeg'].includes(ext)) return false;
  if (!['image/png', 'image/jpeg'].includes(file.mimetype)) return false;

  try {
    const buffer = fs.readFileSync(file.path);
    const isPng = buffer.length >= 8
      && buffer[0] === 0x89
      && buffer[1] === 0x50
      && buffer[2] === 0x4e
      && buffer[3] === 0x47
      && buffer[4] === 0x0d
      && buffer[5] === 0x0a
      && buffer[6] === 0x1a
      && buffer[7] === 0x0a;
    const isJpeg = buffer.length >= 3
      && buffer[0] === 0xff
      && buffer[1] === 0xd8
      && buffer[2] === 0xff;
    return isPng || isJpeg;
  } catch {
    return false;
  }
}

function logoFileToDataUrl(file) {
  if (!file?.path) return '';
  const buffer = fs.readFileSync(file.path);
  const mime = file.mimetype === 'image/png' ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

// ── GET /api/company/profile ──────────────────────────────────────────────────
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const userId = uid(req);

    // Busca perfil EXCLUSIVO deste usuário
    const row = await dbGet(
      'SELECT * FROM company_profile WHERE user_id IS ? LIMIT 1',
      [userId]
    );

    // Se não existe ainda, retorna objeto vazio — NÃO retorna dados de outro usuário
    if (!row) {
      return res.json({
        success: true,
        data: {
          id: null,
          company_name: '',
          logo_path: null,
          logo_data_url: '',
          pix_key: '',
          pix_receiver_name: '',
          pix_message_suffix: '',
          whatsapp_auto_ready: isConfigured(),
        },
      });
    }

    return res.json({
      success: true,
      data: {
        ...row,
        whatsapp_auto_ready: isConfigured(),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: publicError(err) });
  }
});

// ── POST /api/company/profile ─────────────────────────────────────────────────
router.post('/profile', requireAuth, requireActiveSubscription('configurações da empresa'), upload.single('logo'), async (req, res) => {
  const {
    company_name,
    pix_key = '',
    pix_receiver_name = '',
    pix_message_suffix = '',
  } = req.body;

  if (!company_name || company_name.trim().length < 2) {
    if (req.file) removeFile(req.file.path);
    return res.status(400).json({ success: false, message: 'Nome da empresa invalido.' });
  }

  if (req.file && !isAllowedLogoFile(req.file)) {
    removeFile(req.file.path);
    return res.status(400).json({ success: false, message: 'Logo invalida. Envie uma imagem PNG ou JPG real.' });
  }

  const userId = uid(req);

  try {
    // Busca perfil existente deste usuário
    const existing = await dbGet(
      'SELECT * FROM company_profile WHERE user_id IS ? LIMIT 1',
      [userId]
    );

    let logoPath = existing?.logo_path ?? null;
    let logoDataUrl = existing?.logo_data_url || '';

    if (req.file) {
      logoDataUrl = logoFileToDataUrl(req.file);

      // Remove logo antiga deste usuário
      if (existing?.logo_path) {
        const oldFull = path.join(__dirname, '..', existing.logo_path);
        removeFile(oldFull);
      }
      logoPath = path.join('uploads', req.file.filename);
    }

    if (existing?.id) {
      // Atualiza o perfil existente
      await dbRun(
        `UPDATE company_profile
         SET company_name=?, logo_path=?, logo_data_url=?, pix_key=?, pix_receiver_name=?, pix_message_suffix=?, updated_at=datetime('now')
         WHERE id=?`,
        [
          company_name.trim(),
          logoPath,
          logoDataUrl,
          String(pix_key || '').trim(),
          String(pix_receiver_name || '').trim(),
          String(pix_message_suffix || '').trim(),
          existing.id,
        ]
      );
    } else {
      // Cria novo perfil para este usuário
      await dbRun(
        `INSERT INTO company_profile (user_id, company_name, logo_path, logo_data_url, pix_key, pix_receiver_name, pix_message_suffix)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          company_name.trim(),
          logoPath,
          logoDataUrl,
          String(pix_key || '').trim(),
          String(pix_receiver_name || '').trim(),
          String(pix_message_suffix || '').trim(),
        ]
      );
    }

    return res.json({
      success: true,
      message: 'Perfil atualizado.',
      data: {
        company_name: company_name.trim(),
        logo_path: logoPath,
        logo_data_url: logoDataUrl,
        pix_key: String(pix_key || '').trim(),
        pix_receiver_name: String(pix_receiver_name || '').trim(),
        pix_message_suffix: String(pix_message_suffix || '').trim(),
        whatsapp_auto_ready: isConfigured(),
      },
    });
  } catch (err) {
    if (req.file) removeFile(req.file.path);
    return res.status(500).json({ success: false, message: publicError(err) });
  }
});

module.exports = router;
