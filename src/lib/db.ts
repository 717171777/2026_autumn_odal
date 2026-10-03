import { Pool, type PoolClient, type QueryResultRow } from "pg";
const globalDb = globalThis as unknown as { odalPool?: Pool };
function pool() {
  if (!globalDb.odalPool) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing");
    const url = new URL(process.env.DATABASE_URL);
    if (!["localhost", "127.0.0.1", "db"].includes(url.hostname))
      url.searchParams.set("sslmode", "verify-full");
    globalDb.odalPool = new Pool({
      connectionString: url.toString(),
      max: 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
    });
    globalDb.odalPool.on("error", () =>
      console.error("PostgreSQL pool connection error"),
    );
  }
  return globalDb.odalPool;
}
export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  values: unknown[] = [],
) {
  return pool().query<T>(sql, values);
}
export async function transaction<T>(work: (client: PoolClient) => Promise<T>) {
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
