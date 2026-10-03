import { cookies } from "next/headers";
import {
  createHash,
  createHmac,
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { query } from "./db";
import { ApiError } from "./http";
import type { User } from "./types";
const scrypt = promisify(nodeScrypt);
const cookieName = "odal_session";
export const hashToken = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [salt, encoded] = stored.split(":");
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(encoded, "hex");
  return hash.length === expected.length && timingSafeEqual(hash, expected);
}
export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  const result = await query<User>(
    `SELECT u.id,u.name,u.email,u.timezone,u.is_guest FROM users u
    JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>NOW()`,
    [hashToken(token)],
  );
  return result.rows[0] || null;
}
export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new ApiError(401, "다시 로그인해주세요.");
  return user;
}
export async function createSession(userId: string, guest: boolean) {
  const jar = await cookies();
  const old = jar.get(cookieName)?.value;
  if (old)
    await query("DELETE FROM sessions WHERE token_hash=$1", [hashToken(old)]);
  const token = randomBytes(32).toString("base64url");
  const age = (guest ? 7 : 30) * 24 * 60 * 60;
  await query(
    "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,$3)",
    [hashToken(token), userId, new Date(Date.now() + age * 1000)],
  );
  jar.set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: age,
  });
}
export async function logout() {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (token)
    await query("DELETE FROM sessions WHERE token_hash=$1", [hashToken(token)]);
  jar.delete(cookieName);
}
export async function rateLimit(
  request: Request,
  category: string,
  limit: number,
  minutes: number,
  identifier = "",
) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32)
    throw new ApiError(503, "계정 서비스 설정을 확인해주세요.");
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const key = createHmac("sha256", secret)
    .update(`${category}:${ip}:${identifier}`)
    .digest("hex");
  const result = await query<{ attempts: number }>(
    `INSERT INTO auth_rate_limits(key_hash,attempts,reset_at) VALUES($1,1,NOW()+$2*INTERVAL '1 minute')
    ON CONFLICT(key_hash) DO UPDATE SET attempts=CASE WHEN auth_rate_limits.reset_at<NOW() THEN 1 ELSE auth_rate_limits.attempts+1 END,
    reset_at=CASE WHEN auth_rate_limits.reset_at<NOW() THEN NOW()+$2*INTERVAL '1 minute' ELSE auth_rate_limits.reset_at END RETURNING attempts`,
    [key, minutes],
  );
  if (result.rows[0].attempts > limit)
    throw new ApiError(429, "시도가 많습니다. 잠시 후 다시 시도해주세요.");
}
