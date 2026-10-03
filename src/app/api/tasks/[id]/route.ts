import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { transaction } from "@/lib/db";
import { endpoint, guardOrigin, readBody, json, ApiError } from "@/lib/http";
import { taskInput, uuid } from "@/lib/validation";
import { nextOccurrence } from "@/lib/dates";
import type { Task } from "@/lib/types";
export const runtime = "nodejs";
const actionInput = z
  .object({ action: z.enum(["complete", "reopen", "trash", "restore"]) })
  .strict();
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return endpoint(async (req) => {
    guardOrigin(req);
    uuid.parse(id);
    const user = await requireUser();
    const body = await readBody(req);
    await transaction(async (c) => {
      await c.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [user.id]);
      const result = await c.query<Task>(
        `SELECT *,to_char(due_date,'YYYY-MM-DD') AS due_date FROM tasks WHERE id=$1 AND user_id=$2 FOR UPDATE`,
        [id, user.id],
      );
      const task = result.rows[0];
      if (!task) throw new ApiError(404, "할 일을 찾을 수 없습니다.");
      if (body.action) {
        const { action } = actionInput.parse(body);
        if (action === "trash")
          await c.query(
            "UPDATE tasks SET deleted_at=NOW(),updated_at=NOW() WHERE id=$1",
            [id],
          );
        if (action === "restore")
          await c.query(
            "UPDATE tasks SET deleted_at=NULL,updated_at=NOW() WHERE id=$1",
            [id],
          );
        if (action === "complete") {
          if (task.deleted_at)
            throw new ApiError(409, "휴지통에서 먼저 복원해주세요.");
          if (task.completed_at) return;
          await c.query(
            "UPDATE tasks SET completed_at=NOW(),updated_at=NOW() WHERE id=$1",
            [id],
          );
          if (task.recurrence !== "none" && task.due_date) {
            const count = await c.query(
              "SELECT COUNT(*) FROM tasks WHERE user_id=$1",
              [user.id],
            );
            if (Number(count.rows[0].count) >= 5000)
              throw new ApiError(409, "할 일 보관 한도에 도달했습니다.");
            await c.query(
              `INSERT INTO tasks(id,user_id,title,notes,project_id,due_date,priority,recurrence,checklist,recurrence_parent_id)
              VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
              [
                randomUUID(),
                user.id,
                task.title,
                task.notes,
                task.project_id,
                nextOccurrence(task.due_date, task.recurrence),
                task.priority,
                task.recurrence,
                JSON.stringify(
                  task.checklist.map((item) => ({
                    ...item,
                    id: randomUUID(),
                    done: false,
                  })),
                ),
                id,
              ],
            );
          }
        }
        if (action === "reopen") {
          if (task.deleted_at)
            throw new ApiError(409, "휴지통에서 먼저 복원해주세요.");
          const successor = await c.query(
            "SELECT id,completed_at,created_at,updated_at FROM tasks WHERE recurrence_parent_id=$1 FOR UPDATE",
            [id],
          );
          if (successor.rowCount) {
            const next = successor.rows[0];
            if (
              next.completed_at ||
              next.created_at.getTime() !== next.updated_at.getTime()
            )
              throw new ApiError(
                409,
                "다음 반복 할 일이 수정되어 완료를 취소할 수 없습니다.",
              );
            await c.query("DELETE FROM tasks WHERE id=$1", [next.id]);
          }
          await c.query(
            "UPDATE tasks SET completed_at=NULL,updated_at=NOW() WHERE id=$1",
            [id],
          );
        }
      } else {
        if (task.deleted_at)
          throw new ApiError(409, "휴지통에서 먼저 복원해주세요.");
        const input = taskInput.parse(body);
        if (input.project_id) {
          const p = await c.query(
            "SELECT id FROM projects WHERE id=$1 AND user_id=$2",
            [input.project_id, user.id],
          );
          if (!p.rowCount)
            throw new ApiError(404, "프로젝트를 찾을 수 없습니다.");
        }
        await c.query(
          `UPDATE tasks SET title=$1,notes=$2,project_id=$3,due_date=$4,priority=$5,recurrence=$6,checklist=$7,updated_at=NOW() WHERE id=$8`,
          [
            input.title,
            input.notes,
            input.project_id,
            input.due_date,
            input.priority,
            input.recurrence,
            JSON.stringify(input.checklist),
            id,
          ],
        );
      }
    });
    return json({ ok: true });
  })(request);
}
