#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'cutline.sqlite');
const BACKUP_DIR = path.resolve(process.cwd(), 'backups');

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function backup() {
  if (!fs.existsSync(DB_FILE)) {
    console.error(`[Cutline Backup] DB file does not exist at ${DB_FILE}`);
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUP_DIR, `cutline_backup_${timestamp}.sqlite`);

  fs.copyFileSync(DB_FILE, backupFile);
  console.log(`[Cutline Backup] Backup created successfully: ${backupFile}`);

  // Retain only last 14 backups
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('cutline_backup_') && f.endsWith('.sqlite'))
    .map(f => ({
      name: f,
      time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);

  if (files.length > 14) {
    const toDelete = files.slice(14);
    for (const item of toDelete) {
      fs.unlinkSync(path.join(BACKUP_DIR, item.name));
      console.log(`[Cutline Backup] Pruned old backup: ${item.name}`);
    }
  }
}

backup();
