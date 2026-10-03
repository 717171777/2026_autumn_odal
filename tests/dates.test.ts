import test from "node:test";
import assert from "node:assert/strict";
import { nextOccurrence, todayIn } from "../src/lib/dates";
import { taskInput } from "../src/lib/validation";
test("monthly recurrence clamps to the last day, including leap years", () => {
  assert.equal(nextOccurrence("2026-01-31", "monthly"), "2026-02-28");
  assert.equal(nextOccurrence("2024-01-31", "monthly"), "2024-02-29");
  assert.equal(nextOccurrence("2026-12-31", "monthly"), "2027-01-31");
});
test("daily and weekly recurrence cross year boundaries", () => {
  assert.equal(nextOccurrence("2026-12-31", "daily"), "2027-01-01");
  assert.equal(nextOccurrence("2026-12-28", "weekly"), "2027-01-04");
});
test("today follows the user timezone instead of server timezone", () => {
  const date = new Date("2026-10-02T16:30:00Z");
  assert.equal(todayIn("Asia/Seoul", date), "2026-10-03");
  assert.equal(todayIn("America/Los_Angeles", date), "2026-10-02");
});
test("task validation rejects impossible dates and a repeat without a date", () => {
  assert.equal(
    taskInput.safeParse({ title: "일정", due_date: "2026-02-30" }).success,
    false,
  );
  assert.equal(
    taskInput.safeParse({ title: "일정", recurrence: "daily" }).success,
    false,
  );
  assert.equal(
    taskInput.safeParse({ title: "일정", due_date: "2024-02-29" }).success,
    true,
  );
});
test("clients cannot supply another account id or duplicate checklist ids", () => {
  assert.equal(
    taskInput.safeParse({ title: "일정", user_id: "someone-else" }).success,
    false,
  );
  const entry = {
    id: "fe746174-bb18-4b66-a8bf-bc2f98545a76",
    title: "항목",
    done: false,
  };
  assert.equal(
    taskInput.safeParse({ title: "일정", checklist: [entry, entry] }).success,
    false,
  );
});
