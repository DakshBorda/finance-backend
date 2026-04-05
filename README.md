# Finance Data Processing & Access Control Backend

A production-grade RESTful API for managing financial transactions, user access control, and business analytics. Built with **Express.js**, **Prisma ORM**, and **PostgreSQL**.

## Features

- **JWT Authentication** with access/refresh token rotation
- **Role-Based Access Control** — Admin, Analyst, Viewer with granular permissions
- **Financial Records** — Full CRUD with Decimal(12,2) precision, auto-generated references
- **Dashboard Analytics** — Income/expense trends, category breakdowns, moving averages
- **Soft Deletion** — Non-destructive data management with restore capability
- **Rate Limiting** — Dual-tier protection (strict for auth, standard for API)
- **Structured Logging** — Winston with environment-aware transports

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express.js 4.22 |
| ORM | Prisma 5.22 |
| Database | PostgreSQL 14+ |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Validation | Joi 17 |
| Logging | Winston |
| Security | Helmet, CORS, express-rate-limit |

## Project Structure

```
src/
├── config/           # Environment, database, logger setup
├── controllers/      # Route handlers (thin — delegates to services)
├── middlewares/       # Auth, validation, rate limiting, error handling
├── routes/           # Express routers with role guards
├── services/         # Business logic layer
├── validators/       # Joi request schemas
└── utils/            # ApiError, ApiResponse, constants
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 14
- npm >= 9

### Installation

```bash
git clone <repository-url>
cd finance-backend

npm install

cp .env.example .env
# Edit .env with your database credentials

npx prisma generate
npx prisma migrate deploy

# (Optional) Seed with sample data
node scripts/seed.js

npm run dev
```

The server starts at `http://localhost:3000`.

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | — |
| `JWT_ACCESS_SECRET` | Access token signing key | — |
| `JWT_REFRESH_SECRET` | Refresh token signing key | — |
| `JWT_ACCESS_EXPIRY` | Access token TTL | `15m` |
| `JWT_REFRESH_EXPIRY` | Refresh token TTL | `7d` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` (15min) |
| `RATE_LIMIT_MAX` | Max requests per window | `100` |

## API Endpoints

### Auth (`/api/v1/auth`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/register` | Public | Create account (default: VIEWER) |
| POST | `/login` | Public | Get JWT token pair |
| POST | `/refresh` | Public | Refresh access token |
| GET | `/profile` | Authenticated | View own profile |
| PATCH | `/profile` | Authenticated | Update own name |
| PATCH | `/change-password` | Authenticated | Change password |

### Users (`/api/v1/users`) — Admin Only

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Admin | List users (paginated, searchable) |
| GET | `/:id` | Admin | Get user detail |
| PATCH | `/:id` | Admin | Update role/status |
| DELETE | `/:id` | Admin | Soft-delete user |
| PATCH | `/:id/restore` | Admin | Restore deleted user |

### Transactions (`/api/v1/transactions`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Any auth | List (filtered, paginated, sorted) |
| POST | `/` | Admin | Create transaction |
| GET | `/:id` | Any auth | Get detail |
| PATCH | `/:id` | Admin | Update transaction |
| DELETE | `/:id` | Admin | Soft-delete |

**Query filters:** `type`, `category`, `dateFrom`, `dateTo`, `amountMin`, `amountMax`, `search`, `sortBy`, `sortOrder`, `page`, `limit`

### Dashboard (`/api/v1/dashboard`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/overview` | Analyst, Admin | Income/expense totals, net balance |
| GET | `/category-summary` | Analyst, Admin | Category-wise breakdown with % |
| GET | `/trends` | Analyst, Admin | Monthly trends + moving average |
| GET | `/recent` | Any auth | Recent transactions |
| GET | `/top-categories` | Analyst, Admin | Top spending/earning categories |

## Access Control Matrix

| Resource | Viewer | Analyst | Admin |
|----------|--------|---------|-------|
| Register / Login | ✅ | ✅ | ✅ |
| Own Profile | ✅ | ✅ | ✅ |
| User Management | ❌ | ❌ | ✅ |
| View Transactions | ✅ | ✅ | ✅ |
| Manage Transactions | ❌ | ❌ | ✅ |
| Recent Activity | ✅ | ✅ | ✅ |
| Analytics Dashboard | ❌ | ✅ | ✅ |

## Response Format

All responses follow a consistent structure:

```json
// Success
{
  "success": true,
  "data": { ... },
  "message": "Optional context"
}

// Paginated
{
  "success": true,
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5
  }
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "details": ["field-level errors"]
  }
}
```

## Testing

```bash
# Start the server first
npm run dev

# Run individual phase tests
node scripts/test-phase2.js    # Auth & User Management (35 tests)
node scripts/test-phase3.js    # Transaction CRUD (49 tests)
node scripts/test-phase4.js    # Dashboard Analytics (36 tests)
```

**Total: 120 integration tests**

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with nodemon |
| `npm start` | Start production server |
| `node scripts/seed.js` | Seed database with sample data |

## Deployed API

- **Live URL:** https://finance-backend-z5xw.onrender.com
- **API Docs:** https://finance-backend-z5xw.onrender.com/api/v1/docs
- **Health Check:** https://finance-backend-z5xw.onrender.com/health

> Free-tier instances spin down after inactivity. First request may take ~50 seconds.

## Assumptions

1. This is an **organization-wide** finance dashboard — all authenticated users see all transactions (not user-scoped)
2. New users register with **VIEWER** role by default; only an Admin can promote roles
3. **Soft delete** is used for all records — financial data is never permanently destroyed
4. Amounts are stored as `Decimal(12,2)` — supports up to ₹9,999,999,999.99
5. All dates are in **ISO 8601** format; future dates are not allowed for transactions
6. Admin cannot delete or deactivate their own account (safety check)
7. Transaction references are auto-generated (`TXN-YYYYMMDD-XXXX`) if not provided, but unique when specified
8. Currency is single-currency (INR implied by seed data); multi-currency is out of scope

## Design Decisions & Tradeoffs

| Decision | Why | Tradeoff |
|----------|-----|----------|
| **Service Layer Pattern** | Separates business logic from HTTP handling; controllers stay thin | Slightly more files, but much easier to test and maintain |
| **Decimal instead of Float** | Financial accuracy — Float causes rounding bugs (e.g., 0.1 + 0.2 ≠ 0.3) | Requires explicit conversion; serialized as strings in JSON |
| **UUID primary keys** | Prevents ID enumeration attacks; no sequential guessing | Slightly larger than integers; less human-readable |
| **Soft deletes** | Financial records should never be permanently lost for audit trails | Requires `isDeleted` filter on every query |
| **Raw SQL for trends** | Prisma's `groupBy` can't do `TO_CHAR` date formatting or moving averages | Less portable across databases; tied to PostgreSQL |
| **Dual-tier rate limiting** | Auth endpoints need stricter protection (brute-force) than general API | More configuration; must skip in test environment |
| **JWT access + refresh pattern** | Short-lived access tokens (15min) limit damage from token theft | Client must handle token refresh flow |

## Security

- Passwords hashed with bcryptjs (12 salt rounds)
- JWT access tokens expire in 15 minutes
- Helmet sets security headers
- CORS configured per environment
- Rate limiting: 20 req/15min on auth, 100 req/15min on API
- Input validation on every endpoint via Joi
- Soft-delete prevents permanent data loss
- Admin cannot self-delete or self-demote

## License

ISC
