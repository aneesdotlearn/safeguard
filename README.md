# SafeGuard — Women Safety & Emergency Response Platform

Production-grade full-stack application for women's safety featuring real-time SOS alerts, live GPS tracking, AI-driven risk analysis, safe zone monitoring, and subscription-based premium features.

---

## Architecture Overview

```
safeguard/
├── backend/                  # Node.js + Express REST & GraphQL API
│   └── src/
│       ├── api/v1/           # Versioned REST route modules
│       │   ├── auth/         # Register, login, refresh, reset
│       │   ├── sos/          # Trigger, track, resolve alerts
│       │   ├── location/     # Live GPS updates
│       │   ├── contacts/     # Emergency contact CRUD
│       │   ├── incidents/    # Incident reporting
│       │   ├── zones/        # Safe zone management
│       │   ├── subscriptions/# Razorpay + Stripe payments
│       │   ├── analytics/    # Aggregated dashboards
│       │   └── notifications/# In-app + push notifications
│       ├── config/           # DB, Redis, Socket.IO, CORS
│       ├── graphql/          # Apollo Server schemas + resolvers
│       ├── middleware/       # Auth, rate limiting, validation, errors
│       ├── models/           # Mongoose schemas + indexes
│       ├── queues/           # BullMQ workers (SMS, email, push)
│       ├── services/         # AI risk, email, SMS, location, push
│       └── utils/            # JWT, logger, AppError
├── frontend/                 # React + Redux Toolkit + Tailwind CSS
│   └── src/
│       ├── components/       # Shared UI, layout, auth guards, SOS banner
│       ├── features/         # Page-level feature modules
│       ├── store/slices/     # Redux state (auth, sos, notifications, location)
│       ├── lib/              # Axios instance, Socket.IO client
│       └── hooks/            # (extensible)
└── devops/
    ├── docker/               # Multi-stage Dockerfiles
    ├── nginx/                # Reverse proxy + SSL termination
    └── github/               # CI/CD pipeline (GitHub Actions → AWS EC2)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend runtime | Node.js 20, Express 4 |
| API style | REST (versioned) + GraphQL (Apollo) |
| Auth | JWT (access + refresh rotation), bcrypt, Redis blacklist |
| Database | MongoDB Atlas (Mongoose, 2dsphere indexes, aggregation) |
| Cache / Queue | Redis 7 + BullMQ |
| Real-time | Socket.IO 4 (authenticated WebSocket) |
| AI risk engine | Rule-based geospatial analysis (SOS + incident density + time) |
| Payments | Razorpay (India) + Stripe (global), webhook verified |
| Notifications | Nodemailer SMTP + Twilio SMS + FCM push |
| Frontend | React 18, Redux Toolkit, Tailwind CSS, Vite |
| Maps | Leaflet + React-Leaflet (OpenStreetMap) |
| Charts | Recharts |
| DevOps | Docker multi-stage, GitHub Actions CI/CD, AWS EC2, NGINX |

---

## Getting Started

### Prerequisites
- Node.js ≥ 20
- MongoDB Atlas cluster
- Redis (local or Redis Cloud)
- Razorpay account (for INR payments)
- Stripe account (for card payments)
- Twilio account (SMS)
- SMTP credentials (email)

### Local Development

```bash
# 1. Clone repository
git clone https://github.com/your-org/safeguard.git
cd safeguard

# 2. Backend setup
cd backend
cp .env.example .env
# Fill in all values in .env
npm install
npm run dev

# 3. Frontend setup (new terminal)
cd ../frontend
cp .env.example .env
npm install
npm run dev
```

Backend API: http://localhost:5000  
Frontend: http://localhost:3000  
GraphQL Playground (dev only): http://localhost:5000/graphql

### Docker Deployment

```bash
# Build and start all services
cp backend/.env.example backend/.env
# Edit backend/.env with production values

# Place SSL certificates at:
# devops/nginx/ssl/fullchain.pem
# devops/nginx/ssl/privkey.pem

docker compose up -d --build
```

---

## API Reference

### Authentication (`/api/v1/auth`)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/register` | Create account |
| POST | `/login` | Login, returns JWT pair |
| POST | `/refresh` | Rotate access token |
| POST | `/logout` | Blacklist token |
| GET | `/verify-email/:token` | Verify email |
| POST | `/forgot-password` | Send reset link |
| PATCH | `/reset-password/:token` | Set new password |
| PATCH | `/change-password` | Authenticated password change |
| GET | `/me` | Get current user profile |
| PATCH | `/me` | Update profile |

### SOS (`/api/v1/sos`)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/trigger` | Trigger SOS, notify contacts |
| PATCH | `/:id/location` | Stream live GPS to backend |
| PATCH | `/:id/resolve` | Mark resolved / false alarm |
| GET | `/active` | Get current active SOS |
| GET | `/history` | Paginated SOS history |
| GET | `/track/:id` | Public tracking for contacts |

### Location (`/api/v1/location`)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/update` | Update live coordinates |
| GET | `/live` | Get cached live position |

### Contacts, Incidents, Zones, Analytics, Notifications, Subscriptions
Standard CRUD + specialized endpoints — see route files for full spec.

---

## Security Features

- **JWT**: HS256, short-lived (15m) access tokens + 7d refresh rotation via Redis
- **Token blacklisting**: Logout invalidates access token via Redis TTL
- **Account lockout**: 5 failed logins → 2h lockout
- **Password**: bcrypt (12 rounds prod, 4 rounds test), complexity enforced
- **Input validation**: express-validator on every route, mongoose schema validation
- **NoSQL injection**: express-mongo-sanitize replaces `$` and `.` in inputs
- **Rate limiting**: Global API (100/15m), Auth (10/15m), SOS (5/min), Payments (20/hr)
- **HTTP security**: Helmet with strict CSP, HSTS, XSS filter, no-sniff
- **CORS**: Strict origin whitelist, credentials allowed only for listed origins
- **CSRF**: SameSite=strict cookies
- **HPP**: HTTP parameter pollution prevention
- **Compression**: gzip on all responses
- **NGINX**: TLS 1.2/1.3 only, OCSP stapling, security headers, rate limiting
- **Secrets**: Never committed — all via environment variables
- **Docker**: Non-root user, dumb-init PID 1

---

## Environment Variables

See `backend/.env.example` for full list. Required values:

```
MONGODB_URI           MongoDB Atlas connection string
JWT_SECRET            ≥64 character random secret
JWT_REFRESH_SECRET    ≥64 character random secret
REDIS_HOST/PORT/PASS  Redis connection
SMTP_*                Email credentials
TWILIO_*              SMS credentials
RAZORPAY_*            Payment gateway
STRIPE_*              Payment gateway
ALLOWED_ORIGINS       Comma-separated frontend URLs
```

---

## CI/CD Pipeline

```
Push to main
  → Lint backend (ESLint)
  → Run backend tests (Jest + Supertest + MongoDB)
  → Lint + build frontend (Vite)
  → Build multi-stage Docker images
  → Push to GitHub Container Registry
  → SSH deploy to AWS EC2 (rolling restart)
  → Health check (12 × 5s retries)
  → Cleanup old images
```

Required GitHub Secrets:
```
EC2_HOST, EC2_USER, EC2_SSH_KEY
MONGODB_TEST_URI
JWT_SECRET_TEST, JWT_REFRESH_SECRET_TEST
PROD_ENV_FILE (entire .env content)
```

---

## Database Schema Design

- **User**: Embedded subscription, wallet, lastLocation (2dsphere), FCM tokens, login lock
- **SOS**: GeoJSON location + locationHistory array, AI scores, notifiedContacts, device info
- **Contact**: Per-user, unique phone constraint, priority ordering
- **SafeZone**: GeoJSON center + radius, schedule array, entry/exit flags
- **Incident**: GeoJSON location, type/severity enums, anonymous flag
- **Notification**: Type enum, isRead index, TTL-ready structure
- **Transaction**: Gateway-agnostic, stores order/payment/signature IDs

All geospatial fields use `2dsphere` indexes for `$near` and `$geoWithin` queries.

---

## License

MIT © SafeGuard
