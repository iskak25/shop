// Применяет миграции при сборке на Vercel. Берёт прямой адрес БД, если он есть, иначе обычный.
import { spawnSync } from "node:child_process";

const url = process.env.DIRECT_URL || process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING
  || process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error("Не задана переменная DATABASE_URL. Vercel → Settings → Environment Variables → добавьте адрес PostgreSQL и запустите Redeploy.");
  process.exit(1);
}
const r = spawnSync("npx", ["prisma", "migrate", "deploy"], { stdio: "inherit", shell: true, env: { ...process.env, DATABASE_URL: url } });
process.exit(r.status ?? 1);
