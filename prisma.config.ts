import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/gb_speaking_ai',
  },
  migrations: {
    seed: 'npx tsx prisma/seed.ts',
  },
});
