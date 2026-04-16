// Loads .env* for local prisma migrate; safe in CI where env is injected.
import "dotenv/config";
import { defineConfig } from "prisma/config";

// `engine: "classic"` requires a `datasource`. Read `DATABASE_URL` with a
// harmless fallback so `prisma generate` can run in environments where the
// real URL isn't set (e.g. the Cloudflare Workers build). Actual DB commands
// (`prisma migrate`, `prisma db push`) still require a real URL and will
// fail loudly at run time if the fallback is used.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
});
