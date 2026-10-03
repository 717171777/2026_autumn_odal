import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { addDays, todayIn } from "./dates";
export async function seedDemo(client: PoolClient, userId: string) {
  const today = todayIn();
  const projects = [
    { id: randomUUID(), name: "개인", color: "green" },
    { id: randomUUID(), name: "공부", color: "blue" },
    { id: randomUUID(), name: "사이드 프로젝트", color: "orange" },
  ];
  for (const p of projects)
    await client.query(
      "INSERT INTO projects(id,user_id,name,color) VALUES($1,$2,$3,$4)",
      [p.id, userId, p.name, p.color],
    );
  const samples = [
    [
      "지난주 회의 메모 정리하기",
      addDays(today, -1),
      projects[2].id,
      2,
      "필요한 내용을 정리하고 다음 회의 전에 공유하기.",
      "none",
    ],
    [
      "이번 주에 할 일 정리하기",
      today,
      projects[0].id,
      1,
      "금요일까지 마칠 일 확인하기.",
      "none",
    ],
    ["책 20페이지 읽기", today, projects[0].id, 0, "", "daily"],
    [
      "프로젝트 첫 화면 스케치하기",
      today,
      projects[2].id,
      2,
      "핵심 화면과 사용 흐름을 정리해보기.",
      "none",
    ],
    ["강의 노트 복습하기", today, projects[1].id, 0, "", "none"],
    ["산책하면서 잠깐 쉬기", today, projects[0].id, 0, "", "none"],
    ["다음 주 일정 확인하기", addDays(today, 1), projects[0].id, 0, "", "none"],
    [
      "포트폴리오 한 페이지 다듬기",
      addDays(today, 3),
      projects[2].id,
      2,
      "",
      "none",
    ],
    ["나중에 읽을 자료 모아두기", null, null, 0, "", "none"],
  ];
  for (const [title, due, project, priority, notes, recurrence] of samples) {
    const list =
      title === "프로젝트 첫 화면 스케치하기"
        ? [
            { id: randomUUID(), title: "화면에 필요한 정보 정리", done: true },
            { id: randomUUID(), title: "목록과 상세 화면 스케치", done: false },
          ]
        : [];
    await client.query(
      `INSERT INTO tasks(id,user_id,title,due_date,project_id,priority,notes,recurrence,checklist) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        randomUUID(),
        userId,
        title,
        due,
        project,
        priority,
        notes,
        recurrence,
        JSON.stringify(list),
      ],
    );
  }
  await client.query(
    `INSERT INTO tasks(id,user_id,title,due_date,project_id,completed_at) VALUES($1,$2,'책상 정리하기',$3,$4,NOW())`,
    [randomUUID(), userId, today, projects[0].id],
  );
}
