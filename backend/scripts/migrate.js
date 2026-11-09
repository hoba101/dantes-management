// Applies every SQL file in migrations/ in filename order.
// Usage: npm run db:migrate  (from backend/, with .env configured)
import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(here, "..", "migrations");

const client = new pg.Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

try {
  await client.connect();
} catch (err) {
  console.error("Could not connect to PostgreSQL:", err.message);
  console.error("Check backend/.env and that PostgreSQL is running.");
  process.exit(1);
}

const files = (await fs.readdir(migrationsDir))
  .filter((file) => file.endsWith(".sql"))
  .sort();

for (const file of files) {
  const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
  process.stdout.write(`→ ${file} ... `);
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log("ok");
  } catch (err) {
    await client.query("ROLLBACK");
    console.log("failed");
    console.error(err.message);
    await client.end();
    process.exit(1);
  }
}

await client.end();
console.log(`\nApplied ${files.length} migration(s).`);
