import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { endpoint, json } from "@/lib/http";
import { todayIn } from "@/lib/dates";
export const runtime = "nodejs";
export const GET = endpoint(async () => {
  const user = await requireUser();
  const [tasks, projects] = await Promise.all([
    query(
      `SELECT id,title,notes,project_id,to_char(due_date,'YYYY-MM-DD') AS due_date,priority,recurrence,checklist,completed_at,deleted_at,created_at,updated_at FROM tasks WHERE user_id=$1 ORDER BY sort_order ASC`,
      [user.id],
    ),
    query(
      "SELECT id,name,color,archived_at FROM projects WHERE user_id=$1 ORDER BY created_at ASC,id ASC",
      [user.id],
    ),
  ]);
  return json({
    user,
    tasks: tasks.rows,
    projects: projects.rows,
    today: todayIn(user.timezone),
  });
});
