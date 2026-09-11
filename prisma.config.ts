import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // A placeholder keeps `prisma generate` usable without exposing a secret.
    // Migrate commands must be run with DATABASE_URL set.
    url: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/bake_brew?schema=public',
  },
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
});
