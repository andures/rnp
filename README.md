# RNP Portal

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-22.x-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-5.x-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-8.x-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/MUI-v7-007FFF?style=for-the-badge&logo=mui&logoColor=white" />
</p>

<p align="center">
  Institutional web portal that integrates with Honduras's <strong>Registro Nacional de Personas (RNP)</strong> API to query civil registry data — birth certificates, genealogical trees, and full registration records — through a secure, role-based interface.
</p>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Security](#security)

---

## Overview

The RNP Portal provides authorized institutional users with a clean interface to query the national civil registry. It enforces multi-layer security (rate limiting, JWT auth, input sanitization) to protect both the application and the external RNP API from misuse.

Administrators can manage users, monitor live session activity, and inspect per-user query logs. Regular users interact with a guided API console that formats translated SOAP/XML responses into readable results with PDF-ready document output.

---

## Features

### Authentication & Authorization
- JWT-based authentication stored in **HTTP-only cookies** (XSS-safe)
- Role-based access control with `admin` and `user` roles
- Automatic **account lockout** after repeated failed login attempts
- Password strength enforcement with real-time UI indicator
- Token refresh flow with silent re-authentication

### Admin Dashboard
- Full **user management** — create, activate/deactivate, and manage accounts
- Real-time **session log viewer** with activity type filters
- Per-user **activity logs** with query history and timestamps

### RNP API Integration
- **Certificado de Nacimiento** — Retrieve birth certificate (base64 encoded, downloadable)
- **Árbol Genealógico** — Multi-generation family tree with kinship labels
- **Información Completa de Inscripción** — Full registration record including parents' data
- SOAP/XML response parsing into structured JSON
- Downloadable `.docx` document generation from query results

### Security
- `Helmet` — HTTP security headers
- `express-rate-limit` — Tiered rate limiting (general, login, external API)
- `express-mongo-sanitize` — NoSQL injection prevention
- `hpp` — HTTP Parameter Pollution protection
- `cors` — Strict origin whitelisting
- `bcryptjs` — Secure password hashing
- Input validation & sanitization on every route via `express-validator`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 22 |
| Backend Framework | Express 5 + TypeScript |
| Database | MongoDB 8 via Mongoose 8 |
| Authentication | JSON Web Tokens + bcryptjs |
| Frontend Framework | React 19 + TypeScript |
| Build Tool | Vite 6 |
| UI Library | Material UI v7 |
| HTTP Client | Axios |
| External API | RNP SOAP/XML (Honduras) |
| Document Generation | docx |
| Process Manager | nodemon + ts-node |

---

## Architecture

```
rnp/
├── backend/
│   ├── config/          # MongoDB connection
│   ├── controllers/     # Route handlers (auth)
│   ├── middleware/      # Auth, security, session, validators
│   ├── models/          # Mongoose schemas (User, SessionLog)
│   ├── routes/          # auth, users, rnp, admin
│   ├── services/        # RNP API client, session logger, admin init
│   └── server.ts        # Express app entry point
│
└── frontend/
    └── src/
        ├── components/  # Layout, Login, Admin views, User dashboard
        ├── contexts/    # Auth, Theme, Navigation, Logs
        ├── hooks/       # useAuth, useTheme, useNavigation, useLogs
        ├── services/    # Axios API layer, session logging
        └── utils/       # Password validation, activity logging
```

**Request flow:**
```
Client → CORS / Helmet / Rate Limiter → JWT Auth Middleware
       → Input Validation & Sanitization → Controller
       → RNP SOAP Service → XML Parser → JSON Response
       → Session Logger → Client
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- MongoDB instance (local or Atlas)

### Installation

```bash
# Clone the repository
git clone https://github.com/andures/rnp.git
cd rnp

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### Running in Development

```bash
# Backend + Frontend concurrently
npm run dev:both

# Backend only
npm run dev

# Frontend only
npm run client
```

### Building for Production

```bash
npm run build        # builds frontend to frontend/dist/
npm start            # serves compiled backend
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for signing JWT tokens |
| `JWT_REFRESH_SECRET` | Secret key for refresh tokens |
| `PORT` | Backend port (default: `3001`) |
| `NODE_ENV` | `development` or `production` |
| `ADMIN_EMAIL` | Email for the auto-initialized admin account |
| `ADMIN_PASSWORD` | Initial password for the admin account |
| `CLIENT_URL` | Frontend origin URL for CORS |

---

## API Reference

All endpoints are prefixed with `/api`.

### Auth — `/api/auth`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/login` | Public | Authenticate and receive JWT cookie |
| `POST` | `/register` | Admin | Create a new user account |
| `POST` | `/refresh` | Public | Refresh access token |
| `POST` | `/logout` | Private | Invalidate session |
| `GET` | `/profile` | Private | Get current user profile |

### RNP — `/api/rnp`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/certificado-nacimiento` | Private | Fetch birth certificate |
| `POST` | `/arbol-genealogico` | Private | Fetch genealogical tree |
| `POST` | `/inscripcion-nacimiento` | Private | Fetch birth registration |
| `POST` | `/informacion-completa` | Private | Fetch full inscription record |

### Admin — `/api/admin`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/users` | Admin | List all users |
| `PATCH` | `/users/:id` | Admin | Update user status/role |
| `DELETE` | `/users/:id` | Admin | Delete user |
| `GET` | `/session-logs` | Admin | View all session logs |
| `GET` | `/session-logs/:userId` | Admin | View logs for a specific user |

---

## Security

This project was built with security as a first-class concern:

- **Brute-force protection** — login endpoint limited to 5 attempts per 15 minutes per IP; accounts lock after consecutive failures
- **JWT in HTTP-only cookies** — tokens are inaccessible to JavaScript, preventing XSS-based token theft
- **Input validation** — every user-supplied value is validated and sanitized before reaching business logic
- **NoSQL injection prevention** — `express-mongo-sanitize` strips `$` operators from request bodies and query strings
- **Security headers** — `Helmet` sets CSP, HSTS, X-Frame-Options, and other protective headers
- **CORS whitelisting** — only the configured `CLIENT_URL` origin is allowed cross-origin access
- **Rate limiting** — three independent rate limiters (general, login, external API) protect against DDoS and API abuse

---

## License

This project is licensed under the ISC License.
