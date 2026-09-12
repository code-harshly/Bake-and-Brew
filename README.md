# Bake & Brew

Bake & Brew is a full-stack cafe point-of-sale and management application. It provides a staff billing interface for creating sales and printing receipts, together with an owner portal for managing inventory and reviewing monthly sales reports.

## Features

- Password-based authentication with separate owner and staff roles
- Staff product catalog with search and category filtering
- Cart and checkout flow
- UPI, cash, and card payment methods
- Atomic stock updates during checkout
- Receipt display and printing
- Persistent sales and inventory data in PostgreSQL
- Owner inventory management:
  - Add products
  - Edit prices and stock
  - Delete products
  - Low-stock indicators
- Owner monthly reports:
  - Revenue
  - Transaction count
  - Average order value
  - Daily revenue trends
  - Payment-method breakdown
  - Best-selling products
- Indian rupee (`₹`) currency display
- Vite React frontend with an Express API
- Vercel serverless deployment support

## Technology Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Express
- PostgreSQL
- Prisma
- Supabase PostgreSQL
- JSON Web Tokens (JWT)
- Recharts
- Lucide React
- Vercel

## Requirements

- Node.js 18 or newer
- npm
- PostgreSQL database

For production, Supabase PostgreSQL is recommended. Use a pooled Supabase connection string for Vercel deployments.

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
JWT_SECRET="replace-with-a-long-random-secret"
```

For local Supabase development, the direct database connection commonly uses port `5432`. If the password contains special characters, URL-encode them before placing the password in the connection string. For example:

- `@` becomes `%40`
- `#` becomes `%23`
- `$` becomes `%24`
- `:` becomes `%3A`

Never commit `.env` or any file containing real credentials.

### 3. Generate Prisma Client

```bash
npm run db:generate
```

### 4. Apply database migrations

For an existing database:

```bash
npm run db:migrate
```

For local schema development:

```bash
npm run db:migrate:dev
```

### 5. Seed the database

The seed script imports the legacy catalog and sales data from `data/bake_brew_store.json`:

```bash
npm run db:seed
```

### 6. Start the development server

```bash
npm run dev
```

The application is available at `http://localhost:3000`.

## Login

The current application has two roles:

- Owner: access to inventory and reports
- Staff: access to billing and checkout

The login passwords are currently defined in `server/auth.ts`. They are intentionally not displayed on the login screen. Change them before using the application in a real business environment.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local Express/Vite-compatible development server |
| `npm run build` | Generate Prisma Client, build the frontend, and bundle the server/API |
| `npm run start` | Start the production server from `dist/server.cjs` |
| `npm run lint` | Run the TypeScript type-check |
| `npm run db:generate` | Generate the Prisma Client |
| `npm run db:migrate` | Apply committed Prisma migrations |
| `npm run db:migrate:dev` | Create/apply development migrations |
| `npm run db:seed` | Import initial products and sales data |
| `npm run clean` | Remove generated build output |

## Production Build

Build the application locally with:

```bash
npm run build
```

The command creates:

- `dist/` - compiled frontend assets
- `dist/server.cjs` - bundled Express server
- `api/index.js` - bundled Vercel API function

## Deploying to Vercel

1. Push the project to GitHub.
2. Import the repository into Vercel.
3. Set the project framework to Vite, or allow Vercel to detect the configuration.
4. Add these environment variables for the Production environment:

   ```env
   DATABASE_URL=your-supabase-pooled-connection-string
   JWT_SECRET=your-long-random-secret
   ```

5. Use the build command:

   ```bash
   npm run build
   ```

6. Deploy the project.

### Supabase connection string for Vercel

Vercel serverless functions should use the Supabase **Transaction Pooler** connection string from **Connect → Connection pooling**. It generally resembles:

```text
postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true
```

Use the exact host, username, region, and password shown by Supabase. Do not guess the region or database host. Ensure `DATABASE_URL` is enabled for Production and redeploy after changing it.

## API Endpoints

### Health

```text
GET /api/health
```

### Authentication

```text
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
```

### Staff

```text
GET  /api/staff/products
POST /api/staff/checkout
```

### Owner

```text
GET    /api/owner/inventory
POST   /api/owner/inventory
PUT    /api/owner/inventory/:id
DELETE /api/owner/inventory/:id
GET    /api/owner/reports?year=YYYY&month=MM
```

Protected endpoints require the JWT returned by login, sent as a bearer token or authentication cookie.

## Project Structure

```text
.
├── api/
│   ├── handler.ts       # Vercel API handler source
│   ├── index.js         # Generated Vercel function bundle
│   └── package.json     # CommonJS runtime configuration for Vercel
├── data/
│   └── bake_brew_store.json
├── prisma/
│   ├── migrations/
│   ├── schema.prisma
│   └── seed.ts
├── server/
│   ├── auth.ts          # Authentication and JWT middleware
│   └── db.ts            # Prisma/PostgreSQL data access
├── server.ts            # Express application and API routes
├── src/
│   ├── components/
│   ├── api.ts
│   ├── App.tsx
│   └── types.ts
├── vercel.json
└── package.json
```

## Troubleshooting

### `/api/health` returns HTML

The API route is being caught by the frontend fallback. Confirm that `vercel.json` routes `/api/(.*)` to `/api/index.js`, then redeploy.

### `Cannot reach database server`

Check that:

1. `DATABASE_URL` is set in the correct Vercel environment.
2. The URL uses the Supabase pooler host and port `6543`.
3. The password is URL-encoded.
4. The database is running.
5. A new deployment was created after changing the environment variable.

### Login works but inventory or products fail

Authentication and database connectivity are separate checks. First test `/api/health`, then log in, then test the protected endpoint with the returned token. Review the Vercel function logs for database errors.

## Security Notes

- Do not commit passwords, JWT secrets, database URLs, or API keys.
- Replace the default role passwords before production use.
- Move authentication credentials to secure password hashes or an identity provider before exposing the application publicly.
- Use a unique, randomly generated `JWT_SECRET` in production.
- Restrict access to the Supabase database and use least-privilege credentials where possible.

## License

This project is private and does not currently specify a public open-source license.
