import { randomUUID } from "node:crypto";
import { endpoint, guardOrigin, readBody, json, ApiError } from "@/lib/http";
import {
  createSession,
  currentUser,
  hashPassword,
  logout,
  rateLimit,
  verifyPassword,
} from "@/lib/auth";
import { query, transaction } from "@/lib/db";
import { credentials } from "@/lib/validation";
import { seedDemo } from "@/lib/demo";
export const runtime = "nodejs";
export async function POST(
  request: Request,
  context: { params: Promise<{ action: string }> },
) {
  const { action } = await context.params;
  return endpoint(async (req) => {
    guardOrigin(req);
    if (action === "logout") {
      await logout();
      return json({ ok: true });
    }
    if (action === "demo") {
      await rateLimit(req, "demo", 30, 60);
      const existing = await currentUser();
      if (existing) return json({ ok: true });
      const id = randomUUID();
      await transaction(async (client) => {
        await client.query(
          "INSERT INTO users(id,name,is_guest) VALUES($1,'체험 사용자',TRUE)",
          [id],
        );
        await seedDemo(client, id);
      });
      await createSession(id, true);
      return json({ ok: true }, 201);
    }
    if (action !== "login" && action !== "signup")
      throw new ApiError(404, "페이지를 찾을 수 없습니다.");
    const input = credentials.parse(await readBody(req));
    await rateLimit(req, "auth-ip", 100, 15);
    await rateLimit(req, action, action === "login" ? 10 : 5, 15, input.email);
    if (action === "login") {
      const result = await query(
        "SELECT id,password_hash FROM users WHERE email=$1 AND is_guest=FALSE",
        [input.email],
      );
      const user = result.rows[0];
      const dummy = "0".repeat(32) + ":" + "0".repeat(128);
      const valid = await verifyPassword(
        input.password,
        user?.password_hash || dummy,
      );
      if (!user || !valid)
        throw new ApiError(401, "이메일 또는 비밀번호를 확인해주세요.");
      await createSession(user.id, false);
      return json({ ok: true });
    }
    if (!input.name) throw new ApiError(400, "이름을 입력해주세요.");
    const existing = await currentUser();
    const id = existing?.is_guest ? existing.id : randomUUID();
    const hash = await hashPassword(input.password);
    if (existing?.is_guest)
      await query(
        "UPDATE users SET email=$1,password_hash=$2,name=$3,is_guest=FALSE WHERE id=$4",
        [input.email, hash, input.name, id],
      );
    else
      await query(
        "INSERT INTO users(id,email,password_hash,name) VALUES($1,$2,$3,$4)",
        [id, input.email, hash, input.name],
      );
    await createSession(id, false);
    return json({ ok: true }, 201);
  })(request);
}
