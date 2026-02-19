# WHEN Justice — Executive Product Dashboard

Password-gated executive dashboard pulling live data from Linear via a secure backend proxy.

## Files

- **`dashboard.html`** — Entry point (opens in browser)
- **`ExecutiveDashboard.jsx`** — React dashboard component (transpiled by Babel CDN in dev)
- **`server.js`** — Node/Express backend proxy (handles Linear API auth + CORS)
- **`package.json`** — Dependencies

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3001` in a browser (or serve `dashboard.html` via a local HTTP server).

The backend proxy will forward GraphQL queries to Linear's API using the `LINEAR_API_KEY` from your `.env` file.

## Deployment on Render

### 1. Create a Web Service

- Connect your Git repo
- Runtime: **Node**
- Build Command: `npm install`
- Start Command: `npm start`

### 2. Set Environment Variables

In Render dashboard, add:

```
LINEAR_API_KEY=<your-linear-api-key>
```

Get your Linear personal API key from: Linear Settings → API → Personal API Keys

### 3. Access the Dashboard

Once deployed:
- Your service will have a public URL like `https://when-dashboard.onrender.com`
- Enter the password: **`WHENisNOW1!`**
- Dashboard loads live Linear data

## How It Works

### Why a Backend Proxy?

1. **CORS Protection** — Linear API doesn't allow direct browser requests for security
2. **Auth Security** — API key stays on the server, never exposed to client
3. **Production-Ready** — Avoids client-side API key exposure

### Architecture

```
Browser (dashboard.html)
    ↓ POST /api/linear (GraphQL query)
    ↓
Node Server (server.js)
    ↓ Authorization: Bearer <LINEAR_API_KEY>
    ↓
Linear GraphQL API (https://api.linear.app/graphql)
    ↓
Response → Browser
```

## Features

✓ Password gate (WHENisNOW1!)
✓ Live issue counts & project progress
✓ Urgent blockers in red-alert panel
✓ Top initiatives with progress bars
✓ Interactive hierarchy drill-down
✓ In Progress & Recently Completed panels
✓ Skeleton loading states
✓ Sticky header with live sync indicator
✓ Responsive grid layout

## Customization

### Change Password

Edit `ExecutiveDashboard.jsx`:
```javascript
const PASSWORD = 'WHENisNOW1!';
```

### Change Launch Target Date

Edit `ExecutiveDashboard.jsx`:
```javascript
const LAUNCH_TARGET = new Date('2026-03-15');
```

### Adjust Brand Colors

Edit the `T` (theme) object in `ExecutiveDashboard.jsx`:
```javascript
const T = {
  bg:     '#0e0e0e',      // Dark background
  accent: '#e04a1f',      // Burnt orange
  done:   '#6fcf6f',      // Green
  // ... etc
};
```

## Fonts

- **Display:** Bebas Neue (headings, large numbers)
- **Body:** DM Sans (body text)
- **Mono:** DM Mono (IDs, labels, code)

All loaded from Google Fonts CDN.

## License

Internal use — WHEN Justice Platform Team

---

**Password:** `WHENisNOW1!`
**Launch Target:** March 15, 2026
**Current Sprint:** Donation flow, Campaign publishing, Organizer dashboard
