import { randomUUID } from "node:crypto";
import { requireUser } from "@/lib/auth";
import { transaction } from "@/lib/db";
import { endpoint, guardOrigin, readBody, json, ApiError } from "@/lib/http";
import { projectInput } from "@/lib/validation";
export const runtime = "nodejs";
export const POST = endpoint(async (request) => {
  guardOrigin(request);
  const user = await requireUser();
  const input = projectInput.parse(await readBody(request));
  const id = randomUUID();
  await transaction(async (c) => {
    await c.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [user.id]);
    const result = await c.query(
      "SELECT COUNT(*) FROM projects WHERE user_id=$1",
      [user.id],
    );
    if (Number(result.rows[0].count) >= 100)
      throw new ApiError(409, "프로젝트는 최대 100개까지 만들 수 있습니다.");
    await c.query(
      "INSERT INTO projects(id,user_id,name,color) VALUES($1,$2,$3,$4)",
      [id, user.id, input.name, input.color],
    );
  });
  return json({ id }, 201);
});
