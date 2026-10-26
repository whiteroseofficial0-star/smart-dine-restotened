# WhiteRose SmartDine
QR restaurant ordering · live counter with **voice + text new-order alerts** · kitchen display · waiter requests · admin panel.
A working sales demo for cafes, restaurants and resorts. Fictional restaurant, real database, real-time updates.

## Run it (Windows 11, PowerShell + VS Code)
Prerequisites: Node.js 20+, Docker Desktop (for PostgreSQL).
```powershell
npm install
copy .env.example .env          # set APP_SECRET; set PUBLIC_BASE_URL to your PC's LAN IP so phones can scan QR codes
npm run db:up                   # PostgreSQL 16 in Docker
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed                 # fictional restaurant, 8 tables, 13 dishes, 5 staff, 4 sample orders
npm run dev                     # http://localhost:3000
```
Production-style run: `npm run build` then `npm start`.
Re-seeding wipes demo data and is refused when `NODE_ENV=production` unless `--force`.

## Deploy

The app runs a **custom Node server** (`server.ts`) because live updates use Socket.IO, so it needs a host that runs a long-lived Node process. **Vercel / Netlify / Cloudflare Pages will not work** — their serverless functions cannot hold the WebSocket server.

| Host | Verdict |
|---|---|
| **Render** | Recommended. `render.yaml` is included: web service + PostgreSQL + env vars in one blueprint |
| Railway | Works. Same start command, add a PostgreSQL plugin |
| Fly.io / any VPS | Works. `Dockerfile` is included |
| Vercel / Netlify | Not supported (no custom server, no WebSockets) |

### Render (blueprint)
1. Push this repo to GitHub (already done).
2. Render → **New → Blueprint** → pick the repo → **Apply**. It reads `render.yaml` and creates the web service plus a free PostgreSQL database.
3. After the first deploy, set `PUBLIC_BASE_URL` to the live URL (e.g. `https://whiterose-smartdine.onrender.com`) in **Environment**, then redeploy.
4. Seed the demo data once. Render gives you an **External Database URL**; run it from your machine:

```powershell
$env:DATABASE_URL="<External Database URL>"
npx tsx prisma/seed.ts
```

5. Open the live URL, log in, go to **Admin → Tables & QR** and print the cards — the QR codes now point at the live URL.

Notes:
- Free instances sleep after ~15 minutes idle, so the first visit takes ~50s to wake and open websockets reconnect automatically.
- Uploaded menu photos are written to local disk, which is wiped on every deploy. Uncomment the `disk:` block in `render.yaml` (paid instance type) or the demo will fall back to the monogram tiles.
- `NEXT_PUBLIC_DEMO_MODE` is baked in at build time. Set it to `"false"` before deploying a real restaurant.

### Docker
```powershell
docker build -t smartdine .
docker run -p 3000:3000 --env-file .env smartdine
```

## Demo logins (demo only — password for all: `Demo@12345`)
| Role | Email | Lands on |
|---|---|---|
| Admin | admin@smartdine.demo | /admin |
| Manager | manager@smartdine.demo | /admin |
| Cashier | cashier@smartdine.demo | /counter |
| Kitchen | kitchen@smartdine.demo | /kitchen |
| Waiter | waiter@smartdine.demo | /waiter |

With `NEXT_PUBLIC_DEMO_MODE="true"` the home page lists a menu link per table and the login page has one-tap role buttons. **Set it to "false" for a real restaurant.**

## Sales-demo walkthrough (two windows)
1. Window A: log in as **cashier**, open **/counter**, click **Enable Sound / Enable Voice** (browsers require a click), press **Test voice**.
2. Window B (or your phone on the same Wi-Fi): open the home page → **Table 4** (or scan the QR printed from Admin → Tables & QR).
3. Add two dishes, **Place order**. Window A shows the order instantly, plays the chime and says: *"Attention! New order received. Table 4. Order number 105. two Veg Burgers and one Cold Coffee."*
4. Accept → it appears on **/kitchen** (log in as kitchen in a third window) → Start preparing → Ready. The customer's tracking page updates live.
5. Counter: **Record payment** (cash / UPI / counter) → **Receipt** prints.

## What is in the box
| Area | Details |
|---|---|
| Customer `/t/<qr-token>` | Mobile-first menu, search + categories, variants/add-ons, per-item instructions, cart with tax/discount/service estimate, table fixed from the QR token, order tracking `/order/<token>` (live), call-staff buttons |
| Counter `/counter` | Real-time cards, accept / reject-with-reason / send-to-kitchen / ready / served, payment recording, kitchen ticket + receipt printing, filters, history, replay, voice panel (language/voice, rate, volume, sound, mute, test, queue indicator) |
| Kitchen `/kitchen` | Big cards, New/Preparing/Ready/Completed tabs, elapsed time, late-order highlight, chime for new kitchen orders |
| Waiter `/waiter` | Ready-to-serve list, table requests with acknowledge → done |
| Admin `/admin/*` | Metrics, menu + categories + image upload, tables + downloadable/printable QR cards (regenerate/disable), orders + CSV export, staff + roles, settings (tax, hours, voice defaults, receipt) |

## Security
Prices and totals are always computed on the server from DB prices; the order API rejects unknown fields (price, total, table number). The table comes only from the QR token. Customers get an unguessable per-order tracking token and see only their own order. Staff APIs check role on every call; passwords are bcrypt-hashed; session tokens are stored hashed (httpOnly cookie); socket rooms are joined only with a valid session. Login/order/request endpoints are rate limited. Uploads are type- and magic-byte-checked and served by a whitelist route.

## Tests and what has actually been verified
Build environment note: it could not run PostgreSQL or Prisma's native engine, so database behaviour has **not** been executed by the author. Everything else was.

| Check | Result |
|---|---|
| `npm test` — 22 unit tests (pricing, tampering, status transitions, CSV injection, schemas, announcement text, de-dup queue) | passing |
| Prisma schema validation + client generation | passing |
| `tsc --noEmit` (strict) | 0 errors |
| `next build` (21 pages, 27 API routes) | passing |
| Live HTTP smoke test with the DB stubbed: auth redirects, 401s, validation, tamper rejection, path traversal, Socket.IO handshake, rate limiting (16 checks) | passing |
| `npm run test:int` — 8 database-backed tests (order saved + price snapshot, full status flow + audit trail, illegal transitions, payments/refunds, disabled QR, concurrent order numbers) | **written, not yet run — run on your machine** |
| Browser behaviour: voice, sound, live updates, reconnect, printing | **needs a manual pass — checklist below** |

### Manual acceptance checklist (about 10 minutes)
- [ ] Enable Sound, Test voice → hear chime then speech.
- [ ] Place an order from Table 4 → counter updates without refresh, announces table + order number + items **once**.
- [ ] Place 3 orders quickly → three announcements, one after another, none repeated.
- [ ] Change that order's status → **no** new announcement.
- [ ] Refresh the counter → old orders are **not** re-announced; click Enable Sound again (browsers reset audio permission on reload).
- [ ] Mute voice → chime + banner still appear, "Voice muted" badge visible. Replay works.
- [ ] Stop the server for 20 s, place nothing, restart → counter shows "Disconnected" then "Live" and re-syncs; an order placed while it was offline is announced once on reconnect.
- [ ] Kitchen receives the accepted order; Start Preparing / Ready show on counter and on the customer's tracking page.
- [ ] Record payment → receipt prints with correct totals. Kitchen ticket prints.
- [ ] Open another table's tracking URL pattern with a made-up token → "Order not found".

## Known limitations
- **No food photographs are bundled** (cannot be downloaded in the build environment). Dishes show a category emoji until you upload a photo in Admin → Menu.
- Migrations are not pre-generated; `prisma migrate dev --name init` creates and commits `prisma/migrations/` for you.
- Rate limiting and Socket.IO run in a single Node process. Scaling to several instances needs Redis (rate limit) and the Socket.IO Redis adapter.
- Uploaded images are stored in `./uploads` on the server's disk.
- Browser speech voices depend on the OS/browser. Hindi/Indian-English voices appear only if installed. If text-to-speech is missing, the chime and on-screen alert still work.
- After a page reload the browser blocks audio again, so staff must click **Enable Sound** once (a browser rule, not a bug).
- Printing uses the browser print dialog (works with thermal printers installed as system printers).
- Online payments (Razorpay) are intentionally **not** integrated: it needs your keys and verified webhook callbacks. Payments here are recorded by staff only and never auto-marked successful.
- Inventory is not tracked (menu availability toggle only).
