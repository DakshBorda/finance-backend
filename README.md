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
