#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import initSqlJs from 'sql.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'cutline.sqlite');

const args = process.argv.slice(2);
const phone = args[0] || '9876543210';
const password = args[1] || 'admin123';
const email = args[2] || 'admin@cutlinestudio.com';
const name = args[3] || 'Owner (Cutline Studio)';

async function main() {
  const SQL = await initSqlJs();
  let db;
  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  const hash = bcrypt.hashSync(password, 10);
  const now = new Date().toISOString();

  // Check if admin exists
  const existing = db.exec("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  if (existing.length && existing[0].values.length) {
    const adminId = existing[0].values[0][0];
    db.run(
      `UPDATE users SET phone = ?, email = ?, password_hash = ?, name = ?, active = 1 WHERE id = ?`,
      [phone, email, hash, name, adminId]
    );
    console.log(`[Cutline] Admin user updated successfully! ID: ${adminId}, Phone: ${phone}, Email: ${email}`);
  } else {
    const id = 'usr_admin_' + Date.now();
    db.run(
      `INSERT INTO users (id, role, name, phone, email, password_hash, active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
      [id, 'admin', name, phone, email, hash, now]
    );
    console.log(`[Cutline] New Admin user created! Phone: ${phone}, Password: ${password}`);
  }

  const data = db.export();
  fs.writeFileSync(DB_FILE, Buffer.from(data));
  console.log(`[Cutline] Database saved to ${DB_FILE}`);
}

main().catch(err => {
  console.error('[Cutline] Error creating admin:', err);
  process.exit(1);
});
