import pg from "pg";
import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const connectionString =
  process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!connectionString)
  throw new Error("DATABASE_URL is required. See .env.example.");
const url = new URL(connectionString);
if (!["localhost", "127.0.0.1", "db"].includes(url.hostname))
  url.searchParams.set("sslmode", "verify-full");
const client = new pg.Client({ connectionString: url.toString() });
await client.connect();
try {
  await client.query("SELECT pg_advisory_lock(7771712026)");
  await client.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())",
  );
  for (const name of (
    await readdir(new URL("../db/migrations/", import.meta.url))
  )
    .filter((x) => x.endsWith(".sql"))
    .sort()) {
    const sql = await readFile(
      new URL(`../db/migrations/${name}`, import.meta.url),
      "utf8",
    );
    const checksum = createHash("sha256").update(sql).digest("hex");
    const previous = await client.query(
      "SELECT checksum FROM schema_migrations WHERE name=$1",
      [name],
    );
    if (previous.rowCount) {
      if (previous.rows[0].checksum !== checksum)
        throw new Error(`Previously applied migration changed: ${name}`);
      continue;
    }
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)",
        [name, checksum],
      );
      await client.query("COMMIT");
      console.log(`Applied ${name}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
  console.log("Database is up to date.");
} finally {
  await client.query("SELECT pg_advisory_unlock(7771712026)");
  await client.end();
}
