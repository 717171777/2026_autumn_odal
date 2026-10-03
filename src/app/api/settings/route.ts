import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { endpoint, guardOrigin, readBody, json } from "@/lib/http";
export const runtime = "nodejs";
const settings = z
  .object({
    name: z.string().trim().min(1).max(50),
    timezone: z
      .string()
      .max(100)
      .refine((t) => {
        try {
          new Intl.DateTimeFormat("en", { timeZone: t });
          return true;
        } catch {
          return false;
        }
      }),
  })
  .strict();
export const PATCH = endpoint(async (request) => {
  guardOrigin(request);
  const user = await requireUser();
  const input = settings.parse(await readBody(request));
  await query("UPDATE users SET name=$1,timezone=$2 WHERE id=$3", [
    input.name,
    input.timezone,
    user.id,
  ]);
  return json({ ok: true });
});
