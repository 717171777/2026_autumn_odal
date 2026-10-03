import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import pg from "pg";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3040";
if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname))
  throw new Error(
    "Integration tests are restricted to local test environments.",
  );
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const users = [];
let checks = 0;
function session() {
  return { cookie: "" };
}
async function request(
  actor,
  path,
  method = "GET",
  data,
  expected = 200,
  origin = base,
) {
  const response = await fetch(base + path, {
    method,
    headers: {
      Origin: origin,
      ...(actor.cookie ? { Cookie: actor.cookie } : {}),
      ...(data ? { "Content-Type": "application/json" } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  const body = await response.json();
  assert.equal(
    response.status,
    expected,
    `${method} ${path}: ${JSON.stringify(body)}`,
  );
  checks++;
  const cookie = response.headers
    .getSetCookie()
    .find((c) => c.startsWith("odal_session="));
  if (cookie) actor.cookie = cookie.split(";")[0];
  return { body, response };
}
async function signup(actor, name) {
  const email = `odal-test-${randomUUID()}@example.invalid`,
    password = randomBytes(20).toString("base64url");
  const result = await request(
    actor,
    "/api/auth/signup",
    "POST",
    { name, email, password },
    201,
  );
  assert.match(result.response.headers.get("set-cookie"), /HttpOnly/i);
  checks++;
  const { body } = await request(actor, "/api/workspace");
  users.push(body.user.id);
  return { email, password, id: body.user.id };
}
try {
  const anonymous = session(),
    a = session(),
    b = session();
  await request(anonymous, "/api/workspace", "GET", undefined, 401);
  await request(anonymous, "/api/health");
  const account = await signup(a, "테스트 사용자 A");
  await signup(b, "테스트 사용자 B");
  await request(
    a,
    "/api/auth/signup",
    "POST",
    { name: "중복", email: account.email, password: account.password },
    409,
  );
  await request(
    a,
    "/api/tasks",
    "POST",
    { title: "거부된 요청" },
    403,
    "https://untrusted.invalid",
  );
  const p = (
    await request(
      a,
      "/api/projects",
      "POST",
      { name: "테스트 프로젝트", color: "blue" },
      201,
    )
  ).body.id;
  await request(a, `/api/projects/${p}`, "PATCH", {
    name: "프로젝트 수정",
    color: "green",
  });
  await request(
    b,
    `/api/projects/${p}`,
    "PATCH",
    { name: "다른 계정", color: "blue" },
    404,
  );
  const checklist = [{ id: randomUUID(), title: "세부 단계", done: false }];
  const t = (
    await request(
      a,
      "/api/tasks",
      "POST",
      {
        title: "테스트 할 일",
        notes: "저장 확인",
        project_id: p,
        due_date: "2026-12-31",
        priority: 1,
        checklist,
      },
      201,
    )
  ).body.id;
  await request(b, `/api/tasks/${t}`, "PATCH", { action: "complete" }, 404);
  await request(
    b,
    "/api/tasks",
    "POST",
    { title: "프로젝트 침범", project_id: p },
    404,
  );
  await request(a, "/api/tasks", "POST", { title: "   " }, 400);
  await request(
    a,
    "/api/tasks",
    "POST",
    { title: "입력 오류", due_date: "2026-02-30" },
    400,
  );
  await request(
    a,
    "/api/tasks",
    "POST",
    { title: "입력 오류", priority: 99 },
    400,
  );
  await request(
    a,
    "/api/tasks",
    "POST",
    { title: "계정 변조", user_id: account.id },
    400,
  );
  await request(a, `/api/tasks/${t}`, "PATCH", {
    title: "수정한 할 일",
    notes: "새 메모",
    project_id: p,
    due_date: "2026-12-31",
    priority: 2,
    checklist: [{ ...checklist[0], done: true }],
  });
  let state = (await request(a, "/api/workspace")).body;
  assert.equal(state.tasks.find((x) => x.id === t).checklist[0].done, true);
  checks++;
  await request(a, `/api/tasks/${t}`, "PATCH", { action: "complete" });
  state = (await request(a, "/api/workspace")).body;
  assert.ok(state.tasks.find((x) => x.id === t).completed_at);
  checks++;
  await request(a, `/api/tasks/${t}`, "PATCH", { action: "reopen" });
  await request(a, `/api/tasks/${t}`, "PATCH", { action: "trash" });
  state = (await request(a, "/api/workspace")).body;
  assert.ok(state.tasks.find((x) => x.id === t).deleted_at);
  checks++;
  await request(a, `/api/tasks/${t}`, "PATCH", { action: "complete" }, 409);
  await request(a, `/api/tasks/${t}`, "PATCH", { action: "restore" });
  await request(a, `/api/projects/${p}`, "PATCH", { action: "archive" });
  state = (await request(a, "/api/workspace")).body;
  assert.ok(state.projects.find((x) => x.id === p).archived_at);
  assert.equal(state.tasks.find((x) => x.id === t).project_id, p);
  checks += 2;
  await request(b, `/api/projects/${p}`, "PATCH", { action: "restore" }, 404);
  await request(a, `/api/projects/${p}`, "PATCH", { action: "restore" });
  const recurring = (
    await request(
      a,
      "/api/tasks",
      "POST",
      { title: "매월 반복", due_date: "2026-01-31", recurrence: "monthly" },
      201,
    )
  ).body.id;
  await request(a, `/api/tasks/${recurring}`, "PATCH", { action: "complete" });
  await request(a, `/api/tasks/${recurring}`, "PATCH", { action: "complete" });
  state = (await request(a, "/api/workspace")).body;
  let next = state.tasks.find(
    (x) => x.title === "매월 반복" && !x.completed_at,
  );
  assert.equal(next.due_date, "2026-02-28");
  assert.equal(state.tasks.filter((x) => x.title === "매월 반복").length, 2);
  checks += 2;
  await request(a, `/api/tasks/${recurring}`, "PATCH", { action: "reopen" });
  state = (await request(a, "/api/workspace")).body;
  assert.equal(state.tasks.filter((x) => x.title === "매월 반복").length, 1);
  checks++;
  await request(a, `/api/tasks/${recurring}`, "PATCH", { action: "complete" });
  state = (await request(a, "/api/workspace")).body;
  next = state.tasks.find((x) => x.title === "매월 반복" && !x.completed_at);
  await request(a, `/api/tasks/${next.id}`, "PATCH", {
    title: "변경한 다음 할 일",
    due_date: next.due_date,
    recurrence: "monthly",
  });
  await request(
    a,
    `/api/tasks/${recurring}`,
    "PATCH",
    { action: "reopen" },
    409,
  );
  await request(a, "/api/settings", "PATCH", {
    name: "변경한 이름",
    timezone: "America/Los_Angeles",
  });
  await request(
    a,
    "/api/settings",
    "PATCH",
    { name: "실패", timezone: "Invalid/Timezone" },
    400,
  );
  const oldCookie = a.cookie;
  await request(a, "/api/auth/logout", "POST", {});
  a.cookie = oldCookie;
  await request(a, "/api/workspace", "GET", undefined, 401);
  await request(a, "/api/auth/login", "POST", {
    email: account.email,
    password: account.password,
  });
  state = (await request(a, "/api/workspace")).body;
  assert.equal(state.user.name, "변경한 이름");
  assert.ok(state.tasks.find((x) => x.id === t));
  checks += 2;
  const guest = session();
  await request(guest, "/api/auth/demo", "POST", {}, 201);
  state = (await request(guest, "/api/workspace")).body;
  users.push(state.user.id);
  assert.equal(state.tasks.length, 10);
  checks++;
  const guestId = state.user.id;
  await request(
    guest,
    "/api/auth/signup",
    "POST",
    {
      name: "전환한 사용자",
      email: `odal-test-${randomUUID()}@example.invalid`,
      password: randomBytes(20).toString("base64url"),
    },
    201,
  );
  state = (await request(guest, "/api/workspace")).body;
  assert.equal(state.user.id, guestId);
  assert.equal(state.user.is_guest, false);
  assert.equal(state.tasks.length, 10);
  checks += 3;
  const attacker = session();
  const missingEmail = `missing-${randomUUID()}@example.invalid`;
  for (let i = 0; i < 10; i++)
    await request(
      attacker,
      "/api/auth/login",
      "POST",
      { email: missingEmail, password: "invalid-password" },
      401,
    );
  await request(
    attacker,
    "/api/auth/login",
    "POST",
    { email: missingEmail, password: "invalid-password" },
    429,
  );
  console.log(
    `${checks} integration checks passed: persistence, ownership, validation, CSRF, recurrence, recovery, authentication and rate limits.`,
  );
} finally {
  for (const id of users)
    await pool.query("DELETE FROM users WHERE id=$1", [id]);
  await pool.end();
}
