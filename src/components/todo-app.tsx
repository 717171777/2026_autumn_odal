"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import {
  Sun,
  CalendarDays,
  Inbox,
  Layers,
  CheckCheck,
  Trash2,
  Search,
  Plus,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Settings,
  LogOut,
  ArrowUpDown,
  Check,
  Flag,
  Repeat2,
  ListChecks,
  MoreHorizontal,
  Download,
  Loader2,
  Undo2,
  Hash,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import AuthScreen, { api } from "./auth-screen";
import TaskEditor from "./task-editor";
import { Brand, Modal, Field } from "./primitives";
import {
  type Workspace,
  type Task,
  type Project,
  COLORS,
  PRIORITIES,
} from "@/lib/types";
import { addDays, prettyDate } from "@/lib/dates";
type View =
  | "today"
  | "upcoming"
  | "inbox"
  | "all"
  | "completed"
  | "trash"
  | `project:${string}`;
const NAV: { id: View; label: string; icon: LucideIcon }[] = [
  { id: "inbox", label: "보관함", icon: Inbox },
  { id: "today", label: "오늘", icon: Sun },
  { id: "upcoming", label: "예정", icon: CalendarDays },
  { id: "all", label: "모든 할 일", icon: Layers },
];
const TITLES: Record<string, string> = {
  today: "오늘",
  upcoming: "예정",
  inbox: "보관함",
  all: "모든 할 일",
  completed: "완료한 할 일",
  trash: "휴지통",
};
const EMPTY: Record<string, string> = {
  today: "오늘 할 일을 모두 마쳤어요.",
  upcoming: "예정된 할 일이 없어요.",
  inbox: "떠오르는 할 일을 적어두세요.",
  all: "첫 할 일을 추가해보세요.",
  completed: "완료한 할 일이 여기에 모여요.",
  trash: "휴지통이 비어 있어요.",
};
type Toast = { text: string; error?: boolean; undo?: () => Promise<void> };
export default function TodoApp() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [rootError, setRootError] = useState("");
  const [view, setView] = useState<View>("today");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("default");
  const [menuOpen, setMenuOpen] = useState(false);
  const [editor, setEditor] = useState<Task | null | undefined>();
  const [projectEditor, setProjectEditor] = useState<
    Project | null | undefined
  >();
  const [settings, setSettings] = useState(false);
  const [signup, setSignup] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const userId = workspace?.user.id;
  const load = useCallback(async () => {
    const response = await fetch("/api/workspace", { cache: "no-store" });
    if (response.status === 401) {
      setWorkspace(null);
      setRootError("");
      return;
    }
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || "목록을 불러오지 못했습니다.");
    setWorkspace(data);
    setRootError("");
  }, []);
  useEffect(() => {
    load()
      .catch((e) => setRootError(e.message))
      .finally(() => setLoading(false));
  }, [load]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.error ? 10000 : 6500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    function shortcuts(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (
        (e.target as HTMLElement).closest(
          'input,textarea,select,[role="dialog"]',
        ) ||
        editor !== undefined ||
        settings ||
        signup ||
        projectEditor !== undefined
      )
        return;
      if (e.key === "n" && workspace) {
        e.preventDefault();
        setEditor(null);
      }
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", shortcuts);
    return () => window.removeEventListener("keydown", shortcuts);
  }, [workspace, editor, settings, signup, projectEditor]);
  useEffect(() => {
    if (!userId) return;
    const sync = () => {
      if (document.visibilityState === "visible") load().catch(() => {});
    };
    const interval = setInterval(sync, 60000);
    document.addEventListener("visibilitychange", sync);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [userId, load]);
  async function changeTask(task: Task, action: string, announce = true) {
    setBusyId(task.id);
    try {
      await api(`/api/tasks/${task.id}`, "PATCH", { action });
      await load();
      if (announce) {
        const messages: Record<string, string> = {
          complete: "완료했어요.",
          reopen: "완료를 취소했어요.",
          trash: "휴지통으로 옮겼어요.",
          restore: "복원했어요.",
        };
        const opposite: Record<string, string> = {
          complete: "reopen",
          trash: "restore",
        };
        setToast({
          text: messages[action],
          undo: opposite[action]
            ? () => changeTask(task, opposite[action], false)
            : undefined,
        });
      }
    } catch (e) {
      setToast({ text: (e as Error).message, error: true });
      throw e;
    } finally {
      setBusyId("");
    }
  }
  function navigate(next: View) {
    setView(next);
    setQuery("");
    setMenuOpen(false);
    setShowDone(false);
  }
  if (loading)
    return (
      <main className="loading-screen">
        <Brand />
        <Loader2 size={20} className="spin" aria-label="목록 불러오는 중" />
      </main>
    );
  if (rootError && !workspace)
    return (
      <main className="standalone">
        <Brand />
        <p role="alert">{rootError}</p>
        <button
          className="button primary"
          onClick={() => {
            setLoading(true);
            load()
              .catch((e) => setRootError(e.message))
              .finally(() => setLoading(false));
          }}
        >
          다시 시도
        </button>
      </main>
    );
  if (!workspace) return <AuthScreen onSuccess={load} />;
  const { tasks, projects, user, today } = workspace;
  const active = tasks.filter((t) => !t.completed_at && !t.deleted_at);
  const projectId = view.startsWith("project:") ? view.slice(8) : null;
  const currentProject = projects.find((p) => p.id === projectId);
  const title = query ? "검색 결과" : currentProject?.name || TITLES[view];
  function matchesView(t: Task, completed = false) {
    if (query)
      return (
        !t.deleted_at &&
        `${t.title} ${t.notes} ${t.checklist.map((i) => i.title).join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase())
      );
    if (view === "trash") return Boolean(t.deleted_at);
    if (t.deleted_at) return false;
    if (view === "completed") return Boolean(t.completed_at);
    if (completed !== Boolean(t.completed_at)) return false;
    if (projectId) return t.project_id === projectId;
    if (view === "today") return Boolean(t.due_date && t.due_date <= today);
    if (view === "upcoming") return Boolean(t.due_date && t.due_date > today);
    if (view === "inbox") return !t.project_id;
    return true;
  }
  const ordered = (values: Task[]) =>
    [...values].sort((a, b) => {
      if (view === "completed")
        return (b.completed_at || "").localeCompare(a.completed_at || "");
      if (view === "trash")
        return (b.deleted_at || "").localeCompare(a.deleted_at || "");
      if (sort === "priority")
        return (
          (a.priority || 4) - (b.priority || 4) ||
          a.created_at.localeCompare(b.created_at)
        );
      if (sort === "name") return a.title.localeCompare(b.title, "ko");
      if (sort === "newest") return b.created_at.localeCompare(a.created_at);
      if (sort === "date" || view === "upcoming")
        return (
          (a.due_date || "9999").localeCompare(b.due_date || "9999") ||
          a.created_at.localeCompare(b.created_at)
        );
      return a.created_at.localeCompare(b.created_at);
    });
  const visible = ordered(tasks.filter((t) => matchesView(t)));
  const completed = query
    ? []
    : tasks.filter(
        (t) =>
          !t.deleted_at &&
          t.completed_at &&
          (query
            ? `${t.title} ${t.notes}`
                .toLowerCase()
                .includes(query.toLowerCase())
            : matchesView(t, true)),
      );
  const overdue = visible.filter((t) => t.due_date && t.due_date < today);
  const groups: { name: string; tasks: Task[] }[] =
    view === "today" && !query
      ? [
          ...(overdue.length
            ? [{ name: "기한이 지난 할 일", tasks: overdue }]
            : []),
          {
            name: "오늘 할 일",
            tasks: visible.filter((t) => !t.due_date || t.due_date >= today),
          },
        ]
      : view === "upcoming" && !query
        ? Array.from(new Set(visible.map((t) => t.due_date))).map((date) => ({
            name: prettyDate(date!, today),
            tasks: visible.filter((t) => t.due_date === date),
          }))
        : [{ name: "", tasks: visible }];
  const todayAll = tasks.filter((t) => !t.deleted_at && t.due_date === today);
  const todayCompleted = todayAll.filter((t) => t.completed_at).length;
  const counts: Record<string, number> = {
    today: active.filter((t) => t.due_date && t.due_date <= today).length,
    upcoming: active.filter((t) => t.due_date && t.due_date > today).length,
    inbox: active.filter((t) => !t.project_id).length,
    all: active.length,
    completed: tasks.filter((t) => t.completed_at && !t.deleted_at).length,
    trash: tasks.filter((t) => t.deleted_at).length,
  };
  const defaultDate =
    view === "today" ? today : view === "upcoming" ? addDays(today, 1) : null;
  const row = (task: Task) => (
    <div
      className={`task-row ${task.completed_at ? "is-complete" : ""}`}
      key={task.id}
    >
      {view === "trash" ? (
        <button
          className="task-check restore"
          aria-label={`${task.title} 복원`}
          disabled={busyId === task.id}
          onClick={() => {
            void changeTask(task, "restore").catch(() => {});
          }}
        >
          <Undo2 size={16} />
        </button>
      ) : (
        <button
          className={`task-check priority-${task.priority}`}
          role="checkbox"
          aria-checked={Boolean(task.completed_at)}
          aria-label={`${task.title} ${task.completed_at ? "완료 취소" : "완료"}`}
          disabled={busyId === task.id}
          onClick={() => {
            void changeTask(
              task,
              task.completed_at ? "reopen" : "complete",
            ).catch(() => {});
          }}
        >
          {busyId === task.id ? (
            <Loader2 size={12} className="spin" />
          ) : task.completed_at ? (
            <Check size={12} />
          ) : null}
        </button>
      )}
      <button
        className="task-main"
        disabled={view === "trash"}
        onClick={() => setEditor(task)}
      >
        <span className="task-title">{task.title}</span>
        {task.notes && (
          <span className="task-notes">{task.notes.split("\n")[0]}</span>
        )}
        <span className="task-meta">
          {task.due_date && (
            <span
              className={
                task.due_date < today && !task.completed_at ? "late" : ""
              }
            >
              <CalendarDays size={12} />
              {prettyDate(task.due_date, today)}
            </span>
          )}
          {task.recurrence !== "none" && (
            <Repeat2 size={12} aria-label="반복" />
          )}
          {task.checklist.length > 0 && (
            <span>
              <ListChecks size={12} />
              {task.checklist.filter((i) => i.done).length}/
              {task.checklist.length}
            </span>
          )}
          {task.priority > 0 && (
            <span className={`priority-label priority-${task.priority}`}>
              <Flag size={11} />
              {PRIORITIES[task.priority]}
            </span>
          )}
        </span>
      </button>
      <div className="task-end">
        {task.project_id && (
          <span className="project-tag">
            <span
              className={`color-dot ${projects.find((p) => p.id === task.project_id)?.color || "gray"}`}
            />
            {projects.find((p) => p.id === task.project_id)?.name}
          </span>
        )}
        {view !== "trash" && (
          <button
            className="icon-button row-menu"
            aria-label={`${task.title} 편집`}
            onClick={() => setEditor(task)}
          >
            <MoreHorizontal size={17} />
          </button>
        )}
      </div>
    </div>
  );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        목록으로 건너뛰기
      </a>
      {menuOpen && (
        <button
          className="mobile-scrim"
          onClick={() => setMenuOpen(false)}
          aria-label="메뉴 닫기"
        />
      )}
      <aside
        className={`sidebar ${menuOpen ? "open" : ""}`}
        aria-label="목록 탐색"
      >
        <div className="sidebar-top">
          <Brand />
          <button
            className="icon-button mobile-only"
            onClick={() => setMenuOpen(false)}
            aria-label="메뉴 닫기"
          >
            <X size={18} />
          </button>
        </div>
        <button
          className="new-task"
          onClick={() => {
            setEditor(null);
            setMenuOpen(false);
          }}
        >
          <span className="new-task-icon">
            <Plus size={16} />
          </span>
          할 일 추가<kbd>N</kbd>
        </button>
        <nav className="main-nav">
          {NAV.map((n) => (
            <button
              key={n.id}
              className={`nav-item ${view === n.id && !query ? "selected" : ""}`}
              onClick={() => navigate(n.id)}
            >
              <n.icon size={18} />
              <span>{n.label}</span>
              <span className="nav-count">{counts[n.id] || ""}</span>
            </button>
          ))}
        </nav>
        <div className="projects-label">
          <span>프로젝트</span>
          <button
            className="icon-button"
            aria-label="프로젝트 추가"
            onClick={() => setProjectEditor(null)}
          >
            <Plus size={16} />
          </button>
        </div>
        <nav className="project-nav">
          {projects
            .filter((p) => !p.archived_at)
            .map((p) => (
              <button
                className={`nav-item ${projectId === p.id && !query ? "selected" : ""}`}
                key={p.id}
                onClick={() => navigate(`project:${p.id}`)}
              >
                <Hash size={17} className={`color-text ${p.color}`} />
                <span>{p.name}</span>
                <span className="nav-count">
                  {active.filter((t) => t.project_id === p.id).length || ""}
                </span>
              </button>
            ))}
          {!projects.filter((p) => !p.archived_at).length && (
            <button
              className="empty-project"
              onClick={() => setProjectEditor(null)}
            >
              프로젝트 만들기
            </button>
          )}
        </nav>
        <div className="secondary-nav">
          <button
            className={`nav-item ${view === "completed" ? "selected" : ""}`}
            onClick={() => navigate("completed")}
          >
            <CheckCheck size={18} />
            <span>완료한 할 일</span>
            <span className="nav-count">{counts.completed || ""}</span>
          </button>
          <button
            className={`nav-item ${view === "trash" ? "selected" : ""}`}
            onClick={() => navigate("trash")}
          >
            <Trash2 size={17} />
            <span>휴지통</span>
            <span className="nav-count">{counts.trash || ""}</span>
          </button>
        </div>
        <div className="sidebar-bottom">
          <Dropdown.Root>
            <Dropdown.Trigger className="account-button">
              <span className="avatar">{user.name.slice(0, 1)}</span>
              <span className="account-name">
                {user.name}
                {user.is_guest && <small>체험 중</small>}
              </span>
              <ChevronDown size={15} />
            </Dropdown.Trigger>
            <Dropdown.Portal>
              <Dropdown.Content
                className="dropdown"
                side="top"
                align="start"
                sideOffset={8}
              >
                <Dropdown.Item
                  className="dropdown-item"
                  onSelect={() => setSettings(true)}
                >
                  <Settings size={16} />
                  설정
                </Dropdown.Item>
                {user.is_guest && (
                  <Dropdown.Item
                    className="dropdown-item"
                    onSelect={() => setSignup(true)}
                  >
                    <Plus size={16} />
                    계정 만들기
                  </Dropdown.Item>
                )}
                <Dropdown.Separator className="dropdown-separator" />
                <Dropdown.Item
                  className="dropdown-item"
                  onSelect={async () => {
                    try {
                      await api("/api/auth/logout", "POST", {});
                      setWorkspace(null);
                      setEditor(undefined);
                      setQuery("");
                    } catch (e) {
                      setToast({ text: (e as Error).message, error: true });
                    }
                  }}
                >
                  <LogOut size={16} />
                  로그아웃
                </Dropdown.Item>
              </Dropdown.Content>
            </Dropdown.Portal>
          </Dropdown.Root>
        </div>
      </aside>
      <div className="workspace">
        <header className="workspace-header">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-only"
              aria-label="메뉴 열기"
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={20} />
            </button>
            <span>내 작업 공간</span>
            <ChevronRight size={13} />
            <span>{currentProject?.name || TITLES[view]}</span>
          </div>
          <div className="search-box">
            <Search size={16} />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="검색"
              aria-label="할 일 검색"
            />
            {query ? (
              <button
                className="icon-button"
                aria-label="검색 지우기"
                onClick={() => setQuery("")}
              >
                <X size={14} />
              </button>
            ) : (
              <kbd>⌘ K</kbd>
            )}
          </div>
        </header>
        {user.is_guest && (
          <div className="demo-banner">
            <span>체험 중</span>
            <button onClick={() => setSignup(true)}>
              계정 만들기
              <ArrowUpDown className="signup-arrow" size={12} />
            </button>
          </div>
        )}
        <main id="main" className="task-space">
          <div className="page-heading">
            <div>
              <span className="page-date">
                {new Intl.DateTimeFormat("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  weekday: "long",
                  timeZone: "UTC",
                }).format(new Date(`${today}T12:00:00Z`))}
              </span>
              <h1>
                {view === "today" && !query && <Sun size={29} />} {title}
              </h1>
              <p className="page-subtitle">
                {query
                  ? `${visible.length}개의 할 일`
                  : view === "today"
                    ? counts.today
                      ? `${counts.today}개의 할 일이 남아 있어요.`
                      : "차분하게 하루를 시작해요."
                    : view === "trash"
                      ? "삭제한 할 일을 복원할 수 있어요."
                      : `${visible.length}개의 할 일`}
              </p>
            </div>
            <div className="heading-actions">
              {view === "today" && !query && todayAll.length > 0 && (
                <div className="daily-progress">
                  <span>
                    <strong>{todayCompleted}</strong> / {todayAll.length} 완료
                  </span>
                  <div className="progress-track">
                    <span
                      style={{
                        width: `${(todayCompleted / todayAll.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}
              {currentProject && (
                <button
                  className="icon-button"
                  aria-label="프로젝트 편집"
                  onClick={() => setProjectEditor(currentProject)}
                >
                  <MoreHorizontal size={20} />
                </button>
              )}
            </div>
          </div>
          <div className="list-toolbar">
            <span>
              {query
                ? "전체 목록에서 검색"
                : view === "completed"
                  ? "완료 기록"
                  : view === "trash"
                    ? "삭제한 할 일"
                    : "할 일 목록"}
            </span>
            <label className="sort-control">
              <ArrowUpDown size={13} />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                aria-label="할 일 정렬"
              >
                <option value="default">기본 순서</option>
                <option value="date">기한순</option>
                <option value="priority">우선순위순</option>
                <option value="newest">최근 추가순</option>
                <option value="name">이름순</option>
              </select>
            </label>
          </div>
          {groups.map((g, i) => (
            <section className="task-group" key={g.name || i}>
              {g.name && (
                <h2 className={g.name === "기한이 지난 할 일" ? "late" : ""}>
                  {g.name}
                  <span>{g.tasks.length}</span>
                </h2>
              )}
              {g.tasks.map(row)}
            </section>
          ))}
          {!visible.length && (
            <div className="empty-state">
              {view === "completed" ? (
                <CheckCheck size={30} />
              ) : view === "trash" ? (
                <Trash2 size={30} />
              ) : view === "today" ? (
                <Sun size={32} />
              ) : (
                <Inbox size={30} />
              )}
              <p>
                {query
                  ? "검색 결과가 없어요."
                  : EMPTY[view] || "프로젝트에 할 일을 추가해보세요."}
              </p>
              {query && (
                <button className="button quiet" onClick={() => setQuery("")}>
                  검색 지우기
                </button>
              )}
            </div>
          )}
          {!["trash", "completed"].includes(view) && (
            <>
              <button className="add-task-row" onClick={() => setEditor(null)}>
                <Plus size={18} />할 일 추가
              </button>
              {completed.length > 0 && (
                <div className="completed-section">
                  <button
                    className="completed-toggle"
                    onClick={() => setShowDone(!showDone)}
                    aria-expanded={showDone}
                  >
                    {showDone ? (
                      <ChevronDown size={15} />
                    ) : (
                      <ChevronRight size={15} />
                    )}
                    완료한 할 일<span>{completed.length}</span>
                  </button>
                  {showDone && ordered(completed).map(row)}
                </div>
              )}
            </>
          )}
          <footer className="workspace-footer">
            <span />
            <span>
              <kbd>N</kbd> 새 할 일
            </span>
          </footer>
        </main>
      </div>
      {editor !== undefined && (
        <TaskEditor
          key={editor?.id || "new"}
          task={editor}
          projects={projects.filter(
            (p) => !p.archived_at || p.id === editor?.project_id,
          )}
          defaultDate={defaultDate}
          defaultProject={projectId}
          onClose={() => setEditor(undefined)}
          onSaved={async () => {
            await load();
            setToast({ text: "저장했어요." });
          }}
          onTrash={async (task) => {
            await changeTask(task, "trash");
          }}
        />
      )}
      {projectEditor !== undefined && (
        <ProjectForm
          project={projectEditor}
          onClose={() => setProjectEditor(undefined)}
          onArchive={async () => {
            if (!projectEditor) return;
            await api(`/api/projects/${projectEditor.id}`, "PATCH", {
              action: "archive",
            });
            await load();
            setProjectEditor(undefined);
            setView("all");
            setToast({ text: "프로젝트를 보관했어요." });
          }}
          onSave={async (id) => {
            await load();
            setView(`project:${id}`);
            setProjectEditor(undefined);
            setToast({ text: "프로젝트를 저장했어요." });
          }}
        />
      )}
      {settings && (
        <SettingsForm
          workspace={workspace}
          onClose={() => setSettings(false)}
          onSave={async () => {
            await load();
            setSettings(false);
            setToast({ text: "설정을 저장했어요." });
          }}
        />
      )}
      <Modal
        open={signup}
        onOpenChange={setSignup}
        title="계정 만들기"
        description="체험 중에 작성한 할 일도 함께 저장돼요."
      >
        <AuthScreen
          compact
          onSuccess={async () => {
            await load();
            setSignup(false);
          }}
        />
      </Modal>
      {toast && (
        <div
          className={`toast ${toast.error ? "error" : ""}`}
          role={toast.error ? "alert" : "status"}
        >
          <span>{toast.text}</span>
          {toast.undo && (
            <button
              onClick={() => {
                const undo = toast.undo;
                setToast(null);
                void undo?.().catch(() => {});
              }}
            >
              되돌리기
            </button>
          )}
          <button
            className="icon-button"
            aria-label="알림 닫기"
            onClick={() => setToast(null)}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
function ProjectForm({
  project,
  onClose,
  onSave,
  onArchive,
}: {
  project: Project | null;
  onClose: () => void;
  onSave: (id: string) => Promise<void>;
  onArchive: () => Promise<void>;
}) {
  const [name, setName] = useState(project?.name || "");
  const [color, setColor] = useState(project?.color || "orange");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
      title={project ? "프로젝트 편집" : "새 프로젝트"}
    >
      <form
        className="simple-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const data = await api(
              project ? `/api/projects/${project.id}` : "/api/projects",
              project ? "PATCH" : "POST",
              { name, color },
            );
            await onSave(project?.id || data.id);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="이름">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={60}
            placeholder="프로젝트 이름"
          />
        </Field>
        <fieldset className="color-picker">
          <legend>색상</legend>
          {COLORS.map((c, i) => (
            <label
              key={c}
              className={`color-option ${c} ${color === c ? "selected" : ""}`}
            >
              <input
                type="radio"
                name="color"
                checked={color === c}
                onChange={() => setColor(c)}
                aria-label={["주황", "파랑", "초록", "보라", "회색"][i]}
              />
              {color === c && <Check size={14} />}
            </label>
          ))}
        </fieldset>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="form-actions">
          {project && (
            <button
              type="button"
              className="button quiet"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onArchive();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              보관하기
            </button>
          )}
          <button
            type="button"
            className="button secondary"
            onClick={onClose}
            disabled={busy}
          >
            취소
          </button>
          <button className="button primary" disabled={busy || !name.trim()}>
            {busy ? <Loader2 size={16} className="spin" /> : "저장"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function SettingsForm({
  workspace,
  onClose,
  onSave,
}: {
  workspace: Workspace;
  onClose: () => void;
  onSave: () => Promise<void>;
}) {
  const [name, setName] = useState(workspace.user.name);
  const [timezone, setTimezone] = useState(workspace.user.timezone);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function download() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            exported_at: new Date().toISOString(),
            tasks: workspace.tasks,
            projects: workspace.projects,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `odal-${workspace.today}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  }
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
      title="설정"
    >
      <form
        className="simple-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await api("/api/settings", "PATCH", { name, timezone });
            await onSave();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="이름">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={50}
          />
        </Field>
        <Field label="시간대">
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          >
            {[
              "Asia/Seoul",
              "Asia/Tokyo",
              "America/New_York",
              "America/Los_Angeles",
              "Europe/London",
              "UTC",
            ].map((t) => (
              <option key={t} value={t}>
                {t === "Asia/Seoul"
                  ? "서울"
                  : t === "Asia/Tokyo"
                    ? "도쿄"
                    : t === "UTC"
                      ? "UTC"
                      : t === "Europe/London"
                        ? "런던"
                        : t === "America/New_York"
                          ? "뉴욕"
                          : "로스앤젤레스"}
              </option>
            ))}
          </select>
        </Field>
        {workspace.user.email && (
          <Field label="이메일">
            <input value={workspace.user.email} disabled />
          </Field>
        )}
        {workspace.projects.some((p) => p.archived_at) && (
          <section className="archive-list">
            <h3>보관한 프로젝트</h3>
            {workspace.projects
              .filter((p) => p.archived_at)
              .map((p) => (
                <div className="archive-row" key={p.id}>
                  <span>{p.name}</span>
                  <button
                    type="button"
                    className="button quiet"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await api(`/api/projects/${p.id}`, "PATCH", {
                          action: "restore",
                        });
                        await onSave();
                      } catch (e) {
                        setError((e as Error).message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    복원
                  </button>
                </div>
              ))}
          </section>
        )}
        <div className="settings-export">
          <span>내 데이터</span>
          <button type="button" className="button secondary" onClick={download}>
            <Download size={15} />
            JSON 내보내기
          </button>
        </div>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button
            type="button"
            className="button secondary"
            onClick={onClose}
            disabled={busy}
          >
            취소
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? <Loader2 size={16} className="spin" /> : "저장"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
