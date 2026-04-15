# 🏥 LiverRisk AI Platform

A full-stack liver cancer risk assessment platform with OCR blood report scanning,
Bayesian risk calculation, and a Node.js + Supabase backend.

---

## 📁 Project Structure

```
liver-risk-platform/
├── src/                         # React frontend (Vite)
│   ├── pages/
│   │   ├── DynamicImageUpload.jsx   ✅ Fixed: PDF support, improved OCR
│   │   ├── DynamicResults.jsx       ✅ Fixed: Patient-friendly Bayes explanation
│   │   └── ...
│   ├── components/layout/
│   │   └── Navbar.jsx               ✅ Fixed: User icon removed
│   ├── hooks/
│   │   └── useScrollToTop.js        ✅ Fixed: Scroll-to-top on route change
│   ├── lib/
│   │   └── api.js                   ✅ New: Frontend API client
│   └── App.jsx                      ✅ Fixed: Uses ScrollToTop
├── backend/                     # Express.js API
│   ├── src/
│   │   ├── index.js                 Main server
│   │   ├── routes/patients.js       CRUD for patients + calculations
│   │   ├── routes/techniques.js     Fetch ML techniques
│   │   ├── lib/supabase.js          Supabase service-role client
│   │   └── middleware/validate.js   Zod request validation
│   ├── supabase_schema.sql          Run once in Supabase SQL editor
│   └── package.json
├── .env.example                 Frontend env template
└── package.json
```

---

## 🚀 Running Locally

### Prerequisites
- Node.js 18+
- A free [Supabase](https://supabase.com) account

### Step 1 — Clone & install frontend

```bash
cd liver-risk-platform
npm install
```

### Step 2 — Set up Supabase

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Open **SQL Editor** → **New Query**
3. Paste the contents of `backend/supabase_schema.sql` and click **Run**
4. Go to **Settings → API** and copy:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **anon public** key
   - **service_role** key (secret — backend only)

### Step 3 — Configure environment files

**Frontend** (in project root):
```bash
cp .env.example .env
# Edit .env:
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:4000
```

**Backend** (in `backend/` folder):
```bash
cd backend
cp .env.example .env
# Edit .env:
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
FRONTEND_ORIGIN=http://localhost:5173
PORT=4000
```

### Step 4 — Install backend dependencies

```bash
cd backend
npm install
```

### Step 5 — Start both servers

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# → API running on http://localhost:4000
```

**Terminal 2 — Frontend:**
```bash
cd ..   # back to project root
npm run dev
# → App running on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

---

## 📄 PDF Support (OCR)

PDF uploads require `pdfjs-dist`. It is already in `package.json` — just run `npm install`.

If you see the error `pdfjs-dist not installed`, run:
```bash
npm install pdfjs-dist
```

---

## 🌐 Deployment

### Frontend → Vercel (free, easiest)

```bash
npm install -g vercel
vercel login
vercel --prod
```

In the Vercel dashboard → **Settings → Environment Variables**, add:
```
VITE_SUPABASE_URL      = https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY = your-anon-key
VITE_API_URL           = https://your-backend.railway.app
```

### Backend → Railway (free tier available)

1. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub**
2. Select your repo, set **Root Directory** to `backend`
3. In **Variables**, add:
   ```
   SUPABASE_URL              = https://xxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY = your-service-role-key
   FRONTEND_ORIGIN           = https://your-vercel-app.vercel.app
   PORT                      = 4000
   ```
4. Railway auto-detects Node.js and uses `railway.json` for configuration.

### Alternative backend → Render (also free)

1. Go to [render.com](https://render.com) → **New Web Service**
2. Connect GitHub repo → set **Root Directory** to `backend`
3. Set **Build Command**: `npm install`
4. Set **Start Command**: `node src/index.js`
5. Add the same environment variables as Railway above.

---

## 🔌 API Endpoints

| Method | Path                          | Description                        |
|--------|-------------------------------|------------------------------------|
| GET    | /health                       | Health check                       |
| POST   | /api/patients                 | Save a new patient record          |
| GET    | /api/patients                 | List patients (paginated)          |
| GET    | /api/patients/:id             | Get patient + their calculations   |
| POST   | /api/patients/calculations    | Save a risk calculation result     |
| GET    | /api/techniques               | Get all ML techniques + metrics    |
| GET    | /api/techniques/:id           | Get single technique               |

---

## ✅ Changes Summary (all fixes applied)

| Fix | File | Status |
|-----|------|--------|
| Remove user icon from Navbar | `src/components/layout/Navbar.jsx` | ✅ Done |
| Patient-friendly Bayes explanation | `src/pages/DynamicResults.jsx` | ✅ Done |
| PDF → image OCR with pdfjs-dist | `src/pages/DynamicImageUpload.jsx` | ✅ Done |
| Scroll-to-top on route change | `src/hooks/useScrollToTop.js` + `src/App.jsx` | ✅ Done |
| Improved OCR preprocessing | `src/pages/DynamicImageUpload.jsx` | ✅ Done |
| Confidence scoring badges | `src/pages/DynamicImageUpload.jsx` | ✅ Done |
| Indian lab report regex patterns | `src/pages/DynamicImageUpload.jsx` | ✅ Done |
| Better camera error messages | `src/pages/DynamicImageUpload.jsx` | ✅ Done |
| Manual entry fallback | `src/pages/DynamicImageUpload.jsx` | ✅ Done |
| Express backend + Supabase | `backend/` | ✅ Done |
| Supabase SQL schema | `backend/supabase_schema.sql` | ✅ Done |
| Frontend API client | `src/lib/api.js` | ✅ Done |
