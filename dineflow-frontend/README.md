# DineFlow Frontend

React + Vite + Tailwind frontend for the DineFlow backend (Express, Socket.IO, MongoDB, Razorpay).
Every screen talks to the endpoints and live events listed in the backend README.

## Run locally

```bash
npm install
cp .env.example .env     # VITE_API_URL=http://localhost:5000
npm run dev              # http://localhost:3000
```

Port 3000 matches `FRONTEND_URL` and `CORS_ORIGINS` in the backend `.env.example`.
With the backend seeded (`npm run db:seed`), sign in with **owner@demo.test / Demo@12345**
(the login page has a "Fill in the demo account" button while `VITE_SHOW_DEMO=true`).

## What is inside

| Route | Who | What it does |
|---|---|---|
| `/` | everyone | Landing page with a live ticket-rail hero |
| `/login`, `/register` | everyone | Sign in, or create a restaurant and its owner |
| `/app` | owner, manager | Revenue today, hourly collections, best sellers, latest orders |
| `/app/kitchen` | owner, manager, kitchen | Live board: New, Accepted, Cooking, Ready. Chime on new orders, red timer after 15 min |
| `/app/floor` | owner, manager, waiter | Ready-to-serve alerts and guest requests (water, help, bill) |
| `/app/tables` | staff | Table status, QR code with print, create a bill |
| `/app/billing` | owner, manager, cashier, waiter | Bills as tickets. Pay by cash, card, UPI, or Razorpay |
| `/app/menu` | owner, manager | Categories, dishes, photo upload, sold-out switch |
| `/app/team` | owner, manager | Create waiter, kitchen, cashier (and manager) logins |
| `/app/settings` | owner, manager | Name, tax %, logo, banner, public link |
| `/r/:slug?t=TOKEN` | guests | QR menu: search, veg filter, cart with notes, place order, call waiter, pay bill |
| `/r/:slug/track/:code` | guests | Live order progress over Socket.IO |

Staff only see the screens their role allows. Alerts (new order, ready to serve, waiter call, payment) fire on every staff page.

## Deploy (Vercel)

1. Import this folder as a project. The framework preset is **Vite**.
2. The production build defaults to `https://dineflow-6uzf.onrender.com`. Set `VITE_API_URL` in the Vercel project to override it.
3. Deploy. `vercel.json` already rewrites all routes to `index.html`, so deep links and QR links work.
4. In the backend, set `FRONTEND_URL` to your Vercel domain and add it to `CORS_ORIGINS`. Table QR codes are built from `FRONTEND_URL`, so reprint them after changing it.

## Notes

- Prices are never sent from the client. The cart sends item ids and quantities; the backend prices the order.
- Razorpay Checkout loads on demand. Payments are verified on the server before a bill is marked paid.
- New image uploads are stored in MongoDB GridFS by the backend; MongoDB must be connected and have enough storage space.
