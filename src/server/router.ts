import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { getDb, queryAll, queryOne, execute, saveDb, restoreDbFromSnapshot } from './db.js';
import { resolveServicePrice } from '../utils/pricing.ts';
import {
  hashToken,
  generateToken,
  cleanPhone,
  isValidPhone,
  isValidUrl,
  generateOrderCode,
  generateTaskCode,
  checkLockout,
  recordFailedAttempt,
  resetLockout,
  DUMMY_HASH,
} from './auth.js';

export const apiRouter = Router();

// Transaction Proof Storage Directories
const PROOFS_DIR = path.resolve(process.cwd(), 'data', 'transaction_proofs');
const ALT_PROOFS_DIR = path.resolve(process.cwd(), 'data', 'transaction proofs');
if (!fs.existsSync(PROOFS_DIR)) fs.mkdirSync(PROOFS_DIR, { recursive: true });
if (!fs.existsSync(ALT_PROOFS_DIR)) fs.mkdirSync(ALT_PROOFS_DIR, { recursive: true });

export function saveProofImage(orderCode: string, base64Data: string): string {
  let matches = base64Data.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
  let ext = 'png';
  let dataBuffer: Buffer;
  if (matches) {
    ext = matches[1].toLowerCase();
    if (ext === 'jpeg') ext = 'jpg';
    dataBuffer = Buffer.from(matches[2], 'base64');
  } else {
    dataBuffer = Buffer.from(base64Data, 'base64');
  }
  const safeCode = orderCode.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `proof_${safeCode}_${Date.now()}.${ext}`;
  const filePath1 = path.join(PROOFS_DIR, filename);
  const filePath2 = path.join(ALT_PROOFS_DIR, filename);
  fs.writeFileSync(filePath1, dataBuffer);
  fs.writeFileSync(filePath2, dataBuffer);
  return `/transaction_proofs/${filename}`;
}

// Serve proofs safely through router
apiRouter.get('/proofs/:filename', (req, res) => {
  const { filename } = req.params;
  const safeName = path.basename(filename);
  const file1 = path.join(PROOFS_DIR, safeName);
  const file2 = path.join(ALT_PROOFS_DIR, safeName);
  if (fs.existsSync(file1)) {
    return res.sendFile(file1);
  } else if (fs.existsSync(file2)) {
    return res.sendFile(file2);
  }
  res.status(404).send('Proof image not found');
});

// Load config
function loadConfig() {
  try {
    const configPath = path.resolve(process.cwd(), 'config.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch (err) {
    console.error('Error loading config.json:', err);
  }
  return {
    businessName: 'Cutline Studio',
    tagline: 'Video Editing & Social Media Management',
    whatsappNumber: '919876543210',
    email: 'contact@cutlinestudio.com',
    currency: 'INR',
    currencySymbol: '₹',
  };
}

// Session resolution middleware
export interface AuthUser {
  userId?: string;
  role: 'admin' | 'freelancer' | 'customer' | 'guest';
  name: string;
  phone?: string;
  email?: string;
}

export async function resolveUser(req: Request): Promise<AuthUser> {
  const headerToken = (req.headers['x-cutline-token'] as string) || undefined;
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
  const cookieToken = req.cookies?.cutline_session;

  const token = headerToken || bearerToken || cookieToken;
  if (!token) {
    return { role: 'guest', name: 'Guest' };
  }

  const tokenHash = hashToken(token);
  const db = await getDb();
  const session = queryOne<{
    token_hash: string;
    user_id: string | null;
    role: 'admin' | 'freelancer' | 'customer';
    name: string;
    phone: string | null;
    expires_at: string;
  }>(db, 'SELECT * FROM sessions WHERE token_hash = ?', [tokenHash]);

  if (!session) {
    return { role: 'guest', name: 'Guest' };
  }

  // Check expiration
  if (new Date(session.expires_at).getTime() < Date.now()) {
    execute(db, 'DELETE FROM sessions WHERE token_hash = ?', [tokenHash]);
    return { role: 'guest', name: 'Guest' };
  }

  // If user_id exists, verify user is still active in users table
  if (session.user_id) {
    const user = queryOne<{ id: string; active: number; email: string; phone: string; name: string }>(
      db,
      'SELECT id, active, email, phone, name FROM users WHERE id = ?',
      [session.user_id]
    );
    if (!user || user.active === 0) {
      execute(db, 'DELETE FROM sessions WHERE token_hash = ?', [tokenHash]);
      return { role: 'guest', name: 'Guest' };
    }
    return {
      userId: user.id,
      role: session.role,
      name: user.name,
      phone: user.phone || undefined,
      email: user.email || undefined,
    };
  }

  return {
    role: session.role,
    name: session.name,
    phone: session.phone || undefined,
  };
}

// Guards
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = await resolveUser(req);
  (req as any).user = user;
  if (user.role === 'guest') {
    res.status(401).json({ error: 'Authentication required. Please login.' });
    return;
  }
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = await resolveUser(req);
  (req as any).user = user;
  if (user.role === 'guest') {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  if (user.role !== 'admin') {
    res.status(403).json({ error: 'Access denied: Admin role required.' });
    return;
  }
  next();
}

export async function requireFreelancer(req: Request, res: Response, next: NextFunction) {
  const user = await resolveUser(req);
  (req as any).user = user;
  if (user.role === 'guest') {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  if (user.role !== 'freelancer') {
    res.status(403).json({ error: 'Access denied: Freelancer role required.' });
    return;
  }
  next();
}

// --- PUBLIC ROUTES ---

apiRouter.get('/config', (req, res) => {
  res.json(loadConfig());
});

apiRouter.get('/services', async (req, res) => {
  try {
    const db = await getDb();
    const rows = queryAll<{ id: string; name: string; base_price?: number; price_text: string; blurb: string; points: string; sort: number }>(
      db,
      'SELECT * FROM services ORDER BY sort ASC, name ASC'
    );
    const services = rows.map(s => {
      let parsedPoints: string[] = [];
      try {
        parsedPoints = JSON.parse(s.points);
      } catch {
        parsedPoints = s.points ? s.points.split('\n').filter(Boolean) : [];
      }
      return {
        ...s,
        base_price: Number(s.base_price) || 0,
        points: parsedPoints,
      };
    });
    res.json({ services });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/me', async (req, res) => {
  const user = await resolveUser(req);
  res.json({ user });
});

// --- AUTH ROUTES ---

// Customer login (name + 10 digit mobile)
apiRouter.post('/customer/login', async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Please enter your name.' });
      return;
    }
    const cleanNum = cleanPhone(phone);
    if (!cleanNum || cleanNum.length !== 10) {
      res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
      return;
    }

    const db = await getDb();
    const trimmedName = name.trim();

    // Check if customer exists or create new
    const existing = queryOne<{ id: string; name: string; phone: string }>(
      db,
      'SELECT id, name, phone FROM customers WHERE phone = ?',
      [cleanNum]
    );

    let customerId = existing?.id;
    if (!existing) {
      customerId = 'cust_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      execute(
        db,
        'INSERT INTO customers (id, phone, name, created_at) VALUES (?, ?, ?, ?)',
        [customerId, cleanNum, trimmedName, new Date().toISOString()]
      );
    } else if (existing.name !== trimmedName) {
      // update name if customer updated it
      execute(db, 'UPDATE customers SET name = ? WHERE id = ?', [trimmedName, existing.id]);
    }

    // Create session (12 hours)
    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 12 * 3600 * 1000).toISOString();

    execute(
      db,
      'INSERT INTO sessions (token_hash, user_id, role, name, phone, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
      [tokenHash, null, 'customer', trimmedName, cleanNum, expiresAt]
    );

    res.cookie('cutline_session', token, {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      maxAge: 12 * 3600 * 1000,
    });

    res.json({
      success: true,
      token,
      user: {
        role: 'customer',
        name: trimmedName,
        phone: cleanNum,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Team login (Admin & Freelancer via mobile/email + password)
apiRouter.post('/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    if (!identifier || !password) {
      res.status(400).json({ error: 'Identifier (mobile or email) and password are required.' });
      return;
    }

    const trimmedIdent = String(identifier).trim();
    const db = await getDb();

    // Check lockout
    if (checkLockout(db, trimmedIdent, ip)) {
      res.status(429).json({ error: 'Account temporarily locked due to 5 consecutive failed attempts. Please try again in 15 minutes.' });
      return;
    }

    const cleanNum = cleanPhone(trimmedIdent);

    // Look up user by phone or email
    const user = queryOne<{
      id: string;
      role: 'admin' | 'freelancer';
      name: string;
      phone: string;
      email: string;
      password_hash: string;
      active: number;
    }>(
      db,
      `SELECT * FROM users WHERE active = 1 AND (phone = ? OR LOWER(email) = LOWER(?)) LIMIT 1`,
      [cleanNum || '__no_match__', trimmedIdent]
    );

    const hashToCompare = user ? user.password_hash : DUMMY_HASH;
    const isMatch = bcrypt.compareSync(password, hashToCompare);

    if (!user || !isMatch) {
      const lockStatus = recordFailedAttempt(db, trimmedIdent, ip);
      if (lockStatus.locked) {
        res.status(429).json({ error: 'Too many incorrect attempts. Login locked for 15 minutes.' });
        return;
      }
      res.status(401).json({
        error: `Invalid credentials. ${lockStatus.remaining} attempts remaining before temporary lockout.`,
      });
      return;
    }

    // Success: reset lockout
    resetLockout(db, trimmedIdent, ip);

    // Create session (7 days)
    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

    execute(
      db,
      'INSERT INTO sessions (token_hash, user_id, role, name, phone, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
      [tokenHash, user.id, user.role, user.name, user.phone, expiresAt]
    );

    res.cookie('cutline_session', token, {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      maxAge: 7 * 24 * 3600 * 1000,
    });

    res.json({
      success: true,
      token,
      user: {
        userId: user.id,
        role: user.role,
        name: user.name,
        phone: user.phone,
        email: user.email,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Logout
apiRouter.post('/auth/logout', async (req, res) => {
  const headerToken = (req.headers['x-cutline-token'] as string) || undefined;
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
  const cookieToken = req.cookies?.cutline_session;
  const token = headerToken || bearerToken || cookieToken;

  if (token) {
    const tokenHash = hashToken(token);
    const db = await getDb();
    execute(db, 'DELETE FROM sessions WHERE token_hash = ?', [tokenHash]);
  }
  res.clearCookie('cutline_session', {
    httpOnly: true,
    sameSite: 'none',
    secure: true,
  });
  res.json({ success: true });
});

// --- CUSTOMER ORDER CREATION ---

apiRouter.post('/orders', async (req, res) => {
  try {
    const user = await resolveUser(req);
    const { name, phone, email, service, deadline, budget, brief, link } = req.body;

    const customerName = (user.role === 'customer' ? user.name : name)?.trim();
    const customerPhone = cleanPhone(user.role === 'customer' ? user.phone || '' : phone);

    if (!customerName) {
      res.status(400).json({ error: 'Client name is required.' });
      return;
    }
    if (!customerPhone || customerPhone.length !== 10) {
      res.status(400).json({ error: 'Valid 10-digit mobile number is required.' });
      return;
    }
    if (!service || !service.trim()) {
      res.status(400).json({ error: 'Please select a service.' });
      return;
    }
    if (!deadline || !deadline.trim()) {
      res.status(400).json({ error: 'Project deadline is required.' });
      return;
    }
    if (!brief || brief.trim().length < 5) {
      res.status(400).json({ error: 'Please provide project details / brief (minimum 5 characters).' });
      return;
    }
    if (!link || !isValidUrl(link)) {
      res.status(400).json({ error: 'Please enter a valid link starting with http:// or https:// (e.g. Google Drive, YouTube, Dropbox).' });
      return;
    }

    const db = await getDb();
    const orderId = 'ord_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const orderCode = generateOrderCode();
    const now = new Date().toISOString();

    let orderPrice = Number(req.body.price) || 0;
    if (orderPrice <= 0) {
      const srvRows = queryAll<{ id: string; name: string; base_price?: number; price_text: string }>(
        db,
        'SELECT id, name, base_price, price_text FROM services'
      );
      orderPrice = resolveServicePrice(
        service.trim(),
        srvRows.map(r => ({
          id: r.id,
          name: r.name,
          base_price: Number(r.base_price) || 0,
          price_text: r.price_text,
          blurb: '',
          points: [],
          sort: 0,
        }))
      );
    }

    execute(
      db,
      `INSERT INTO orders (id, code, customer_name, phone, email, service, deadline, budget, brief, link, status, assignee_id, price, paid, billed_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'New', NULL, ?, 0, NULL, ?)`,
      [
        orderId,
        orderCode,
        customerName,
        customerPhone,
        email ? String(email).trim() : null,
        service.trim(),
        deadline.trim(),
        budget ? String(budget).trim() : null,
        brief.trim(),
        link.trim(),
        orderPrice,
        now,
      ]
    );

    const config = loadConfig();
    const waNumber = config.whatsappNumber || '919876543210';
    const waMessage = encodeURIComponent(
      `Hi ${config.businessName}! I just placed order *${orderCode}* for *${service}*.\nName: ${customerName}\nDeadline: ${deadline}\nBrief: ${brief.slice(0, 100)}...\nDrive Link: ${link}`
    );
    const whatsappUrl = `https://wa.me/${waNumber}?text=${waMessage}`;

    res.json({
      success: true,
      order: {
        code: orderCode,
        customer_name: customerName,
        phone: customerPhone,
        service,
        deadline,
        brief,
        link,
      },
      whatsappUrl,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Public hosted invoice view (accessible by client via WhatsApp link)
apiRouter.get('/invoices/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const db = await getDb();
    const order = queryOne<any>(db, 'SELECT * FROM orders WHERE LOWER(TRIM(code)) = LOWER(TRIM(?))', [code]);
    if (!order) {
      res.status(404).send('<h1>Invoice not found</h1>');
      return;
    }
    const config = loadConfig();
    const price = Number(order.price) || 0;
    const paid = Number(order.paid) || 0;
    const balance = Math.max(0, price - paid);
    const invoiceNumber = `INV-${order.code}`;
    const invoiceDate = new Date(order.billed_at || order.created_at).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const isPaid = price > 0 && paid >= price;
    const isPartial = paid > 0 && paid < price;
    const statusLabel = isPaid ? 'PAID' : isPartial ? 'PARTIAL' : 'UNPAID';

    const proofHtml = order.payment_proof
      ? `
    <div style="page-break-before: always; break-before: page; margin-top: 50px; padding-top: 30px; border-top: 2px dashed #cbd5e1;">
      <div class="header">
        <div>
          <div class="title" style="font-size: 22px;">Payment Verification & Transaction Proof</div>
          <div style="font-size: 13px; color: #64748b; margin-top: 4px;">Official Cutline Studio Accounts &bull; Page 2 of 2 &bull; Stored in 'transaction proofs'</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 16px; font-weight: 800;">${invoiceNumber}</div>
          <div style="font-size: 12px; color: #64748b;">Billed: ${invoiceDate}</div>
        </div>
      </div>
      <div style="background: #ecfdf5; border: 1px solid #10b981; color: #047857; padding: 12px 16px; border-radius: 12px; font-size: 13px; font-weight: 600; margin-bottom: 24px;">
        &#10003; Payment Verified &bull; Total Paid: ₹${paid.toLocaleString('en-IN')} of ₹${price.toLocaleString('en-IN')} (${statusLabel})
      </div>
      <div style="text-align: center; margin: 20px 0;">
        <img src="${order.payment_proof}" style="max-width: 100%; max-height: 700px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);" alt="Payment Screenshot Proof" />
      </div>
      ${order.payment_note ? `<div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 8px; font-size: 13px; color: #475569;"><strong>Transaction Notes:</strong> ${order.payment_note}</div>` : ''}
      <div class="footer">
        Certified payment proof screenshot permanently stored in 'transaction proofs' directory. Verified by Cutline Studio Administration.
      </div>
    </div>`
      : '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoiceNumber} - ${config.businessName || 'Cutline Studio'}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 30px 15px; }
    .invoice-box { max-width: 820px; margin: auto; padding: 35px; border: 1px solid #e2e8f0; background: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px -2px rgba(0,0,0,0.06); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f1f5f9; padding-bottom: 25px; margin-bottom: 30px; }
    .title { font-size: 26px; font-weight: 800; color: #4338ca; }
    .stamp { display: inline-block; padding: 6px 14px; border-radius: 8px; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; border: 2px solid; }
    .stamp-paid { color: #059669; border-color: #059669; background: #ecfdf5; }
    .stamp-partial { color: #d97706; border-color: #d97706; background: #fffbeb; }
    .stamp-unpaid { color: #dc2626; border-color: #dc2626; background: #fef2f2; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
    .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 8px; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .table th { background: #f8fafc; text-align: left; padding: 12px; font-size: 13px; color: #475569; border-bottom: 2px solid #e2e8f0; }
    .table td { padding: 14px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .total-box { margin-left: auto; width: 320px; border-top: 2px solid #e2e8f0; padding-top: 15px; }
    .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
    .total-due { font-size: 18px; font-weight: 800; color: #0f172a; border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 6px; }
    .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; }
    .actions-bar { max-width: 820px; margin: 0 auto 20px auto; display: flex; justify-content: flex-end; gap: 10px; }
    .btn { padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; text-decoration: none; }
    .btn-print { background: #4338ca; color: white; }
    @media print {
      body { background: #fff; padding: 0; }
      .invoice-box { border: none; box-shadow: none; padding: 0; }
      .actions-bar { display: none; }
    }
  </style>
</head>
<body>
  <div class="actions-bar">
    <button class="btn btn-print" onclick="window.print()">Print / Save as PDF</button>
  </div>
  <div class="invoice-box">
    <!-- PAGE 1: INVOICE -->
    <div class="header">
      <div>
        <div class="title">${config.businessName || 'Cutline Studio'}</div>
        <div style="font-size: 13px; color: #64748b; margin-top: 4px;">${config.tagline || 'Video Editing & Social Media Management'}</div>
        <div style="font-size: 13px; color: #64748b; margin-top: 2px;">Email: ${config.email} | WhatsApp: +${config.whatsappNumber}</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 20px; font-weight: 800;">${invoiceNumber}</div>
        <div style="font-size: 13px; color: #64748b; margin: 4px 0 10px 0;">Date: ${invoiceDate}</div>
        <div class="stamp stamp-${statusLabel.toLowerCase()}">${statusLabel}</div>
      </div>
    </div>

    <div class="grid">
      <div>
        <div class="section-title">Bill To:</div>
        <div style="font-size: 16px; font-weight: 700;">${order.customer_name || 'Client'}</div>
        <div style="font-size: 14px; color: #475569; margin-top: 4px;">Phone: +91 ${order.phone || '-'}</div>
        ${order.email ? `<div style="font-size: 14px; color: #475569;">Email: ${order.email}</div>` : ''}
      </div>
      <div>
        <div class="section-title">Project Reference:</div>
        <div style="font-size: 14px; color: #334155;"><strong>Service:</strong> ${order.service}</div>
        <div style="font-size: 14px; color: #334155; margin-top: 4px;"><strong>Target Deadline:</strong> ${order.deadline}</div>
      </div>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>Description & Deliverables</th>
          <th style="text-align: right; width: 140px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div style="font-weight: 600;">${order.service} Production</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">${order.brief}</div>
          </td>
          <td style="text-align: right; font-weight: 700; font-size: 15px;">₹${price.toLocaleString('en-IN')}</td>
        </tr>
      </tbody>
    </table>

    <div class="total-box">
      <div class="total-row"><span>Total Invoiced:</span><span style="font-weight: 600;">₹${price.toLocaleString('en-IN')}</span></div>
      <div class="total-row"><span>Amount Paid:</span><span style="font-weight: 600; color: #059669;">₹${paid.toLocaleString('en-IN')}</span></div>
      <div class="total-row total-due"><span>Balance Due:</span><span style="color: ${balance > 0 ? '#dc2626' : '#059669'};">₹${balance.toLocaleString('en-IN')}</span></div>
    </div>

    <div class="footer">
      Thank you for your business! Direct all payment slips and inquiries to WhatsApp +${config.whatsappNumber}.
      ${order.payment_proof ? '<div style="color: #059669; font-weight: 600; margin-top: 6px;">&#10003; Official transaction proof screenshot attached on Page 2</div>' : ''}
    </div>

    <!-- PAGE 2: TRANSACTION PROOF -->
    ${proofHtml}
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err: any) {
    res.status(500).send('Error generating invoice view: ' + err.message);
  }
});

// --- ADMIN API ---

// Admin data dashboard
apiRouter.get('/admin/data', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();

    const orders = queryAll<any>(
      db,
      `SELECT o.*, u.name as assignee_name 
       FROM orders o 
       LEFT JOIN users u ON o.assignee_id = u.id 
       ORDER BY o.created_at DESC`
    );

    const tasks = queryAll<any>(
      db,
      `SELECT t.*, u.name as assignee_name 
       FROM tasks t 
       LEFT JOIN users u ON t.assignee_id = u.id 
       ORDER BY t.created_at DESC`
    );

    const team = queryAll<any>(
      db,
      `SELECT id, role, name, phone, email, active, created_at 
       FROM users 
       WHERE role = 'freelancer' 
       ORDER BY name ASC`
    );

    // Compute metrics per team member
    const teamWithMetrics = team.map(member => {
      const assignedOrders = orders.filter(o => o.assignee_id === member.id);
      const activeOrders = assignedOrders.filter(o => o.status !== 'Delivered' && o.status !== 'Paid');
      const orderValue = assignedOrders.reduce((sum, o) => sum + (Number(o.price) || 0), 0);
      return {
        ...member,
        assignedCount: assignedOrders.length,
        activeCount: activeOrders.length,
        orderValue,
      };
    });

    // Overview Stats
    const newCount = orders.filter(o => o.status === 'New').length;
    const inProgressCount = orders.filter(o => o.status === 'In progress' || o.status === 'Assigned').length;
    const reviewCount = orders.filter(o => o.status === 'Review').length;
    const deliveredCount = orders.filter(o => o.status === 'Delivered').length;
    const totalOrderValue = orders.reduce((sum, o) => sum + (Number(o.price) || 0), 0);
    const totalCollected = orders.reduce((sum, o) => sum + (Number(o.paid) || 0), 0);
    const balanceDue = totalOrderValue - totalCollected;

    res.json({
      orders,
      tasks,
      team: teamWithMetrics,
      stats: {
        newCount,
        inProgressCount,
        reviewCount,
        deliveredCount,
        totalOrders: orders.length,
        totalOrderValue,
        totalCollected,
        balanceDue,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add manual order
apiRouter.post('/admin/orders', requireAdmin, async (req, res) => {
  try {
    const { customer_name, phone, email, service, deadline, budget, brief, link, price, assignee_id, status } = req.body;
    if (!customer_name || !phone || !service || !deadline || !brief) {
      res.status(400).json({ error: 'Customer name, phone, service, deadline, and brief are required.' });
      return;
    }

    const cleanNum = cleanPhone(phone);
    const db = await getDb();
    const orderId = 'ord_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const orderCode = generateOrderCode();
    let numPrice = Number(price) || 0;
    if (numPrice <= 0) {
      const srvRows = queryAll<{ id: string; name: string; base_price?: number; price_text: string }>(
        db,
        'SELECT id, name, base_price, price_text FROM services'
      );
      numPrice = resolveServicePrice(
        service.trim(),
        srvRows.map(r => ({
          id: r.id,
          name: r.name,
          base_price: Number(r.base_price) || 0,
          price_text: r.price_text,
          blurb: '',
          points: [],
          sort: 0,
        }))
      );
    }
    const finalStatus = status || (assignee_id ? 'Assigned' : 'New');

    execute(
      db,
      `INSERT INTO orders (id, code, customer_name, phone, email, service, deadline, budget, brief, link, status, assignee_id, price, paid, billed_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?)`,
      [
        orderId,
        orderCode,
        customer_name.trim(),
        cleanNum,
        email ? String(email).trim() : null,
        service.trim(),
        deadline.trim(),
        budget ? String(budget).trim() : null,
        brief.trim(),
        link ? link.trim() : 'https://drive.google.com',
        finalStatus,
        assignee_id || null,
        numPrice,
        new Date().toISOString(),
      ]
    );

    res.json({ success: true, code: orderCode });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update order (status, assigneeId, price, paid, billed, payment_proof, payment_note)
apiRouter.patch('/admin/orders/:code', requireAdmin, async (req, res) => {
  try {
    const { code } = req.params;
    const db = await getDb();
    const order = queryOne<any>(db, 'SELECT * FROM orders WHERE LOWER(TRIM(code)) = LOWER(TRIM(?))', [code]);
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    let { status, assigneeId, price, paid, billed, payment_proof, payment_note, proof_image } = req.body;

    let finalAssignee = assigneeId !== undefined ? (assigneeId ? String(assigneeId) : null) : order.assignee_id;
    let finalPrice = price !== undefined ? Number(price) : Number(order.price);
    let finalPaid = paid !== undefined ? Number(paid) : Number(order.paid);
    let finalBilledAt = billed ? (order.billed_at || new Date().toISOString()) : order.billed_at;

    let finalProof = order.payment_proof;
    if (proof_image && typeof proof_image === 'string' && proof_image.length > 20) {
      finalProof = saveProofImage(order.code, proof_image);
    } else if (payment_proof !== undefined) {
      finalProof = payment_proof;
    }

    let finalNote = payment_note !== undefined ? payment_note : order.payment_note;

    let finalStatus = status !== undefined ? String(status) : order.status;

    // Rule: Assigning a New order sets it to Assigned
    if (order.status === 'New' && finalAssignee && (!status || status === 'New')) {
      finalStatus = 'Assigned';
    }

    // Rule: If paid >= price (and price > 0), status becomes Paid automatically
    if (finalPrice > 0 && finalPaid >= finalPrice) {
      finalStatus = 'Paid';
    }

    execute(
      db,
      `UPDATE orders 
       SET status = ?, assignee_id = ?, price = ?, paid = ?, billed_at = ?, payment_proof = ?, payment_note = ? 
       WHERE LOWER(TRIM(code)) = LOWER(TRIM(?))`,
      [finalStatus, finalAssignee, finalPrice, finalPaid, finalBilledAt, finalProof, finalNote, code]
    );

    const updated = queryOne<any>(db, 'SELECT * FROM orders WHERE LOWER(TRIM(code)) = LOWER(TRIM(?))', [code]);
    res.json({
      success: true,
      order: updated,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Record Payment with Proof Upload
apiRouter.post('/admin/orders/:code/payment', requireAdmin, async (req, res) => {
  try {
    const { code } = req.params;
    const { amount, payment_mode, payment_note, proof_image } = req.body;
    const addAmt = Number(amount) || 0;

    const db = await getDb();
    const order = queryOne<any>(db, 'SELECT * FROM orders WHERE LOWER(TRIM(code)) = LOWER(TRIM(?))', [code]);
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    if (addAmt <= 0 && !proof_image) {
      res.status(400).json({ error: 'Please enter a payment amount or attach a screenshot proof.' });
      return;
    }

    let proofUrl = order.payment_proof || null;
    if (proof_image && typeof proof_image === 'string' && proof_image.length > 20) {
      proofUrl = saveProofImage(order.code, proof_image);
    }

    const currentPaid = Number(order.paid) || 0;
    const newPaid = currentPaid + addAmt;
    const price = Number(order.price) || 0;
    let newStatus = order.status;
    if (price > 0 && newPaid >= price) {
      newStatus = 'Paid';
    }

    const now = new Date().toISOString();
    const notePieces = [
      payment_mode ? `Mode: ${payment_mode}` : '',
      payment_note ? `Ref: ${payment_note}` : '',
      addAmt > 0 ? `+${addAmt}` : '',
      `Date: ${new Date().toLocaleDateString('en-IN')}`,
    ].filter(Boolean).join(' | ');

    const finalNote = notePieces
      ? (order.payment_note ? `${order.payment_note}\n${notePieces}` : notePieces)
      : order.payment_note;

    execute(
      db,
      `UPDATE orders 
       SET paid = ?, payment_proof = ?, payment_note = ?, billed_at = ?, status = ? 
       WHERE LOWER(TRIM(code)) = LOWER(TRIM(?))`,
      [newPaid, proofUrl, finalNote || null, now, newStatus, code]
    );

    const updated = queryOne<any>(db, 'SELECT * FROM orders WHERE LOWER(TRIM(code)) = LOWER(TRIM(?))', [code]);
    res.json({
      success: true,
      order: updated,
      proofUrl,
      addedAmount: addAmt,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete order
apiRouter.delete('/admin/orders/:code', requireAdmin, async (req, res) => {
  try {
    const { code } = req.params;
    const db = await getDb();
    execute(db, 'DELETE FROM orders WHERE LOWER(TRIM(code)) = LOWER(TRIM(?))', [code]);
    res.json({ success: true, message: `Order ${code} deleted completely.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Custom tasks
apiRouter.post('/admin/tasks', requireAdmin, async (req, res) => {
  try {
    const { title, description, assignee_id, deadline, price, paid } = req.body;
    if (!title || !description || !deadline) {
      res.status(400).json({ error: 'Title, description, and deadline are required.' });
      return;
    }

    const db = await getDb();
    const taskId = 'tsk_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const code = generateTaskCode();
    const numPrice = Number(price) || 0;
    const numPaid = Number(paid) || 0;
    const status = assignee_id ? 'Assigned' : 'Assigned';

    execute(
      db,
      `INSERT INTO tasks (id, code, title, description, assignee_id, deadline, status, price, paid, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        taskId,
        code,
        title.trim(),
        description.trim(),
        assignee_id || null,
        deadline.trim(),
        status,
        numPrice,
        numPaid,
        new Date().toISOString(),
      ]
    );

    res.json({ success: true, code });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.patch('/admin/tasks/:code', requireAdmin, async (req, res) => {
  try {
    const { code } = req.params;
    const db = await getDb();
    const task = queryOne<any>(db, 'SELECT * FROM tasks WHERE code = ?', [code]);
    if (!task) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }

    const { status, assignee_id, price, paid, deadline, title, description } = req.body;

    const finalStatus = status !== undefined ? String(status) : task.status;
    const finalAssignee = assignee_id !== undefined ? (assignee_id ? String(assignee_id) : null) : task.assignee_id;
    const finalPrice = price !== undefined ? Number(price) : Number(task.price);
    const finalPaid = paid !== undefined ? Number(paid) : Number(task.paid);
    const finalDeadline = deadline !== undefined ? String(deadline) : task.deadline;
    const finalTitle = title !== undefined ? String(title) : task.title;
    const finalDesc = description !== undefined ? String(description) : task.description;

    execute(
      db,
      `UPDATE tasks 
       SET status = ?, assignee_id = ?, price = ?, paid = ?, deadline = ?, title = ?, description = ? 
       WHERE code = ?`,
      [finalStatus, finalAssignee, finalPrice, finalPaid, finalDeadline, finalTitle, finalDesc, code]
    );

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/admin/tasks/:code', requireAdmin, async (req, res) => {
  try {
    const { code } = req.params;
    const db = await getDb();
    execute(db, 'DELETE FROM tasks WHERE LOWER(TRIM(code)) = LOWER(TRIM(?))', [code]);
    res.json({ success: true, message: `Task ${code} deleted.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Team management
apiRouter.post('/admin/team', requireAdmin, async (req, res) => {
  try {
    const { name, phone, email, password } = req.body;
    if (!name || (!phone && !email) || !password) {
      res.status(400).json({ error: 'Name, password, and at least one contact (phone or email) are required.' });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: 'Temporary password must be at least 8 characters long.' });
      return;
    }

    const cleanNum = phone ? cleanPhone(phone) : null;
    const trimmedEmail = email ? String(email).trim().toLowerCase() : null;

    const db = await getDb();

    // Check collision
    if (cleanNum) {
      const existPhone = queryOne(db, 'SELECT id FROM users WHERE phone = ?', [cleanNum]);
      if (existPhone) {
        res.status(400).json({ error: 'A team member with this phone number already exists.' });
        return;
      }
    }
    if (trimmedEmail) {
      const existEmail = queryOne(db, 'SELECT id FROM users WHERE LOWER(email) = ?', [trimmedEmail]);
      if (existEmail) {
        res.status(400).json({ error: 'A team member with this email already exists.' });
        return;
      }
    }

    const hash = bcrypt.hashSync(password, 10);
    const userId = 'usr_free_' + Date.now();

    execute(
      db,
      `INSERT INTO users (id, role, name, phone, email, password_hash, active, created_at)
       VALUES (?, 'freelancer', ?, ?, ?, ?, 1, ?)`,
      [userId, name.trim(), cleanNum, trimmedEmail, hash, new Date().toISOString()]
    );

    res.json({ success: true, userId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reset password
apiRouter.post('/admin/team/:id/password', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    if (!password || password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      return;
    }

    const db = await getDb();
    const hash = bcrypt.hashSync(password, 10);
    execute(db, 'UPDATE users SET password_hash = ? WHERE id = ?', [hash, id]);
    // Invalidate sessions for this user so they must re-login with new password
    execute(db, 'DELETE FROM sessions WHERE user_id = ?', [id]);

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Remove freelancer
apiRouter.delete('/admin/team/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();

    // End their sessions
    execute(db, 'DELETE FROM sessions WHERE user_id = ?', [id]);
    // Orders and tasks become unassigned
    execute(db, 'UPDATE orders SET assignee_id = NULL WHERE assignee_id = ?', [id]);
    execute(db, 'UPDATE tasks SET assignee_id = NULL WHERE assignee_id = ?', [id]);
    // Delete user
    execute(db, 'DELETE FROM users WHERE id = ?', [id]);

    res.json({ success: true, message: 'Freelancer removed. Assigned orders and tasks are now unassigned.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Service management
apiRouter.post('/admin/services', requireAdmin, async (req, res) => {
  try {
    const { name, base_price, price_text, blurb, points, sort } = req.body;
    if (!name || !price_text || !blurb) {
      res.status(400).json({ error: 'Service name, price text, and description are required.' });
      return;
    }

    const db = await getDb();
    const serviceId = 'srv_' + Date.now();
    const pointsJson = Array.isArray(points)
      ? JSON.stringify(points)
      : JSON.stringify(String(points || '').split('\n').filter(Boolean));
    const numBasePrice = Number(base_price) || 0;

    execute(
      db,
      `INSERT INTO services (id, name, base_price, price_text, blurb, points, sort) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [serviceId, name.trim(), numBasePrice, price_text.trim(), blurb.trim(), pointsJson, Number(sort) || 0]
    );

    res.json({ success: true, serviceId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.patch('/admin/services/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, base_price, price_text, blurb, points, sort } = req.body;
    const db = await getDb();

    const existing = queryOne(db, 'SELECT * FROM services WHERE id = ?', [id]);
    if (!existing) {
      res.status(404).json({ error: 'Service not found.' });
      return;
    }

    const pointsJson = points !== undefined
      ? (Array.isArray(points) ? JSON.stringify(points) : JSON.stringify(String(points).split('\n').filter(Boolean)))
      : existing.points;

    const numBasePrice = base_price !== undefined ? (Number(base_price) || 0) : null;

    execute(
      db,
      `UPDATE services 
       SET name = COALESCE(?, name),
           base_price = COALESCE(?, base_price),
           price_text = COALESCE(?, price_text),
           blurb = COALESCE(?, blurb),
           points = ?,
           sort = COALESCE(?, sort) 
       WHERE id = ?`,
      [name?.trim() || null, numBasePrice, price_text?.trim() || null, blurb?.trim() || null, pointsJson, sort !== undefined ? Number(sort) : null, id]
    );

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/admin/services/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    execute(db, 'DELETE FROM services WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List all available snapshots
apiRouter.get('/admin/backups', requireAdmin, (req, res) => {
  try {
    const backupDir = path.resolve(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      res.json({ snapshots: [] });
      return;
    }
    const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.sqlite'));
    const snapshots = files.map(file => {
      const filePath = path.join(backupDir, file);
      const stat = fs.statSync(filePath);
      return {
        filename: file,
        size: stat.size,
        createdAt: stat.mtime.toISOString(),
      };
    });
    // Sort descending by date (newest first)
    snapshots.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ snapshots });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin backup trigger - create a new snapshot
apiRouter.post('/admin/backup', requireAdmin, (req, res) => {
  try {
    saveDb();
    const backupDir = path.resolve(process.cwd(), 'backups');
    const dataDir = path.resolve(process.cwd(), 'data');
    const dbFile = path.join(dataDir, 'cutline.sqlite');

    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dest = path.join(backupDir, `cutline_backup_${timestamp}.sqlite`);
    if (fs.existsSync(dbFile)) {
      fs.copyFileSync(dbFile, dest);
    }
    const stat = fs.statSync(dest);
    res.json({
      success: true,
      filename: path.basename(dest),
      size: stat.size,
      createdAt: stat.mtime.toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Restore database to a snapshot state - strictly requires admin password confirmation
apiRouter.post('/admin/restore', requireAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const { filename, password } = req.body;

    if (!filename || typeof filename !== 'string') {
      res.status(400).json({ error: 'Snapshot filename is required.' });
      return;
    }

    if (!password || typeof password !== 'string') {
      res.status(400).json({ error: 'Admin password is required to confirm database restore.' });
      return;
    }

    const db = await getDb();
    const adminUser = queryOne<{ password_hash: string }>(
      db,
      'SELECT password_hash FROM users WHERE id = ?',
      [user.userId]
    );

    if (!adminUser) {
      res.status(401).json({ error: 'Admin user not found.' });
      return;
    }

    // Verify admin password
    const isPasswordValid = bcrypt.compareSync(password, adminUser.password_hash);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Incorrect admin password. Database restore aborted.' });
      return;
    }

    const safeFilename = path.basename(filename);
    if (!safeFilename.endsWith('.sqlite')) {
      res.status(400).json({ error: 'Invalid snapshot format.' });
      return;
    }

    const backupDir = path.resolve(process.cwd(), 'backups');
    const snapshotPath = path.join(backupDir, safeFilename);

    if (!fs.existsSync(snapshotPath)) {
      res.status(404).json({ error: 'Selected snapshot file does not exist.' });
      return;
    }

    // Perform atomic snapshot restoration
    await restoreDbFromSnapshot(snapshotPath);

    res.json({
      success: true,
      message: `Database successfully restored to snapshot: ${safeFilename}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete an old snapshot
apiRouter.delete('/admin/backups/:filename', requireAdmin, (req, res) => {
  try {
    const { filename } = req.params;
    const safeFilename = path.basename(filename);
    const backupDir = path.resolve(process.cwd(), 'backups');
    const target = path.join(backupDir, safeFilename);

    if (fs.existsSync(target)) {
      fs.unlinkSync(target);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Download full project ZIP for running locally on Windows / Pi
apiRouter.get('/admin/export-zip', (req, res) => {
  try {
    const zipPath = path.resolve(process.cwd(), 'public', 'cutline-studio-project.zip');
    if (fs.existsSync(zipPath)) {
      res.download(zipPath, 'cutline-studio-project.zip');
    } else {
      res.status(404).json({ error: 'Zip file not generated yet.' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
// ==========================================
// ADMIN COMMISSION & FREELANCER PAYOUT LEDGER
// ==========================================

// 1. Get Commission Ledger, Freelancer Breakdown, and Overall Stats
apiRouter.get('/admin/commission', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const cfg = loadConfig();
    const defaultRate = typeof cfg.defaultCommissionRate === 'number' ? cfg.defaultCommissionRate : 30;

    // Fetch team members map
    const teamMembers = queryAll<{ id: string; name: string; phone: string | null }>(
      db,
      "SELECT id, name, phone FROM users WHERE role = 'freelancer'"
    );
    const teamMap = new Map<string, { name: string; phone: string | null }>();
    teamMembers.forEach(m => teamMap.set(m.id, { name: m.name, phone: m.phone }));

    // Fetch all orders that have an assigned freelancer
    const orders = queryAll<any>(
      db,
      "SELECT * FROM orders WHERE assignee_id IS NOT NULL AND assignee_id != '' ORDER BY created_at DESC"
    );

    // Fetch all tasks that have an assigned freelancer
    const tasks = queryAll<any>(
      db,
      "SELECT * FROM tasks WHERE assignee_id IS NOT NULL AND assignee_id != '' ORDER BY created_at DESC"
    );

    const records: any[] = [];

    // Process Orders
    for (const ord of orders) {
      const rate = typeof ord.commission_rate === 'number' && !isNaN(ord.commission_rate)
        ? ord.commission_rate
        : defaultRate;
      const clientPaid = Number(ord.paid || 0);
      const adminShare = Math.round(clientPaid * (rate / 100));
      const freelancerShare = clientPaid - adminShare;
      const assigneeInfo = teamMap.get(ord.assignee_id) || { name: 'Unknown Editor', phone: null };

      records.push({
        id: ord.id,
        code: ord.code,
        type: 'order',
        title: `${ord.service} for ${ord.customer_name}`,
        clientName: ord.customer_name,
        service: ord.service,
        assigneeId: ord.assignee_id,
        assigneeName: assigneeInfo.name,
        totalPrice: Number(ord.price || 0),
        clientPaid,
        commissionRate: rate,
        adminShare,
        freelancerShare,
        payoutStatus: ord.freelancer_payout_status || 'pending',
        payoutAt: ord.freelancer_payout_at || null,
        payoutNote: ord.freelancer_payout_note || null,
        payoutProof: ord.freelancer_payout_proof || null,
        createdAt: ord.created_at,
      });
    }

    // Process Tasks
    for (const tsk of tasks) {
      const rate = typeof tsk.commission_rate === 'number' && !isNaN(tsk.commission_rate)
        ? tsk.commission_rate
        : defaultRate;
      const clientPaid = Number(tsk.paid || 0);
      const adminShare = Math.round(clientPaid * (rate / 100));
      const freelancerShare = clientPaid - adminShare;
      const assigneeInfo = teamMap.get(tsk.assignee_id) || { name: 'Unknown Editor', phone: null };

      records.push({
        id: tsk.id,
        code: tsk.code,
        type: 'task',
        title: tsk.title,
        clientName: 'Studio Internal / Client Task',
        service: 'Custom Task',
        assigneeId: tsk.assignee_id,
        assigneeName: assigneeInfo.name,
        totalPrice: Number(tsk.price || 0),
        clientPaid,
        commissionRate: rate,
        adminShare,
        freelancerShare,
        payoutStatus: tsk.freelancer_payout_status || 'pending',
        payoutAt: tsk.freelancer_payout_at || null,
        payoutNote: tsk.freelancer_payout_note || null,
        payoutProof: tsk.freelancer_payout_proof || null,
        createdAt: tsk.created_at,
      });
    }

    // Sort records descending by createdAt
    records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Aggregate by Freelancer
    const summariesMap = new Map<string, any>();
    teamMembers.forEach(m => {
      summariesMap.set(m.id, {
        freelancerId: m.id,
        freelancerName: m.name,
        phone: m.phone || undefined,
        ordersCount: 0,
        totalPaidByClients: 0,
        adminCommissionEarned: 0,
        freelancerTotalEarned: 0,
        pendingPayouts: 0,
        settledPayouts: 0,
      });
    });

    let totalClientPaid = 0;
    let totalAdminCommission = 0;
    let totalFreelancerShare = 0;
    let totalPendingPayouts = 0;
    let totalSettledPayouts = 0;

    for (const rec of records) {
      totalClientPaid += rec.clientPaid;
      totalAdminCommission += rec.adminShare;
      totalFreelancerShare += rec.freelancerShare;

      if (rec.payoutStatus === 'settled') {
        totalSettledPayouts += rec.freelancerShare;
      } else {
        totalPendingPayouts += rec.freelancerShare;
      }

      let summary = summariesMap.get(rec.assigneeId);
      if (!summary) {
        summary = {
          freelancerId: rec.assigneeId,
          freelancerName: rec.assigneeName,
          ordersCount: 0,
          totalPaidByClients: 0,
          adminCommissionEarned: 0,
          freelancerTotalEarned: 0,
          pendingPayouts: 0,
          settledPayouts: 0,
        };
        summariesMap.set(rec.assigneeId, summary);
      }

      summary.ordersCount += 1;
      summary.totalPaidByClients += rec.clientPaid;
      summary.adminCommissionEarned += rec.adminShare;
      summary.freelancerTotalEarned += rec.freelancerShare;
      if (rec.payoutStatus === 'settled') {
        summary.settledPayouts += rec.freelancerShare;
      } else {
        summary.pendingPayouts += rec.freelancerShare;
      }
    }

    const freelancerSummaries = Array.from(summariesMap.values());

    res.json({
      defaultRate,
      records,
      freelancerSummaries,
      stats: {
        defaultRate,
        totalClientPaid,
        totalAdminCommission,
        totalFreelancerShare,
        totalPendingPayouts,
        totalSettledPayouts,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Update default commission rate
apiRouter.patch('/admin/commission/rate', requireAdmin, (req, res) => {
  try {
    const { rate } = req.body;
    const numRate = Number(rate);
    if (isNaN(numRate) || numRate < 0 || numRate > 100) {
      res.status(400).json({ error: 'Commission rate must be a percentage between 0 and 100.' });
      return;
    }

    const configPath = path.resolve(process.cwd(), 'config.json');
    let currentConfig: any = {};
    if (fs.existsSync(configPath)) {
      currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
    currentConfig.defaultCommissionRate = numRate;
    fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 2));

    res.json({ success: true, defaultRate: numRate });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Update commission rate split for a specific order or task
apiRouter.patch('/admin/commission/split/:code', requireAdmin, async (req, res) => {
  try {
    const { code } = req.params;
    const { commission_rate } = req.body;
    const db = await getDb();

    let rateVal: number | null = null;
    if (commission_rate !== null && commission_rate !== undefined && commission_rate !== '') {
      rateVal = Number(commission_rate);
      if (isNaN(rateVal) || rateVal < 0 || rateVal > 100) {
        res.status(400).json({ error: 'Commission rate must be between 0 and 100.' });
        return;
      }
    }

    if (code.startsWith('TSK-')) {
      execute(db, 'UPDATE tasks SET commission_rate = ? WHERE code = ?', [rateVal, code]);
    } else {
      execute(db, 'UPDATE orders SET commission_rate = ? WHERE code = ?', [rateVal, code]);
    }
    saveDb();
    res.json({ success: true, code, commission_rate: rateVal });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Update payout status for a specific order or task
apiRouter.patch('/admin/commission/payout/:code', requireAdmin, async (req, res) => {
  try {
    const { code } = req.params;
    const { status, note, proof_image } = req.body;

    if (status !== 'settled' && status !== 'pending') {
      res.status(400).json({ error: "Payout status must be 'settled' or 'pending'." });
      return;
    }

    const db = await getDb();
    let payoutAt: string | null = null;
    let payoutNote: string | null = null;
    let payoutProof: string | null = null;

    if (status === 'settled') {
      payoutAt = new Date().toISOString();
      payoutNote = typeof note === 'string' && note.trim() ? note.trim() : null;
      if (proof_image && typeof proof_image === 'string' && proof_image.startsWith('data:')) {
        payoutProof = saveProofImage(`${code}-payout`, proof_image);
      } else if (proof_image && typeof proof_image === 'string') {
        payoutProof = proof_image;
      }
    }

    if (code.startsWith('TSK-')) {
      const existing = queryOne<any>(db, 'SELECT freelancer_payout_proof FROM tasks WHERE code = ?', [code]);
      const finalProof = status === 'settled' ? (payoutProof || existing?.freelancer_payout_proof || null) : null;
      execute(
        db,
        'UPDATE tasks SET freelancer_payout_status = ?, freelancer_payout_at = ?, freelancer_payout_note = ?, freelancer_payout_proof = ? WHERE code = ?',
        [status, payoutAt, payoutNote, finalProof, code]
      );
    } else {
      const existing = queryOne<any>(db, 'SELECT freelancer_payout_proof FROM orders WHERE code = ?', [code]);
      const finalProof = status === 'settled' ? (payoutProof || existing?.freelancer_payout_proof || null) : null;
      execute(
        db,
        'UPDATE orders SET freelancer_payout_status = ?, freelancer_payout_at = ?, freelancer_payout_note = ?, freelancer_payout_proof = ? WHERE code = ?',
        [status, payoutAt, payoutNote, finalProof, code]
      );
    }
    saveDb();
    res.json({ success: true, code, status, payoutAt, payoutNote, payoutProof });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Settle all pending payouts for a freelancer in 1 click
apiRouter.post('/admin/commission/settle-all/:freelancerId', requireAdmin, async (req, res) => {
  try {
    const { freelancerId } = req.params;
    const { note, proof_image } = req.body;
    const db = await getDb();
    const now = new Date().toISOString();
    const payoutNote = typeof note === 'string' && note.trim() ? note.trim() : 'Bulk settlement paid to freelancer';

    let payoutProof: string | null = null;
    if (proof_image && typeof proof_image === 'string' && proof_image.startsWith('data:')) {
      payoutProof = saveProofImage(`bulk-${freelancerId}`, proof_image);
    } else if (proof_image && typeof proof_image === 'string') {
      payoutProof = proof_image;
    }

    execute(
      db,
      "UPDATE orders SET freelancer_payout_status = 'settled', freelancer_payout_at = ?, freelancer_payout_note = ?, freelancer_payout_proof = COALESCE(?, freelancer_payout_proof) WHERE assignee_id = ? AND (freelancer_payout_status = 'pending' OR freelancer_payout_status IS NULL)",
      [now, payoutNote, payoutProof, freelancerId]
    );

    execute(
      db,
      "UPDATE tasks SET freelancer_payout_status = 'settled', freelancer_payout_at = ?, freelancer_payout_note = ?, freelancer_payout_proof = COALESCE(?, freelancer_payout_proof) WHERE assignee_id = ? AND (freelancer_payout_status = 'pending' OR freelancer_payout_status IS NULL)",
      [now, payoutNote, payoutProof, freelancerId]
    );

    saveDb();
    res.json({ success: true, freelancerId, settledAt: now, payoutProof });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. View Official Freelancer Payout Bill / Remittance Voucher HTML
apiRouter.get('/payout-voucher/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const db = await getDb();
    const config = loadConfig();
    const defaultRate = typeof config.defaultCommissionRate === 'number' ? config.defaultCommissionRate : 35;

    let item: any = null;
    let isTask = false;

    if (code.startsWith('TSK-')) {
      item = queryOne<any>(db, 'SELECT * FROM tasks WHERE code = ?', [code]);
      isTask = true;
    } else {
      item = queryOne<any>(db, 'SELECT * FROM orders WHERE code = ?', [code]);
    }

    if (!item) {
      res.status(404).send('<h1>Payout voucher not found</h1>');
      return;
    }

    const freelancer = item.assignee_id
      ? queryOne<any>(db, 'SELECT name, phone, email FROM users WHERE id = ?', [item.assignee_id])
      : null;

    const clientPaid = Number(item.paid || 0);
    const rate = typeof item.commission_rate === 'number' && !isNaN(item.commission_rate) ? item.commission_rate : defaultRate;
    const agencyShare = Math.round(clientPaid * (rate / 100));
    const netPaid = clientPaid - agencyShare;

    const voucherNumber = `VCH-${code}`;
    const voucherDate = new Date(item.freelancer_payout_at || item.created_at).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const isSettled = item.freelancer_payout_status === 'settled';
    const statusLabel = isSettled ? 'SETTLED & PAID' : 'PENDING SETTLEMENT';

    const proofHtml = item.freelancer_payout_proof
      ? `
    <div style="page-break-before: always; break-before: page; margin-top: 50px; padding-top: 30px; border-top: 2px dashed #cbd5e1;">
      <div class="header">
        <div>
          <div class="title" style="font-size: 22px;">Verified Payment Proof Screenshot</div>
          <div style="font-size: 13px; color: #64748b; margin-top: 4px;">Cutline Studio Freelancer Settlement Slip &bull; Page 2 of 2</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 16px; font-weight: 800;">${voucherNumber}</div>
          <div style="font-size: 12px; color: #64748b;">Date: ${voucherDate}</div>
        </div>
      </div>
      <div style="background: #ecfdf5; border: 1px solid #10b981; color: #047857; padding: 12px 16px; border-radius: 12px; font-size: 13px; font-weight: 600; margin-bottom: 24px;">
        &#10003; Transaction Proof Attached &bull; Net Amount Transferred: ₹${netPaid.toLocaleString('en-IN')}
      </div>
      <div style="text-align: center; margin: 20px 0;">
        <img src="${item.freelancer_payout_proof}" style="max-width: 100%; max-height: 700px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);" alt="Payment Transfer Screenshot" />
      </div>
      ${item.freelancer_payout_note ? `<div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 8px; font-size: 13px; color: #475569;"><strong>Settlement Reference / Note:</strong> ${item.freelancer_payout_note}</div>` : ''}
      <div class="footer">
        Certified settlement voucher issued by Cutline Studio Administration. Proof archived permanently.
      </div>
    </div>`
      : '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Freelancer Payout Voucher ${voucherNumber} - ${config.businessName || 'Cutline Studio'}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 30px 15px; }
    .invoice-box { max-width: 820px; margin: auto; padding: 35px; border: 1px solid #e2e8f0; background: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px -2px rgba(0,0,0,0.06); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f1f5f9; padding-bottom: 25px; margin-bottom: 30px; }
    .title { font-size: 26px; font-weight: 800; color: #4338ca; }
    .stamp { display: inline-block; padding: 6px 14px; border-radius: 8px; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; border: 2px solid; }
    .stamp-settled { color: #059669; border-color: #059669; background: #ecfdf5; }
    .stamp-pending { color: #d97706; border-color: #d97706; background: #fffbeb; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
    .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 8px; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .table th { background: #f8fafc; text-align: left; padding: 12px; font-size: 13px; color: #475569; border-bottom: 2px solid #e2e8f0; }
    .table td { padding: 14px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .total-box { margin-left: auto; width: 340px; border-top: 2px solid #e2e8f0; padding-top: 15px; }
    .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
    .total-net { font-size: 19px; font-weight: 800; color: #059669; border-top: 2px solid #e2e8f0; padding-top: 10px; margin-top: 6px; }
    .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; }
    .actions-bar { max-width: 820px; margin: 0 auto 20px auto; display: flex; justify-content: flex-end; gap: 10px; }
    .btn { padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; text-decoration: none; }
    .btn-print { background: #4338ca; color: white; }
    @media print {
      body { background: #fff; padding: 0; }
      .invoice-box { border: none; box-shadow: none; padding: 0; }
      .actions-bar { display: none; }
    }
  </style>
</head>
<body>
  <div class="actions-bar">
    <button class="btn btn-print" onclick="window.print()">Print / Save as PDF</button>
  </div>
  <div class="invoice-box">
    <!-- PAGE 1: PAYOUT BILL VOUCHER -->
    <div class="header">
      <div>
        <div class="title">${config.businessName || 'Cutline Studio'}</div>
        <div style="font-size: 14px; font-weight: 700; color: #1e293b; margin-top: 3px;">Freelancer Settlement Bill & Payout Voucher</div>
        <div style="font-size: 13px; color: #64748b; margin-top: 2px;">Email: ${config.email} | WhatsApp: +${config.whatsappNumber}</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 20px; font-weight: 800; font-family: monospace;">${voucherNumber}</div>
        <div style="font-size: 13px; color: #64748b; margin: 4px 0 10px 0;">Settled: ${voucherDate}</div>
        <div class="stamp ${isSettled ? 'stamp-settled' : 'stamp-pending'}">${statusLabel}</div>
      </div>
    </div>

    <div class="grid">
      <div>
        <div class="section-title">Remitted To (Freelancer):</div>
        <div style="font-size: 16px; font-weight: 700;">${freelancer?.name || 'Freelancer'}</div>
        ${freelancer?.phone ? `<div style="font-size: 14px; color: #475569; margin-top: 4px;">Phone: +91 ${freelancer.phone}</div>` : ''}
        ${freelancer?.email ? `<div style="font-size: 14px; color: #475569;">Email: ${freelancer.email}</div>` : ''}
      </div>
      <div>
        <div class="section-title">Project Reference:</div>
        <div style="font-size: 14px; color: #334155;"><strong>Ref Code:</strong> <span style="font-family: monospace;">${code}</span></div>
        <div style="font-size: 14px; color: #334155; margin-top: 4px;"><strong>Service/Task:</strong> ${isTask ? item.title : item.service}</div>
        <div style="font-size: 14px; color: #334155; margin-top: 4px;"><strong>Deadline:</strong> ${item.deadline}</div>
      </div>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>Breakdown / Payout Calculation</th>
          <th style="text-align: right; width: 140px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div style="font-weight: 600;">Total Client Payment Received</div>
            <div style="font-size: 12px; color: #64748b;">Gross payment received for project deliverable</div>
          </td>
          <td style="text-align: right; font-weight: 600;">₹${clientPaid.toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td>
            <div style="font-weight: 600; color: #4338ca;">Agency Commission Share Deducted (${rate}%)</div>
            <div style="font-size: 12px; color: #64748b;">Cutline Studio agency management, acquisition, & infrastructure fee</div>
          </td>
          <td style="text-align: right; font-weight: 600; color: #4338ca;">-₹${agencyShare.toLocaleString('en-IN')}</td>
        </tr>
      </tbody>
    </table>

    <div class="total-box">
      <div class="total-row">
        <span>Gross Client Paid:</span>
        <span>₹${clientPaid.toLocaleString('en-IN')}</span>
      </div>
      <div class="total-row" style="color: #4338ca;">
        <span>Agency Cut (-${rate}%):</span>
        <span>-₹${agencyShare.toLocaleString('en-IN')}</span>
      </div>
      <div class="total-row total-net">
        <span>Net Paid to Editor:</span>
        <span>₹${netPaid.toLocaleString('en-IN')}</span>
      </div>
    </div>

    ${item.freelancer_payout_note ? `
    <div style="margin-top: 25px; padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">
      <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">Settlement Note & Transaction Details:</div>
      <div style="font-size: 14px; color: #334155;">${item.freelancer_payout_note}</div>
    </div>` : ''}

    <div class="footer">
      Thank you for your creative contributions to Cutline Studio! For any payment questions, contact admin@cutlinestudio.com.
    </div>
  </div>

  ${proofHtml}
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err: any) {
    res.status(500).send(`<h1>Error generating payout voucher</h1><p>${err.message}</p>`);
  }
});

// --- FREELANCER API ---
// Strictly enforces confidentiality of client details (no phone, no email, no client margin),
// while providing complete payout transparency (gross client payment received, agency commission deduction, net freelancer payout, settlement bill & proof screenshot).

apiRouter.get('/my', requireFreelancer, async (req, res) => {
  try {
    const user = (req as any).user as AuthUser;
    const db = await getDb();
    const config = loadConfig();
    const defaultRate = typeof config.defaultCommissionRate === 'number' ? config.defaultCommissionRate : 35;

    // Query orders assigned to this freelancer
    const rawOrders = queryAll<any>(
      db,
      `SELECT id, code, service, deadline, brief, link, status, created_at,
              paid, commission_rate, freelancer_payout_status, freelancer_payout_at, freelancer_payout_note, freelancer_payout_proof 
       FROM orders 
       WHERE assignee_id = ? 
       ORDER BY created_at DESC`,
      [user.userId]
    );

    const orders = rawOrders.map(ord => {
      const clientPaid = Number(ord.paid || 0);
      const rate = typeof ord.commission_rate === 'number' && !isNaN(ord.commission_rate) ? ord.commission_rate : defaultRate;
      const agencyDeduction = Math.round(clientPaid * (rate / 100));
      const freelancerNetEarned = Math.max(0, clientPaid - agencyDeduction);
      return {
        id: ord.id,
        code: ord.code,
        service: ord.service,
        deadline: ord.deadline,
        brief: ord.brief,
        link: ord.link,
        status: ord.status,
        created_at: ord.created_at,
        clientPaid,
        commissionRate: rate,
        agencyDeduction,
        freelancerNetEarned,
        freelancer_payout_status: ord.freelancer_payout_status || 'pending',
        freelancer_payout_at: ord.freelancer_payout_at || null,
        freelancer_payout_note: ord.freelancer_payout_note || null,
        freelancer_payout_proof: ord.freelancer_payout_proof || null,
      };
    });

    // Query tasks assigned to this freelancer
    const rawTasks = queryAll<any>(
      db,
      `SELECT id, code, title, description, deadline, status, price, paid, created_at,
              commission_rate, freelancer_payout_status, freelancer_payout_at, freelancer_payout_note, freelancer_payout_proof 
       FROM tasks 
       WHERE assignee_id = ? 
       ORDER BY created_at DESC`,
      [user.userId]
    );

    const tasks = rawTasks.map(tsk => {
      const clientPaid = Number(tsk.paid || 0);
      const rate = typeof tsk.commission_rate === 'number' && !isNaN(tsk.commission_rate) ? tsk.commission_rate : defaultRate;
      const agencyDeduction = Math.round(clientPaid * (rate / 100));
      const freelancerNetEarned = Math.max(0, clientPaid - agencyDeduction);
      return {
        id: tsk.id,
        code: tsk.code,
        title: tsk.title,
        description: tsk.description,
        deadline: tsk.deadline,
        status: tsk.status,
        price: Number(tsk.price || 0),
        paid: Number(tsk.paid || 0),
        created_at: tsk.created_at,
        clientPaid,
        commissionRate: rate,
        agencyDeduction,
        freelancerNetEarned,
        freelancer_payout_status: tsk.freelancer_payout_status || 'pending',
        freelancer_payout_at: tsk.freelancer_payout_at || null,
        freelancer_payout_note: tsk.freelancer_payout_note || null,
        freelancer_payout_proof: tsk.freelancer_payout_proof || null,
      };
    });

    const activeOrders = orders.filter(o => o.status !== 'Delivered' && o.status !== 'Paid').length;
    const deliveredOrders = orders.filter(o => o.status === 'Delivered').length;

    // Payout computations across orders and tasks
    const allAssigned = [...orders, ...tasks];
    const totalNetEarned = allAssigned.reduce((sum, item) => sum + item.freelancerNetEarned, 0);
    const totalSettledPayouts = allAssigned
      .filter(item => item.freelancer_payout_status === 'settled')
      .reduce((sum, item) => sum + item.freelancerNetEarned, 0);
    const totalPendingPayouts = allAssigned
      .filter(item => item.freelancer_payout_status !== 'settled' && item.clientPaid > 0)
      .reduce((sum, item) => sum + item.freelancerNetEarned, 0);

    const totalEarnings = tasks.reduce((sum, t) => sum + (Number(t.price) || 0), 0);
    const receivedEarnings = tasks.reduce((sum, t) => sum + (Number(t.paid) || 0), 0);
    const pendingEarnings = totalEarnings - receivedEarnings;

    res.json({
      orders,
      tasks,
      stats: {
        assignedOrders: orders.length,
        activeOrders,
        deliveredOrders,
        totalTasks: tasks.length,
        totalEarnings,
        receivedEarnings,
        pendingEarnings,
        totalNetEarned,
        totalSettledPayouts,
        totalPendingPayouts,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Freelancer update order status
apiRouter.patch('/my/orders/:code', requireFreelancer, async (req, res) => {
  try {
    const user = (req as any).user as AuthUser;
    const { code } = req.params;
    const { status } = req.body;

    const allowedStatuses = ['Assigned', 'In progress', 'Review', 'Delivered'];
    if (!allowedStatuses.includes(status)) {
      res.status(400).json({
        error: `Freelancer can only update status to: ${allowedStatuses.join(', ')}. Paid status is locked.`,
      });
      return;
    }

    const db = await getDb();
    const order = queryOne<any>(
      db,
      'SELECT id, assignee_id FROM orders WHERE code = ?',
      [code]
    );

    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    if (order.assignee_id !== user.userId) {
      res.status(403).json({ error: 'You can only update orders assigned to you.' });
      return;
    }

    execute(db, 'UPDATE orders SET status = ? WHERE code = ?', [status, code]);
    res.json({ success: true, status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Freelancer update task status
apiRouter.patch('/my/tasks/:code', requireFreelancer, async (req, res) => {
  try {
    const user = (req as any).user as AuthUser;
    const { code } = req.params;
    const { status } = req.body;

    const allowedStatuses = ['Assigned', 'In progress', 'Review', 'Delivered'];
    if (!allowedStatuses.includes(status)) {
      res.status(400).json({
        error: `Freelancer can only update status to: ${allowedStatuses.join(', ')}. Paid status is locked.`,
      });
      return;
    }

    const db = await getDb();
    const task = queryOne<any>(
      db,
      'SELECT id, assignee_id FROM tasks WHERE code = ?',
      [code]
    );

    if (!task) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }

    if (task.assignee_id !== user.userId) {
      res.status(403).json({ error: 'You can only update tasks assigned to you.' });
      return;
    }

    execute(db, 'UPDATE tasks SET status = ? WHERE code = ?', [status, code]);
    res.json({ success: true, status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
