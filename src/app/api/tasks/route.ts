import { randomUUID } from "node:crypto";
import { requireUser } from "@/lib/auth";
import { transaction } from "@/lib/db";
import { endpoint, guardOrigin, readBody, json, ApiError } from "@/lib/http";
import { taskInput } from "@/lib/validation";
export const runtime = "nodejs";
export const POST = endpoint(async (request) => {
  guardOrigin(request);
  const user = await requireUser();
  const input = taskInput.parse(await readBody(request));
  const id = randomUUID();
  await transaction(async (c) => {
    await c.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [user.id]);
    const count = await c.query("SELECT COUNT(*) FROM tasks WHERE user_id=$1", [
      user.id,
    ]);
    if (Number(count.rows[0].count) >= 5000)
      throw new ApiError(409, "할 일은 최대 5,000개까지 보관할 수 있습니다.");
    if (input.project_id) {
      const project = await c.query(
        "SELECT id FROM projects WHERE id=$1 AND user_id=$2",
        [input.project_id, user.id],
      );
      if (!project.rowCount)
        throw new ApiError(404, "프로젝트를 찾을 수 없습니다.");
    }
    await c.query(
      `INSERT INTO tasks(id,user_id,title,notes,project_id,due_date,priority,recurrence,checklist) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        id,
        user.id,
        input.title,
        input.notes,
        input.project_id,
        input.due_date,
        input.priority,
        input.recurrence,
        JSON.stringify(input.checklist),
      ],
    );
  });
  return json({ id }, 201);
});
