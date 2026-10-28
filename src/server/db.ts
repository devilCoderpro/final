import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'cutline.sqlite');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      dbInstance = new SQL.Database(fileBuffer);
    } catch (err) {
      console.error('Error reading existing DB file, creating fresh:', err);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  initSchema(dbInstance);
  saveDb();
  return dbInstance;
}

export function saveDb(): void {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Error saving SQLite DB to disk:', err);
  }
}

export async function restoreDbFromSnapshot(snapshotPath: string): Promise<void> {
  const SQL = await initSqlJs();
  if (!fs.existsSync(snapshotPath)) {
    throw new Error('Snapshot file not found.');
  }

  const fileBuffer = fs.readFileSync(snapshotPath);
  // Verify it can be opened as a valid SQLite database
  const restoredDb = new SQL.Database(fileBuffer);

  // Write to DB_FILE on disk
  fs.writeFileSync(DB_FILE, fileBuffer);

  // Close previous in-memory instance
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // Ignore close error
    }
  }

  dbInstance = restoredDb;
}

function initSchema(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT UNIQUE,
      email TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      phone TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      base_price REAL DEFAULT 0,
      price_text TEXT NOT NULL,
      blurb TEXT NOT NULL,
      points TEXT NOT NULL,
      sort INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      service TEXT NOT NULL,
      deadline TEXT NOT NULL,
      budget TEXT,
      brief TEXT NOT NULL,
      link TEXT NOT NULL,
      status TEXT NOT NULL,
      assignee_id TEXT,
      price REAL DEFAULT 0,
      paid REAL DEFAULT 0,
      payment_proof TEXT,
      payment_note TEXT,
      billed_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      assignee_id TEXT,
      deadline TEXT NOT NULL,
      status TEXT NOT NULL,
      price REAL DEFAULT 0,
      paid REAL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT,
      role TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS login_lockouts (
      key TEXT PRIMARY KEY,
      attempts INTEGER DEFAULT 0,
      locked_until TEXT
    );
  `);

  // Seed default admin if missing
  const adminCheck = db.exec("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  if (!adminCheck.length || !adminCheck[0].values.length) {
    const adminId = 'usr_admin_1';
    const adminHash = bcrypt.hashSync('admin123', 10);
    db.run(
      `INSERT INTO users (id, role, name, phone, email, password_hash, active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [adminId, 'admin', 'Admin (Cutline Owner)', '9876543210', 'admin@cutlinestudio.com', adminHash, 1, new Date().toISOString()]
    );
  }

  // Seed sample freelancer if missing
  const freelancerCheck = db.exec("SELECT id FROM users WHERE role = 'freelancer' LIMIT 1");
  if (!freelancerCheck.length || !freelancerCheck[0].values.length) {
    const freeId = 'usr_free_rohit';
    const freeHash = bcrypt.hashSync('editor123', 10);
    db.run(
      `INSERT INTO users (id, role, name, phone, email, password_hash, active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [freeId, 'freelancer', 'Rohit Sharma (Senior Editor)', '9123456780', 'rohit@cutlinestudio.com', freeHash, 1, new Date().toISOString()]
    );

    const freeId2 = 'usr_free_ananya';
    const freeHash2 = bcrypt.hashSync('editor123', 10);
    db.run(
      `INSERT INTO users (id, role, name, phone, email, password_hash, active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [freeId2, 'freelancer', 'Ananya Patel (Social Specialist)', '9811223344', 'ananya@cutlinestudio.com', freeHash2, 1, new Date().toISOString()]
    );
  }

    // Migration: ensure base_price column exists on older databases
    try {
      db.run("ALTER TABLE services ADD COLUMN base_price REAL DEFAULT 0;");
    } catch (_) {
      // column already exists
    }

    // Migration: ensure payment_proof and payment_note columns exist on older databases
    try {
      db.run("ALTER TABLE orders ADD COLUMN payment_proof TEXT;");
    } catch (_) {
      // column already exists
    }
    try {
      db.run("ALTER TABLE orders ADD COLUMN payment_note TEXT;");
    } catch (_) {
      // column already exists
    }

    // Migration: ensure commission and payout columns exist on orders and tasks
    try {
      db.run("ALTER TABLE orders ADD COLUMN commission_rate REAL DEFAULT NULL;");
    } catch (_) {}
    try {
      db.run("ALTER TABLE orders ADD COLUMN freelancer_payout_status TEXT DEFAULT 'pending';");
    } catch (_) {}
    try {
      db.run("ALTER TABLE orders ADD COLUMN freelancer_payout_at TEXT;");
    } catch (_) {}
    try {
      db.run("ALTER TABLE orders ADD COLUMN freelancer_payout_note TEXT;");
    } catch (_) {}
    try {
      db.run("ALTER TABLE orders ADD COLUMN freelancer_payout_proof TEXT;");
    } catch (_) {}

    try {
      db.run("ALTER TABLE tasks ADD COLUMN commission_rate REAL DEFAULT NULL;");
    } catch (_) {}
    try {
      db.run("ALTER TABLE tasks ADD COLUMN freelancer_payout_status TEXT DEFAULT 'pending';");
    } catch (_) {}
    try {
      db.run("ALTER TABLE tasks ADD COLUMN freelancer_payout_at TEXT;");
    } catch (_) {}
    try {
      db.run("ALTER TABLE tasks ADD COLUMN freelancer_payout_note TEXT;");
    } catch (_) {}
    try {
      db.run("ALTER TABLE tasks ADD COLUMN freelancer_payout_proof TEXT;");
    } catch (_) {}

    // Seed default services if empty
    const servCheck = db.exec("SELECT id FROM services LIMIT 1");
    if (!servCheck.length || !servCheck[0].values.length) {
      db.run(
        `INSERT INTO services (id, name, base_price, price_text, blurb, points, sort) VALUES
         (?, ?, ?, ?, ?, ?, ?),
         (?, ?, ?, ?, ?, ?, ?),
         (?, ?, ?, ?, ?, ?, ?)`,
        [
          'srv_video',
          'Video Editing',
          3500,
          'from ₹3,500 per video',
          'High-retention Reels, Shorts, and long-form YouTube cuts that hold audience attention with snappy pacing and sound design.',
          JSON.stringify([
            'Fast hook & dynamic retention edits',
            'Cinematic sound effects & background audio mix',
            'Motion graphics, zooms & kinetic typography',
            'Color grading & vertical 9:16 export',
            '2 rounds of revisions included'
          ]),
          1,
          'srv_social',
          'Social Media Management',
          8000,
          'from ₹8,000 per month',
          'Complete organic page growth: weekly content calendar, reel scripting hooks, scheduled publishing, and hashtag research.',
          JSON.stringify([
            '12 to 15 high-performing reels monthly',
            'Weekly content ideation & script hooks',
            'Captions, hashtag clusters & carousel designs',
            'Profile audit & monthly analytics report',
            'Dedicated account manager'
          ]),
          2,
          'srv_combo',
          'Full Studio Retainer',
          15000,
          'from ₹15,000 per month',
          'All-in-one powerhouse for creators and founders. Both custom video editing and dedicated page management handled under one roof.',
          JSON.stringify([
            '20+ short videos + 2 long YouTube videos',
            'Full calendar management & direct publishing',
            'Custom clickable thumbnail design',
            'Direct WhatsApp collaboration group',
            'Priority 24-48 hr turnaround'
          ]),
          3
        ]
      );
    } else {
      // Backfill base_price for seeded default services if 0
      try {
        db.run("UPDATE services SET base_price = 3500 WHERE id = 'srv_video' AND (base_price IS NULL OR base_price = 0)");
        db.run("UPDATE services SET base_price = 8000 WHERE id = 'srv_social' AND (base_price IS NULL OR base_price = 0)");
        db.run("UPDATE services SET base_price = 15000 WHERE id = 'srv_combo' AND (base_price IS NULL OR base_price = 0)");
      } catch (_) {}
    }

    // Auto-update any existing orders with 0 price to standard rates
    try {
      db.run("UPDATE orders SET price = 15000 WHERE (price IS NULL OR price = 0) AND service LIKE '%Both%'");
      db.run("UPDATE orders SET price = 8000 WHERE (price IS NULL OR price = 0) AND service LIKE '%Social%'");
      db.run("UPDATE orders SET price = 3500 WHERE (price IS NULL OR price = 0) AND service LIKE '%Video%'");
    } catch (_) {}

  // Seed initial demo orders if empty
  const orderCheck = db.exec("SELECT id FROM orders LIMIT 1");
  if (!orderCheck.length || !orderCheck[0].values.length) {
    const now = new Date();
    const d1 = new Date(now.getTime() + 2 * 86400000).toISOString().split('T')[0];
    const d2 = new Date(now.getTime() + 4 * 86400000).toISOString().split('T')[0];

    db.run(
      `INSERT INTO orders (id, code, customer_name, phone, email, service, deadline, budget, brief, link, status, assignee_id, price, paid, billed_at, created_at)
       VALUES 
       (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
       (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'ord_1',
        'ORD-829104',
        'Aman Verma',
        '9871234567',
        'aman@startup.in',
        'Video Editing',
        d1,
        '₹3,500',
        'Need 3 fast-paced reels for our fitness app launch. Heavy text popups, upbeat lo-fi hip hop, and high energy cuts.',
        'https://drive.google.com/drive/folders/sample-fitness-raw-cuts',
        'In progress',
        'usr_free_rohit',
        3500,
        1500,
        now.toISOString(),
        new Date(now.getTime() - 86400000).toISOString(),
        'ord_2',
        'ORD-914285',
        'Priya Sharma',
        '9822334455',
        'priya@designstudio.co',
        'Social Media Management',
        d2,
        '₹12,000',
        'Instagram handling for interior design brand. Need aesthetics-focused reel edits and 3 carousels per week.',
        'https://drive.google.com/drive/folders/sample-interior-assets',
        'New',
        null,
        12000,
        0,
        null,
        now.toISOString()
      ]
    );
  }

  // Seed sample task if empty
  const taskCheck = db.exec("SELECT id FROM tasks LIMIT 1");
  if (!taskCheck.length || !taskCheck[0].values.length) {
    const deadline = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
    db.run(
      `INSERT INTO tasks (id, code, title, description, assignee_id, deadline, status, price, paid, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'tsk_1',
        'TSK-104928',
        'Cutline Studio Showreel 2026',
        'Compile the best 15 video clips from our recent client projects into a dynamic 45-second agency showreel for our portfolio.',
        'usr_free_rohit',
        deadline,
        'In progress',
        2500,
        1000,
        new Date().toISOString()
      ]
    );
  }
}

// Helper functions for SQL execution
export function queryAll<T = any>(db: Database, sql: string, params: any[] = []): T[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as unknown as T);
  }
  stmt.free();
  return rows;
}

export function queryOne<T = any>(db: Database, sql: string, params: any[] = []): T | null {
  const rows = queryAll<T>(db, sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function execute(db: Database, sql: string, params: any[] = []): void {
  db.run(sql, params);
  saveDb();
}
