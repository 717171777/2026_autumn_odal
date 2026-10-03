import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { endpoint, guardOrigin, readBody, json, ApiError } from "@/lib/http";
import { projectInput, uuid } from "@/lib/validation";
import { z } from "zod";
export const runtime = "nodejs";
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
    if (body.action) {
      const { action } = z
        .object({ action: z.enum(["archive", "restore"]) })
        .strict()
        .parse(body);
      const result = await query(
        `UPDATE projects SET archived_at=${action === "archive" ? "NOW()" : "NULL"} WHERE id=$1 AND user_id=$2`,
        [id, user.id],
      );
      if (!result.rowCount)
        throw new ApiError(404, "프로젝트를 찾을 수 없습니다.");
      return json({ ok: true });
    }
    const input = projectInput.parse(body);
    const result = await query(
      "UPDATE projects SET name=$1,color=$2 WHERE id=$3 AND user_id=$4",
      [input.name, input.color, id, user.id],
    );
    if (!result.rowCount)
      throw new ApiError(404, "프로젝트를 찾을 수 없습니다.");
    return json({ ok: true });
  })(request);
}
