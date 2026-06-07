<div align="center">

# 🛡️ SafeGuard

**Women Safety & Emergency Response Platform**

Production-grade full-stack application — SOS alerts, live GPS tracking, ML-powered risk analysis, safe zone geofencing, real-time notifications, and subscription-based premium features.

![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)

</div>

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [ML Risk Engine](#ml-risk-engine)
- [Database Schema](#database-schema)
- [Security](#security)
- [DevOps & CI/CD](#devops--cicd)
- [Testing](#testing)

---

## Features

### Core Safety
| Feature | Description |
|---|---|
| 🚨 **SOS Alerts** | One-tap emergency trigger with 5-second countdown cancel. Sends SMS + email to all emergency contacts instantly |
| 📍 **Live GPS Tracking** | Real-time location streaming via WebSocket. Emergency contacts track the user on a live Leaflet map |
| 🎤 **Voice Activation** | Say "help me" or "SOS" to trigger alert hands-free using Web Speech API |
| 🛡️ **Safe Zone Geofencing** | Define named zones (Home, Office, School). Get notified on entry/exit. Risk score automatically reduced inside zones |
| 📋 **Incident Reporting** | Report harassment, stalking, assault, or suspicious activity with location and severity |
| 👥 **Emergency Contacts** | Up to 10 prioritised contacts. Per-contact notification preferences for SOS, zones, incidents |

### AI / ML
| Feature | Description |
|---|---|
| 🧠 **ML Risk Engine** | Pluggable architecture — calls an external ML REST endpoint (FastAPI/Flask/SageMaker) with automatic fallback to rule-based scoring |
| 📊 **Feature Extraction** | 17-signal feature vector: time-of-day (cyclic), SOS area density, incident density, area baseline risk, user behaviour, geolocation, safe zone status |
| 🔒 **Safe Zone Risk Reduction** | Being inside a safe zone reduces the risk score. The model learns this from training data with 70% suppression probability |
| 📈 **Risk Explainability** | Every score includes human-readable factor pills explaining why the score is high or low |
| 🔄 **Graceful Fallback** | ML service timeout or failure → rule-based model activates automatically. Zero crashes, zero silent failures |

### Payments & Subscriptions
| Plan | Price | Key Features |
|---|---|---|
| **Free** | ₹0 | SOS alerts, 5 contacts, 3 safe zones |
| **Basic** | ₹199/mo | 5 contacts, 3 safe zones, SMS notifications |
| **Premium** | ₹499/mo | 10 contacts, 20 safe zones, AI risk analysis, voice activation |
| **Enterprise** | ₹999/mo | Unlimited, admin dashboard, analytics export |

Payments via **Razorpay** (India/INR) and **Stripe** (global/card). Webhook-verified. PDF invoices generated server-side.

---

## Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js 20, Express 4 |
| API | REST (versioned `/api/v1/`) + GraphQL (Apollo Server 3) |
| Auth | JWT HS256 — access (15m) + refresh (7d) rotation, Redis blacklist |
| Database | MongoDB Atlas — Mongoose, 2dsphere indexes, aggregation pipelines |
| Cache | Redis 7 — token blacklist, session store, analytics cache |
| Queue | BullMQ — SMS, email, push notification workers with retry/backoff |
| Real-time | Socket.IO 4 — JWT-authenticated, room-based SOS location streaming |
| ML | Pluggable REST adapter → FastAPI/Flask/SageMaker, rule-based fallback |
| Payments | Razorpay + Stripe — webhook verified, PDF invoice (PDFKit) |
| Notifications | Nodemailer (SMTP/Gmail/SendGrid) + Twilio SMS + FCM push |
| Security | Helmet, CORS, express-mongo-sanitize, HPP, bcrypt (12 rounds), rate limiting |

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 18, Vite 5 |
| State | Redux Toolkit — auth, SOS, notifications, location slices |
| Styling | Tailwind CSS 3 — mobile-first, custom design system |
| Maps | Leaflet + React-Leaflet (OpenStreetMap, no API key) |
| Charts | Recharts — bar, line, pie charts |
| HTTP | Axios — auto token refresh interceptor |
| Real-time | Socket.IO client singleton |
| Routing | React Router 6 — protected routes, lazy loading |

### DevOps
| Layer | Technology |
|---|---|
| Containers | Docker multi-stage builds (non-root user, dumb-init) |
| Orchestration | Docker Compose — backend + frontend + Redis + NGINX |
| Reverse Proxy | NGINX — TLS 1.2/1.3, OCSP stapling, WebSocket proxy, rate limiting |
| CI/CD | GitHub Actions — lint → test → Docker build/push → SSH deploy to EC2 |
| Cloud | AWS EC2 (Ubuntu 22.04) |
| SSL | Let's Encrypt (Certbot auto-renewal) |

---

## Project Structure

```
safeguard/                          101 files · ~7,200 lines
├── backend/
│   ├── src/
│   │   ├── server.js               Entry point — bootstrap, graceful shutdown
│   │   ├── app.js                  Express factory — all middleware pipeline
│   │   ├── api/v1/
│   │   │   ├── auth/               Register · login · refresh · logout · reset
│   │   │   ├── sos/                Trigger · update location · resolve · history
│   │   │   ├── location/           Live GPS update · live position · history
│   │   │   ├── contacts/           CRUD emergency contacts (max 10)
│   │   │   ├── incidents/          Report · list · admin review
│   │   │   ├── zones/              CRUD safe zones · nearby query · geofencing
│   │   │   ├── subscriptions/      Razorpay · Stripe · webhooks · invoice · wallet
│   │   │   ├── analytics/          User dashboard stats · admin overview
│   │   │   └── notifications/      List · mark read · FCM token · preferences
│   │   ├── config/
│   │   │   ├── database.js         MongoDB Atlas connection pool (max 50)
│   │   │   ├── redis.js            Redis client + cacheGet/cacheSet/cacheDel
│   │   │   ├── socket.js           Socket.IO server — JWT auth, room management
│   │   │   └── cors.js             Strict origin whitelist
│   │   ├── graphql/
│   │   │   ├── schemas/            SDL type definitions
│   │   │   └── resolvers/          Query + Mutation handlers (JWT verified)
│   │   ├── middleware/
│   │   │   ├── auth.js             JWT verify · RBAC · subscription guard
│   │   │   ├── rateLimiter.js      Global · auth · SOS · payment limiters
│   │   │   ├── validate.js         express-validator runner → 400 on failure
│   │   │   ├── errorHandler.js     Global error formatter (Mongoose + JWT)
│   │   │   ├── notFound.js         404 catch-all
│   │   │   └── requestLogger.js    Per-request timing + user ID
│   │   ├── models/
│   │   │   ├── User.js             Subscription · wallet · location · FCM tokens
│   │   │   ├── SOS.js              Location history · ML fields · device info
│   │   │   └── index.js            Contact · SafeZone · Incident · Notification · Transaction
│   │   ├── queues/
│   │   │   └── index.js            BullMQ init + SMS/email/push workers
│   │   ├── services/
│   │   │   ├── ai.service.js       Public entry point → extract → predict
│   │   │   ├── email.service.js    Nodemailer · lazy transporter · HTML templates
│   │   │   ├── sms.service.js      Twilio SMS sender
│   │   │   ├── location.service.js Reverse geocoding (OSM Nominatim)
│   │   │   ├── notification.service.js  In-app + FCM push delivery
│   │   │   └── ml/
│   │   │       ├── featureExtractor.js   17-signal normalised feature vector
│   │   │       ├── mlModelAdapter.js     REST adapter → ML service, auto-fallback
│   │   │       └── ruleBasedModel.js     Rule-based scoring with safe zone reduction
│   │   └── utils/
│   │       ├── jwt.js              Sign · verify · rotate · cookie helpers
│   │       ├── logger.js           Winston + daily rotating files
│   │       └── AppError.js         Operational error class
│   ├── docs/
│   │   ├── ml_service_example.py   FastAPI microservice — plug in trained model
│   │   └── train_model.py          GradientBoosting trainer with safe zone feature
│   └── src/__tests__/
│       ├── auth.test.js            Register · login · me · logout · validation
│       ├── sos.test.js             Trigger · location update · resolve · history
│       └── contacts.test.js        CRUD · limit · phone validation
│
├── frontend/
│   └── src/
│       ├── App.jsx                 All routes — lazy loaded, protected/public guards
│       ├── components/
│       │   ├── auth/               ProtectedRoute · PublicRoute
│       │   ├── layout/             AppLayout · Sidebar · TopBar
│       │   ├── sos/                SOSBanner (active alert strip)
│       │   └── ui/                 LoadingScreen
│       ├── features/
│       │   ├── auth/               Login · Register · ForgotPassword · ResetPassword
│       │   ├── dashboard/          Stats · ML risk meter · confidence bar · factor pills
│       │   ├── sos/                SOS trigger · voice · countdown · RiskPanel · TrackSOS
│       │   ├── tracking/           Live Leaflet map · GPS watch · safe zone overlays
│       │   ├── contacts/           CRUD modal · priority · notification prefs
│       │   ├── incidents/          Report form · list · filter · pagination
│       │   ├── zones/              CRUD modal · inline map · click-to-pin
│       │   ├── analytics/          Recharts bar/pie/line · risk distribution
│       │   ├── notifications/      List · mark read · unread badge
│       │   └── subscription/       Plan cards · Razorpay · Stripe · transaction history
│       ├── store/slices/
│       │   ├── authSlice.js        User auth + async thunks + token storage
│       │   ├── sosSlice.js         Active SOS + ML fields + history
│       │   ├── notificationSlice.js Notification list + unread count
│       │   └── locationSlice.js    GPS coordinates + watch state
│       └── lib/
│           ├── api.js              Axios + auto refresh interceptor
│           └── socket.js           Socket.IO singleton + reconnect
│
└── devops/
    ├── docker/
    │   ├── backend.Dockerfile      Multi-stage · non-root · dumb-init · health check
    │   └── frontend.Dockerfile     Vite build → nginx serve
    ├── nginx/
    │   ├── nginx.conf              TLS 1.2/1.3 · OCSP · rate limiting · WS proxy
    │   └── spa.conf                SPA try_files fallback · asset caching
    └── github/
        └── ci-cd.yml               Test → build → push GHCR → SSH deploy → health check
```

---

## Quick Start

### Prerequisites
```
Node.js ≥ 20    npm ≥ 10    Git    Docker Desktop
```

### 1. Clone & Install
```bash
git clone https://github.com/YOUR_USERNAME/safeguard.git
cd safeguard

cd backend  && npm install
cd ../frontend && npm install
```

### 2. Start Redis
```bash
docker run -d --name safeguard-redis -p 6379:6379 \
  redis:7-alpine redis-server --requirepass "your_redis_password"
```

### 3. Configure Environment
```bash
cd backend
cp .env.example .env
# Fill in MONGODB_URI, JWT_SECRET, REDIS_PASSWORD, SMTP_*, etc.

cd ../frontend
cp .env.example .env
# Fill in VITE_RAZORPAY_KEY_ID, VITE_STRIPE_PUBLISHABLE_KEY
```

### 4. Run
```bash
# Terminal 1
cd backend && npm run dev
# → SafeGuard API running on port 5000

# Terminal 2
cd frontend && npm run dev
# → http://localhost:3000
```

### Docker (all services)
```bash
docker compose up -d --build
# Starts: backend · frontend · redis · nginx
```

---

## Environment Variables

### Required (backend/.env)

```bash
# Application
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000

# MongoDB Atlas
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/safeguard

# JWT — generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=<64+ char random string>
JWT_REFRESH_SECRET=<64+ char random string>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=<your_redis_password>

# Email (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@gmail.com
SMTP_PASS=<16-char Gmail App Password>   # NOT your real password
EMAIL_FROM=your@gmail.com
EMAIL_FROM_NAME=SafeGuard

# Twilio SMS
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
TWILIO_PHONE_NUMBER=+12025551234

# Payments
RAZORPAY_KEY_ID=rzp_test_xxxx
RAZORPAY_KEY_SECRET=xxxx
RAZORPAY_WEBHOOK_SECRET=xxxx
STRIPE_SECRET_KEY=sk_test_xxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxx

# CORS
ALLOWED_ORIGINS=http://localhost:3000

# ML Model (optional — leave blank for rule-based fallback)
ML_MODEL_URL=
ML_MODEL_TIMEOUT_MS=3000
ML_MODEL_API_KEY=
```

> See `backend/.env.example` for the full list with descriptions.

---

## API Reference

### Authentication `POST /api/v1/auth/`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/register` | — | Create account, sends verification email |
| POST | `/login` | — | Returns access + refresh token pair |
| POST | `/refresh` | — | Rotates token pair (old refresh invalidated) |
| POST | `/logout` | ✓ | Blacklists access token in Redis |
| GET | `/verify-email/:token` | — | Verifies email from link |
| POST | `/forgot-password` | — | Sends reset link (no email enumeration) |
| PATCH | `/reset-password/:token` | — | Sets new password |
| PATCH | `/change-password` | ✓ | Invalidates all sessions |
| GET | `/me` | ✓ | Current user with contacts + zones |
| PATCH | `/me` | ✓ | Update profile (role/subscription blocked) |

### SOS `POST /api/v1/sos/`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/trigger` | ✓ | Trigger SOS — runs ML, notifies contacts, returns risk score |
| PATCH | `/:id/location` | ✓ | Stream live GPS to backend (called every move) |
| PATCH | `/:id/resolve` | ✓ | Resolve or mark as false alarm |
| GET | `/active` | ✓ | Get current active SOS for this user |
| GET | `/history` | ✓ | Paginated SOS history with ML fields |
| GET | `/track/:id` | — | Public — for emergency contacts tracking link |

### Safe Zones `POST /api/v1/zones/`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | ✓ | All zones for current user |
| POST | `/` | ✓ | Create zone (free: max 3, premium: max 20) |
| GET | `/nearby?lng=&lat=&radius=` | ✓ | Zones within radius (geospatial `$near`) |
| GET | `/:id` | ✓ | Single zone |
| PATCH | `/:id` | ✓ | Update zone |
| DELETE | `/:id` | ✓ | Delete zone |

### Other Endpoints
| Module | Base | Key operations |
|---|---|---|
| Location | `/api/v1/location` | POST `/update`, GET `/live` |
| Contacts | `/api/v1/contacts` | CRUD, phone E.164 validation |
| Incidents | `/api/v1/incidents` | CRUD + admin review routes |
| Analytics | `/api/v1/analytics` | GET `/me`, GET `/admin` (admin role) |
| Notifications | `/api/v1/notifications` | List, mark read, FCM token, preferences |
| Subscriptions | `/api/v1/subscriptions` | Razorpay order/verify, Stripe session, webhooks, invoice |

### GraphQL `/graphql`
Available in development. Queries: `me`, `mySOSHistory`, `myIncidents`, `myContacts`, `mySafeZones`, `myNotifications`, `myAnalytics`. Mutations: `markNotificationRead`, `markAllNotificationsRead`.

---

## ML Risk Engine

### Architecture

```
SOS Trigger
    │
    ▼
aiRiskAnalysis()                    ← ai.service.js
    │
    ├── extractFeatures()           ← ml/featureExtractor.js
    │   Parallel MongoDB queries:
    │   • SOS density 500m / 1km (last 30 days)
    │   • High-severity incidents 1km (last 60 days)
    │   • Area average risk baseline
    │   • User SOS frequency 7d / 30d
    │   • Safe zone check (Haversine vs all active zones)
    │   Outputs 17 normalised features [0, 1]
    │
    └── mlModelAdapter.predict()    ← ml/mlModelAdapter.js
            │
            ├── ML_MODEL_URL set? → POST /predict to FastAPI
            │   Response: { score, confidence, factors, model_version }
            │   Timeout/error → fallback ↓
            │
            └── ruleBasedModel.predict()   ← ml/ruleBasedModel.js
                Returns score + confidence: 0.6
```

### 17 Features

| Feature | Description | Range |
|---|---|---|
| `hour_sin`, `hour_cos` | Cyclic time encoding | [-1, 1] |
| `day_sin`, `day_cos` | Cyclic day-of-week encoding | [-1, 1] |
| `is_night` | Hour in [22:00, 05:00) | 0 / 1 |
| `is_evening` | Hour in [20:00, 22:00) or [05:00, 07:00) | 0 / 1 |
| `is_weekend` | Saturday or Sunday | 0 / 1 |
| `sos_density_500m` | SOS alerts within 500m, last 30 days (cap 20) | [0, 1] |
| `sos_density_1km` | SOS alerts within 1km, last 30 days (cap 40) | [0, 1] |
| `incident_high_1km` | High/critical incidents 1km, last 60 days (cap 10) | [0, 1] |
| `incident_any_500m` | Any incidents 500m, last 60 days (cap 20) | [0, 1] |
| `area_avg_risk` | Average risk score of nearby SOS alerts | [0, 1] |
| `user_weekly_freq` | User SOS count last 7 days (cap 5) | [0, 1] |
| `user_monthly_freq` | User SOS count last 30 days (cap 15) | [0, 1] |
| `lat_norm`, `lng_norm` | Normalised coordinates | [0, 1] |
| **`safe_zone_inside`** | **1 if inside any active safe zone** | **0 / 1** |

### Safe Zone Risk Reduction

When `safe_zone_inside = 1`:
- **Rule-based model**: deducts 20 points after all signals, minimum 0
- **ML model**: learned from training data — safe zone suppresses high-risk label with ~70% probability
- Factor pill `"Inside a safe zone (risk reduced)"` shown in UI

### Risk Levels

| Score | Level | Colour |
|---|---|---|
| 0–39 | Low | Green |
| 40–59 | Medium | Yellow |
| 60–79 | High | Orange |
| 80–100 | Critical | Red |

### Plugging in a Real ML Model

```bash
# 1. Train
cd backend/docs
pip install scikit-learn joblib numpy fastapi uvicorn
python train_model.py          # → risk_model.joblib

# 2. Serve
uvicorn ml_service_example:app --host 0.0.0.0 --port 8000

# 3. Configure
# backend/.env:
ML_MODEL_URL=http://localhost:8000
ML_MODEL_TIMEOUT_MS=3000
```

Compatible with AWS SageMaker, Google Vertex AI, or any REST endpoint implementing:
```
POST /predict
Body: { "features": { ...17 fields... } }
Response: { "score": 74, "confidence": 0.87, "factors": [...], "model_version": "1.0.0" }
```

---

## Database Schema

### Key Indexes

```javascript
// User
email        → unique
phone        → unique
lastLocation → 2dsphere

// SOS
location     → 2dsphere
user + status
createdAt

// SafeZone
location     → 2dsphere
user + isActive

// Incident
location     → 2dsphere
user + status

// Notification
user + isRead + createdAt

// Transaction
user + status + createdAt
```

### SOS Document (ML fields)
```javascript
{
  user, triggerMethod, status,
  location: { type: 'Point', coordinates, accuracy, address },
  locationHistory: [{ coordinates, accuracy, timestamp }],
  aiRiskScore:   Number,   // 0-100
  aiRiskFactors: [String], // ["Late night hours", "Inside a safe zone (risk reduced)"]
  aiConfidence:  Number,   // 0-1
  aiLevel:       String,   // "low" | "medium" | "high" | "critical"
  aiModel:       String,   // "ml-service@1.0.0" | "rule-based-fallback"
  notifiedContacts: [...],
  deviceInfo: { platform, os, battery, networkType }
}
```

---

## Security

| Layer | Mechanism |
|---|---|
| **Authentication** | JWT HS256, 15m access + 7d refresh, Redis blacklist on logout |
| **Token rotation** | Every refresh issues a new pair; old token deleted from Redis |
| **Account lockout** | 5 failed logins → 2-hour lockout |
| **Password hashing** | bcrypt 12 rounds |
| **Input validation** | express-validator on every route + Mongoose schema validation |
| **NoSQL injection** | express-mongo-sanitize replaces `$` and `.` in all inputs |
| **Rate limiting** | API: 100/15m · Auth: 10/15m · SOS: 5/min · Payments: 20/hr |
| **HTTP headers** | Helmet — strict CSP, HSTS (1yr preload), X-Frame-Options: DENY |
| **CORS** | Strict origin whitelist, `SameSite=strict` cookies |
| **HPP** | HTTP Parameter Pollution prevention |
| **Payload limits** | `express.json({ limit: '10kb' })` — prevents memory exhaustion |
| **NGINX** | TLS 1.2/1.3 only, OCSP stapling, rate limit zones |
| **Docker** | Non-root user (UID 1001), dumb-init PID 1 |
| **Secrets** | Never committed — all environment variables |

---

## DevOps & CI/CD

### Docker Compose Services

| Service | Image | Port |
|---|---|---|
| `backend` | Multi-stage Node 20 Alpine | 5000 (internal) |
| `frontend` | Vite build → nginx 1.25 Alpine | 80 (internal) |
| `redis` | redis:7-alpine | 6379 (internal) |
| `nginx` | nginx:1.25-alpine | 80, 443 (public) |

### GitHub Actions Pipeline

```
git push origin main
    │
    ├─ test-backend    npm ci → eslint → jest (MongoDB test DB)
    ├─ test-frontend   npm ci → eslint → vite build
    │
    ├─ build-push      Docker buildx → push to GHCR
    │                  Tags: :latest, :sha-xxxxxxx, :main
    │
    └─ deploy          SSH → EC2
                       → docker pull latest images
                       → write PROD_ENV_FILE secret → .env
                       → rolling restart (backend first, 10s gap, then frontend)
                       → health check: curl /health (12 × 5s retries)
                       → rollback on failure
                       → docker image prune
```

### Required GitHub Secrets

| Secret | Description |
|---|---|
| `EC2_HOST` | EC2 public IP |
| `EC2_USER` | `ubuntu` or `ec2-user` |
| `EC2_SSH_KEY` | Contents of `.pem` key file |
| `MONGODB_TEST_URI` | Atlas test database URI |
| `JWT_SECRET_TEST` | 64+ char string for test runner |
| `JWT_REFRESH_SECRET_TEST` | 64+ char string for test runner |
| `PROD_ENV_FILE` | Full contents of production `.env` |

---

## Testing

```bash
cd backend

# All tests
npm test

# Individual suites
npx jest src/__tests__/auth.test.js
npx jest src/__tests__/sos.test.js
npx jest src/__tests__/contacts.test.js

# With coverage
npx jest --coverage
```

### Test Coverage

| Suite | Cases | Covers |
|---|---|---|
| `auth.test.js` | 8 | Register, login, token auth, logout, validation rejection |
| `sos.test.js` | 7 | Trigger, active fetch, location update, resolve, history, validation |
| `contacts.test.js` | 5 | CRUD, phone format validation, unauthenticated rejection |

---

## Contributing

```bash
git checkout -b feature/your-feature
# make changes
git commit -m "feat: describe your change"
git push origin feature/your-feature
# open Pull Request → merge to main triggers CI/CD
```

---
