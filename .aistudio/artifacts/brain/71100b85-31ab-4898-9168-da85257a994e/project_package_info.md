# Cutline Studio - Complete Project Archive

### Direct Download Link
Click or copy this link into your browser to download the complete archive:
**[Download cutline-studio-project.zip](/cutline-studio-project.zip)**

Alternative Direct Link:
`https://ais-dev-3sxi6huke6ut3hh3osegbj-741953334666.asia-northeast1.run.app/cutline-studio-project.zip`

---

### Preserved File Structure

```text
cutline-studio/
├── data/
│   ├── cutline.sqlite                  # Embedded SQLite database (orders, team, services, payments)
│   └── transaction_proofs/             # Uploaded customer payment receipts & transaction screenshots
├── public/
│   ├── assets/                         # Graphic banners, branding images, agency assets
│   ├── favicon.ico
│   └── robots.txt
├── src/
│   ├── components/
│   │   ├── AdminDashboard.tsx          # Full admin console (Orders, Tasks, Team, Services, Billing)
│   │   ├── InvoiceModal.tsx            # Multi-page vector PDF invoice & Send Bill generator
│   │   ├── Navigation.tsx              # Site header & responsive nav
│   │   ├── OrderTrackingModal.tsx      # Public client order tracker
│   │   ├── ServicesSection.tsx         # Public service catalog with dynamic pricing
│   │   ├── TeamSection.tsx             # Studio team showcase
│   │   └── ...                         # Hero, reviews, booking dialogs
│   ├── db/
│   │   ├── database.ts                 # sql.js SQLite engine with automatic disk persistence
│   │   └── schema.ts                   # Relational database schema
│   ├── server/
│   │   └── router.ts                   # Express REST API routes
│   ├── types/
│   │   └── index.ts                    # TypeScript domain interfaces
│   ├── App.tsx                         # Main app root & state
│   ├── main.tsx                        # React DOM mounting
│   └── index.css                       # Tailwind CSS styling & animations
├── index.html                          # HTML5 shell
├── package.json                        # Node.js dependencies & scripts
├── server.ts                           # Express server with Vite middleware
├── tsconfig.json                       # TypeScript compiler config
├── vite.config.ts                      # Vite build configuration
├── backup.js                           # Automated database rotation & safe snapshot script
└── README.md                           # Documentation & quickstart guide
```

---

### Quickstart (Windows Laptop & Raspberry Pi 4)

1. **Unzip the downloaded archive** into any folder (e.g. `C:\cutline-studio` or `~/cutline-studio`).
2. Open PowerShell / Command Prompt / Terminal in that folder.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the application:
   - **For Development**:
     ```bash
     npm run dev
     ```
   - **For Production / 24x7 Server (Raspberry Pi or Windows)**:
     ```bash
     npm run build
     npm start
     ```
5. Open your browser at:
   - **Local machine**: `http://localhost:3000`
   - **Shop Network / Phones**: `http://<your-ip>:3000`
