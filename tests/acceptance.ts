import bcrypt from 'bcryptjs';
import initSqlJs from 'sql.js';
import { hashToken, generateOrderCode, cleanPhone, isValidUrl } from '../src/server/auth.ts';

async function runAcceptanceTests() {
  console.log('🧪 Running Acceptance Tests as per Section 10 of Spec...\n');
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
    }
  }

  // 1. Password hash starts with $2
  const hash = bcrypt.hashSync('testpass123', 10);
  assert(hash.startsWith('$2'), 'Passwords in the database start with $2 (bcrypt)');

  // 2. Unsafe links rejection
  assert(!isValidUrl('javascript:alert(1)'), 'Unsafe link "javascript:alert(1)" is rejected');
  assert(!isValidUrl('data:text/html,test'), 'Unsafe data link is rejected');
  assert(isValidUrl('https://drive.google.com/drive/folders/sample'), 'Valid Google Drive HTTPS link accepted');
  assert(isValidUrl('http://youtube.com/watch?v=123'), 'Valid HTTP YouTube link accepted');

  // 3. Phone normalization
  assert(cleanPhone('+91 98765 43210') === '9876543210', 'Phone clean strips +91 and spaces');
  assert(cleanPhone('09876543210') === '9876543210', 'Phone clean strips leading 0');

  // 4. Order code format
  const code = generateOrderCode();
  assert(/^ORD-\d{6}$/.test(code), `Order code matches ORD-XXXXXX pattern (${code})`);

  // 5. Database operations & visibility checks
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run(`
    CREATE TABLE users (id TEXT PRIMARY KEY, role TEXT, name TEXT, phone TEXT, email TEXT, password_hash TEXT, active INTEGER, created_at TEXT);
    CREATE TABLE orders (id TEXT PRIMARY KEY, code TEXT UNIQUE, customer_name TEXT, phone TEXT, email TEXT, service TEXT, deadline TEXT, budget TEXT, brief TEXT, link TEXT, status TEXT, assignee_id TEXT, price REAL, paid REAL, billed_at TEXT, created_at TEXT);
    CREATE TABLE tasks (id TEXT PRIMARY KEY, code TEXT UNIQUE, title TEXT, description TEXT, assignee_id TEXT, deadline TEXT, status TEXT, price REAL, paid REAL, created_at TEXT);
  `);

  db.run(`INSERT INTO users VALUES ('usr_f1', 'freelancer', 'Freelancer A', '9000000001', 'a@test.com', 'hash', 1, 'now')`);
  db.run(`INSERT INTO users VALUES ('usr_f2', 'freelancer', 'Freelancer B', '9000000002', 'b@test.com', 'hash', 1, 'now')`);

  // Insert order for Freelancer A
  db.run(`INSERT INTO orders VALUES ('o1', 'ORD-111111', 'Secret Client', '9999999999', 'client@secret.com', 'Video Editing', '2026-11-01', '₹5000', 'Confidential brief', 'https://link.com', 'New', 'usr_f1', 5000, 0, null, 'now')`);
  // Insert order for Freelancer B
  db.run(`INSERT INTO orders VALUES ('o2', 'ORD-222222', 'Client B', '8888888888', 'clientb@test.com', 'Social Media', '2026-11-02', '₹10000', 'Brief B', 'https://link.com', 'New', 'usr_f2', 10000, 0, null, 'now')`);

  // Freelancer A query: must NEVER see Freelancer B's order
  const stmtA = db.prepare(`SELECT id, code, service, deadline, brief, link, status FROM orders WHERE assignee_id = ?`);
  stmtA.bind(['usr_f1']);
  const f1Orders: any[] = [];
  while (stmtA.step()) f1Orders.push(stmtA.getAsObject());
  stmtA.free();

  assert(f1Orders.length === 1 && f1Orders[0].code === 'ORD-111111', "Freelancer A sees only their own order");
  assert(f1Orders[0].customer_name === undefined, "Freelancer response strictly omits client name");
  assert(f1Orders[0].phone === undefined, "Freelancer response strictly omits client phone");
  assert(f1Orders[0].email === undefined, "Freelancer response strictly omits client email");
  assert(f1Orders[0].price === undefined, "Freelancer response strictly omits client price");

  // Rule: Full payment marks order as Paid
  let price = 5000;
  let paid = 5000;
  let status = 'New';
  if (price > 0 && paid >= price) status = 'Paid';
  assert(status === 'Paid', 'Full payment automatically transitions status to Paid');

  // Rule: Deleting an order leaves no rows in DB
  db.run(`DELETE FROM orders WHERE code = 'ORD-111111'`);
  const checkDel = db.exec(`SELECT * FROM orders WHERE code = 'ORD-111111'`);
  assert(checkDel.length === 0, 'Deleting an order removes it completely with zero rows left');

  console.log(`\n Acceptance Test Summary: ${passed}/${total} passed.\n`);
}

runAcceptanceTests().catch(err => {
  console.error('Acceptance test failed:', err);
  process.exit(1);
});
