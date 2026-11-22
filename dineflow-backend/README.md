# DineFlow Backend (Node.js + Express + Socket.IO + MongoDB Atlas)

Multi-tenant backend for the DineFlow Restaurant & Hotel Management SaaS:
QR ordering, kitchen & waiter real-time, billing, Razorpay payments, and Cloudinary image storage.

> **Important hosting note:** Socket.IO needs a long-running server. Vercel serverless functions
> cannot hold WebSocket connections. So: **frontend -> Vercel**, **this backend -> Render / Railway / Fly.io / a VPS**.

---

## 1. MongoDB Atlas setup (do this first)

1. Create an account at https://cloud.mongodb.com and create a project **DineFlow**.
2. **Create a cluster** (M0 free for testing; **M10+ for production** - needed for automated Cloud Backups).
3. **Database Access -> Add New Database User**: username `dineflow_app`, strong password, role **Read and write to any database** (or restrict to the `dineflow` database). Never use the Atlas admin account in the app.
4. **Network Access -> Add IP Address**:
   - Development: your current IP.
   - Production: your backend host's **static outbound IPs** (Render paid plans/Railway/Fly provide them). Avoid `0.0.0.0/0` in production; if your host has no static IP, use it only together with a strong password and consider Atlas Private Endpoints.
5. **Connect -> Drivers** -> copy the `mongodb+srv://...` string. Special characters in the password must be URL-encoded.
6. Put it in `.env` as `MONGODB_URI` (the database name `dineflow` comes from `MONGODB_DB_NAME`).

## 2. Local run

```bash
npm install
cp .env.example .env        # then fill in MONGODB_URI and JWT_SECRET
npm run db:ping             # verifies Atlas connection (prints no credentials)
npm run db:indexes          # creates the dineflow collections + indexes
npm run db:seed             # optional demo restaurant/menu/tables
npm run dev                 # http://localhost:5000/health
```

Generate a JWT secret:
`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

## 3. Environment variables

| Variable | Required | Description |
|---|---|---|
| NODE_ENV | yes | `development` or `production` |
| PORT | no | default 5000 (hosts usually inject it) |
| CORS_ORIGINS | yes | comma-separated allowed frontend origins; Render is configured for `https://dineflow-two-chi.vercel.app` |
| FRONTEND_URL | yes | public frontend URL used inside QR links; Render is configured for `https://dineflow-two-chi.vercel.app` |
| MONGODB_URI | yes | Atlas connection string (**secret**) |
| MONGODB_DB_NAME | no | default `dineflow` |
| MONGO_MAX_POOL_SIZE / MONGO_MIN_POOL_SIZE | no | connection pool, default 20 / 2 |
| JWT_SECRET | yes | >= 32 chars in production (**secret**) |
| JWT_EXPIRES_IN | no | default `7d` |
| CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET | optional image storage | Cloudinary account credentials; keep the API secret private |
| RAZORPAY_KEY_ID / KEY_SECRET | for payments | use `rzp_test_...` keys for sandbox |
| RAZORPAY_WEBHOOK_SECRET | for webhook | set same value in Razorpay dashboard |

Never put any of these in frontend code. Only `RAZORPAY_KEY_ID` (public key) is returned to the browser by the API.
New image uploads use Cloudinary when configured (with either `CLOUDINARY_URL` or the three separate credential variables) and MongoDB GridFS otherwise; each image is limited to 5 MB. The upload response includes the hosted URL and Cloudinary optimization URLs when Cloudinary is enabled. Existing MongoDB GridFS image URLs remain available.

## 4. API overview

**Staff (JWT `Authorization: Bearer <token>`)**
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST/GET /api/auth/staff`
- `GET/PATCH /api/restaurant`
- `/api/menu/categories`, `/api/menu/items` (CRUD)
- `/api/tables` (CRUD + `PATCH /:id/status`; response includes `qrUrl`)
- `GET /api/orders`, `PATCH /api/orders/:id/status`
- `GET /api/waiter/calls`, `PATCH /api/waiter/calls/:id`
- `GET /api/billing`, `POST /api/billing/table/:tableId`, `POST /api/billing/:id/pay-offline`
- `POST /api/payments/razorpay/order`, `POST /api/payments/razorpay/verify`, `POST /api/payments/razorpay/webhook`
- `POST /api/uploads/:kind` (`logo|food|banner|profile|promo`, multipart field `file`)

**Customer QR (no login, table proven by `qrToken`)**
- `GET /api/public/:slug/menu`
- `POST /api/public/:slug/orders`  `{ tableToken, items:[{menuItem, qty, notes}], customerName }`
- `GET /api/public/:slug/orders/:trackingCode`
- `POST /api/public/:slug/waiter-call`, `POST /api/public/:slug/bill/pay`

**Health:** `GET /health`

## 5. Socket.IO events

Connect: `io(API_URL, { auth: { token } })` for staff (joins their restaurant room automatically).
Customers connect without a token and emit `track:order` with `{ trackingCode }`.

| Event | Sent to | When |
|---|---|---|
| `order:new` | restaurant staff | customer places QR order |
| `order:status` | staff + that customer | kitchen changes status |
| `kitchen:ready` | staff | order ready for pick-up |
| `waiter:call`, `waiter:call:updated` | staff | customer calls / waiter responds |
| `table:updated` | staff | table status changes |
| `billing:updated` | staff | bill generated or paid |
| `payment:confirmed` | staff | payment verified |

## 6. Deploy

**Backend (Render example)**
1. Push this folder to a GitHub repo.
2. Render -> New -> Blueprint -> select repo (uses `render.yaml`), fill the secret env vars. The free instance sleeps when idle, so the first request after inactivity may be slow.
3. After first deploy, check `https://<your-api>/health` -> `{"status":"ok","db":"connected"}`.
4. Custom domain: Render -> Settings -> Custom Domains -> add `api.yourdomain.com` and create the DNS CNAME. HTTPS certificates are issued automatically.
5. CI/CD: in Render copy the **Deploy Hook URL**, add it to GitHub -> Settings -> Secrets as `RENDER_DEPLOY_HOOK_URL`. Pushes to `main` run `.github/workflows/ci.yml` and deploy only if validation passes.

**Frontend (Vercel):** import the frontend repo, set `VITE_API_URL=https://dineflow-6uzf.onrender.com`, and add your domain under Vercel -> Domains.
The Render Blueprint sets `CORS_ORIGINS` and `FRONTEND_URL` to `https://dineflow-two-chi.vercel.app`. If the frontend domain changes, update both values in Render's environment settings.

**Razorpay:** Dashboard -> Webhooks -> URL `https://api.yourdomain.com/api/payments/razorpay/webhook`, events `payment.captured` and `order.paid`, secret = `RAZORPAY_WEBHOOK_SECRET`.

**Environments:** use a separate Atlas database/cluster (e.g. `dineflow_dev`) and separate Razorpay test keys for development; production uses live keys only on the production host.

## 7. Backup & recovery

- **Atlas M10+:** Cluster -> Backup -> enable **Cloud Backup** (snapshots + optional Continuous/point-in-time). Restore from Atlas UI -> Backup -> Restore.
- **M0/M2/M5:** no automated Cloud Backup. Use `./scripts/backup.sh` (mongodump) on a schedule (cron / GitHub Action) and store the output off-server.
- **Restore:** `mongorestore --uri="$MONGODB_URI" --gzip --nsInclude='dineflow.*' backups/<folder>`
- Test a restore into a scratch cluster at least once.

## 8. Monitoring & alerts

- Uptime: point UptimeRobot / Better Stack at `/health` (returns 503 if the DB is down).
- Logs: Render/Railway log stream (JSON logs in production). Add Sentry (`@sentry/node`) for error alerts if desired.
- Database: Atlas -> Alerts (connections, CPU, replication lag) and Performance Advisor for slow queries.

## 9. Security built in

Helmet headers, CORS allow-list, JWT (HS256, role + tenant in token, user re-checked each request), bcrypt (cost 12), role-based access, **every query filtered by the tenant's restaurant id**, rate limits (global, login, public ordering, uploads), Mongo operator sanitising, body size limits, server-side price calculation, Razorpay HMAC verification (checkout + webhook, timing-safe), upload type/size whitelist, secrets only from environment.
