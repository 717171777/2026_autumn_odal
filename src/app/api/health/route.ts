import { query } from "@/lib/db";
import { endpoint, json } from "@/lib/http";
export const runtime = "nodejs";
export const GET = endpoint(async () => {
  await query("SELECT 1 FROM users LIMIT 1");
  return json({ status: "ok", database: "connected" });
});
