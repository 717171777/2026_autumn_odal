export type ChecklistItem = { id: string; title: string; done: boolean };
export type Recurrence = "none" | "daily" | "weekly" | "monthly";
export type Task = {
  id: string;
  title: string;
  notes: string;
  project_id: string | null;
  due_date: string | null;
  priority: number;
  recurrence: Recurrence;
  checklist: ChecklistItem[];
  completed_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};
export type Project = {
  id: string;
  name: string;
  color: string;
  archived_at: string | null;
};
export type User = {
  id: string;
  name: string;
  email: string | null;
  timezone: string;
  is_guest: boolean;
};
export type Workspace = {
  user: User;
  tasks: Task[];
  projects: Project[];
  today: string;
};
export const COLORS = ["orange", "blue", "green", "purple", "gray"] as const;
export const PRIORITIES = ["보통", "높음", "중간", "낮음"];
export const REPEATS: Record<Recurrence, string> = {
  none: "반복 안 함",
  daily: "매일",
  weekly: "매주",
  monthly: "매월",
};
