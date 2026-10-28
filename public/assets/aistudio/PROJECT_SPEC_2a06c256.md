# Project spec: Freelance order, billing and team manager

Paste this whole file into Cursor (or save it as `PROJECT_SPEC.md` in the project folder and tell Cursor: "Read PROJECT_SPEC.md and build it phase by phase").

## 1. What this is

A small website for a two-person freelance business (video editing and social media management). The owner (admin) and freelancers are in different cities.

- **Public visitors** see the services with prices.
- **Customers** log in with name and mobile number, then see "How it works" and can place an order.
- **Owner (admin)** gets a dashboard: sees new orders, assigns them to freelancers, sets price and payments, generates bills, manages services, freelancers and his own custom tasks.
- **Freelancers** log in with their own mobile or email and password and see only the work assigned to them.

It will run on the owner's Raspberry Pi 4 (4 GB), so it must be light. No paid cloud services.

## 2. Roles and what each can see

| | Guest | Customer | Freelancer | Admin |
|---|---|---|---|---|
| Services and prices | yes | yes | yes | yes |
| How it works + order form | no | yes | no | no |
| Place an order | no | yes | no | (adds manually) |
| Own assigned orders | no | no | yes | all |
| Client name, phone, email, client price on orders | no | no | **never** | yes |
| Custom task price and payment | no | no | **only own tasks** | yes |
| Dashboard, billing, services, team | no | no | no | yes |

A customer can never read any order list (login is only name + number, no OTP). A freelancer must never receive another freelancer's data or the client price/contact of an order.

## 3. Features

**Public site:** hero, services cards with prices (loaded from the database), "Login to explore more" button. Light and dark mode, mobile friendly.

**Customer:** login (name + 10 digit mobile; accept +91, spaces, leading 0). After login the order form opens with name and mobile prefilled and read-only. Fields: service (dropdown from services + "Both"), deadline, budget (optional), email (optional), brief, reference link (Drive/YouTube link, http/https only; no file uploads). On submit: save order, show order ID (`ORD-XXXXXX`) and a WhatsApp button to message the owner.

**Admin dashboard (tabs):**
1. Overview: counts (new, in progress), total value, collected, balance due; list of new orders with an assign dropdown.
2. Orders: add an order manually; table with client details, brief, deadline, budget, link, status dropdown, assign dropdown, price, paid, balance, Generate bill / View bill, Delete.
3. Custom tasks: admin's own tasks (not from the website): title, details, deadline, assign to a freelancer, price, paid so far; edit status/assignee/price/paid; delete.
4. Services: add, edit (name, price text, description, features one per line) and delete. These show on the public site.
5. Billing: invoiced, collected, outstanding; per order payment status (Paid / Partial / Unpaid); add payment; generate or view bill.
6. Freelancers: add (name, mobile and/or email, temporary password min 8), reset password, remove; shows each freelancer's orders, active count, order value.

**Bill (invoice):** invoice number `INV-<order code>`, date, business contact, bill to (client), description (service + brief), total, paid, balance due, status stamp (PAID / PARTIAL / UNPAID). Buttons: Download (HTML file), Print (save as PDF), Close.

**Freelancer page ("My orders"):** stats (assigned, active, delivered; plus received/pending for custom tasks), cards for assigned orders (service, deadline, brief, reference link, status dropdown) and custom tasks (same, plus price, paid, balance). They can set status only to Assigned / In progress / Review / Delivered. Paid status is locked.

**Rules:**
- Order statuses: New, Assigned, In progress, Review, Delivered, Paid. Assigning a New order sets it to Assigned. If paid >= price (and price > 0), status becomes Paid automatically.
- Task statuses: Assigned, In progress, Review, Delivered, Paid.
- Deleting an order or task removes everything about it from the database (including its bill data) and from the freelancer's page. Removing a freelancer ends their sessions; their orders and tasks become unassigned.
- Money is shown as Indian rupees with Indian digit grouping (₹1,50,000).

## 4. Tech stack (keep it light)

- Node.js 20 + Express 4
- SQLite via `better-sqlite3` (WAL mode, foreign keys on)
- `bcryptjs` for password hashes (pure JS, no compile)
- Frontend: one `public/index.html` with plain HTML, CSS and JavaScript (no framework). Escape all user text before putting it in HTML.
- No other services. Config in `config.json` (business name, WhatsApp number with 91, email).

## 5. Database tables

- `users`: id, role (`admin` or `freelancer`), name, phone (unique, nullable), email (unique, nullable), password_hash, active, created_at
- `customers`: id, phone (unique), name, created_at
- `services`: id, name, price_text, blurb, points (JSON array), sort
- `orders`: id, code (`ORD-XXXXXX`, unique), customer_name, phone, email, service, deadline, budget, brief, link, status, assignee_id (FK users, set null on delete), price, paid, billed_at, created_at
- `tasks`: id, code (`TSK-XXXXXX`), title, description, assignee_id, deadline, status, price, paid, created_at
- `sessions`: token_hash (sha256 of cookie token), user_id (nullable for customers), role, name, phone, expires_at

Seed two services: Video editing (from ₹1,500 per video) and Social media management (from ₹8,000 per month).

## 6. API

Public: `GET /api/config`, `GET /api/services`, `GET /api/me`
Auth: `POST /api/auth/login` (mobile or email + password), `POST /api/auth/logout`, `POST /api/customer/login` (name + mobile)
Customer: `POST /api/orders`
Admin (all need admin role):
- `GET /api/admin/data` (orders, tasks, team)
- `POST /api/admin/orders`, `PATCH /api/admin/orders/:code` (status, assigneeId, price, paid, billed), `DELETE /api/admin/orders/:code`
- `POST /api/admin/tasks`, `PATCH /api/admin/tasks/:code`, `DELETE /api/admin/tasks/:code`
- `POST /api/admin/team`, `POST /api/admin/team/:id/password`, `DELETE /api/admin/team/:id`
- `POST /api/admin/services`, `PATCH /api/admin/services/:id`, `DELETE /api/admin/services/:id`
Freelancer: `GET /api/my`, `PATCH /api/my/orders/:code`, `PATCH /api/my/tasks/:code` (status only)

`GET /api/my` must return orders without price, phone, email, client name or budget. It returns tasks with price and paid.

## 7. Security requirements

- Session cookie: random 32-byte token, store only its hash, `HttpOnly`, `SameSite=Lax`, `Secure` when behind HTTPS. Admin and freelancer sessions last 7 days, customer sessions 12 hours.
- Lock a login for 15 minutes after 5 wrong passwords (per IP + identifier). Compare against a dummy hash when the user does not exist.
- Reject cross-site state changes (check `Origin` against `Host`).
- Rate limit customer login and order creation per IP.
- Validate and length-limit every input. Links must start with http:// or https://.
- Security headers including a Content-Security-Policy.
- Server listens on 127.0.0.1 by default (a reverse proxy such as Caddy or a Cloudflare Tunnel serves it over HTTPS).
- A `create-admin.js` CLI creates or resets the owner login. A `backup.js` script makes a safe SQLite backup and keeps the last 14.

## 8. Deployment (Raspberry Pi)

`npm install`, then `npm start` under `pm2`. Internet access through DuckDNS + router port forwarding + Caddy (needs a public IP from the ISP), or a Cloudflare Tunnel (works without a public IP, needs a domain). Daily cron for `backup.js`.

## 9. Build order for Cursor (do one phase at a time, test before moving on)

1. Project setup, `db.js` schema and seed, `config.json`, `create-admin.js`.
2. Auth: sessions, team login, customer login, `/api/me`, logout, lockout.
3. Public site and services API.
4. Customer order flow.
5. Admin API (orders, tasks, team, services) and the dashboard tabs.
6. Bills (view, download, print) and billing tab.
7. Freelancer API and page, with the visibility rules.
8. Backup script, README with Pi setup steps.

## 10. Acceptance tests (write them as a script)

- Guest gets 401 on `/api/admin/data`; customer gets 403 on admin and freelancer routes.
- Customer places an order and gets a code; unsafe links (`javascript:`) are rejected.
- Freelancer A never sees freelancer B's work; the freelancer response contains no client price, phone, email or name.
- Freelancer sees price and paid only on their own tasks, and cannot change price or set Paid.
- Full payment marks the order Paid; deleting an order or task leaves no rows in the database.
- Five wrong passwords lock the login; a removed freelancer's session stops working.
- Passwords in the database start with `$2` (bcrypt).

## 11. Starter prompt to paste into Cursor

> Read PROJECT_SPEC.md. Build this project with Node.js, Express, better-sqlite3 and bcryptjs, with a single-file plain HTML/CSS/JS frontend in `public/index.html`. Work phase by phase from section 9. After each phase, run it and test it, and show me what to check. Follow the visibility rules in section 2 and the security requirements in section 7 exactly. Ask me before adding any dependency that is not listed.
