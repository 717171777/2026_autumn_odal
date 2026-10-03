"use client";
import { useState } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Modal, Field } from "./primitives";
import { api } from "./auth-screen";
import {
  type Task,
  type Project,
  type Recurrence,
  type ChecklistItem,
  PRIORITIES,
  REPEATS,
} from "@/lib/types";
export default function TaskEditor({
  task,
  projects,
  defaultDate,
  defaultProject,
  onClose,
  onSaved,
  onTrash,
}: {
  task: Task | null;
  projects: Project[];
  defaultDate: string | null;
  defaultProject: string | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onTrash: (task: Task) => Promise<void>;
}) {
  const [title, setTitle] = useState(task?.title || "");
  const [notes, setNotes] = useState(task?.notes || "");
  const [due, setDue] = useState(task?.due_date || defaultDate || "");
  const [project, setProject] = useState(
    task?.project_id || defaultProject || "",
  );
  const [priority, setPriority] = useState(task?.priority || 0);
  const [recurrence, setRecurrence] = useState<Recurrence>(
    task?.recurrence || "none",
  );
  const [list, setList] = useState<ChecklistItem[]>(task?.checklist || []);
  const [item, setItem] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function addItem() {
    if (item.trim() && list.length < 50) {
      setList([
        ...list,
        { id: crypto.randomUUID(), title: item.trim(), done: false },
      ]);
      setItem("");
    }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(
        task ? `/api/tasks/${task.id}` : "/api/tasks",
        task ? "PATCH" : "POST",
        {
          title,
          notes,
          due_date: due || null,
          project_id: project || null,
          priority,
          recurrence,
          checklist: list,
        },
      );
      await onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
      title={task ? "할 일 편집" : "새 할 일"}
      drawer
    >
      <form className="editor-form" onSubmit={save}>
        <textarea
          className="title-input"
          aria-label="할 일 이름"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="무엇을 할까요?"
          required
          maxLength={300}
          rows={2}
        />
        <textarea
          className="notes-input"
          aria-label="메모"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="메모"
          maxLength={10000}
          rows={4}
        />
        <div className="editor-fields">
          <Field label="프로젝트">
            <select
              value={project}
              onChange={(e) => setProject(e.target.value)}
            >
              <option value="">보관함</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="기한">
            <input
              type="date"
              value={due}
              onInput={(e) => {
                setDue(e.currentTarget.value);
                if (!e.currentTarget.value) setRecurrence("none");
              }}
              onChange={(e) => {
                setDue(e.target.value);
                if (!e.target.value) setRecurrence("none");
              }}
              min="1900-01-01"
              max="2200-12-31"
            />
          </Field>
          <Field label="우선순위">
            <select
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
            >
              {PRIORITIES.map((p, i) => (
                <option key={p} value={i}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
          <Field label="반복">
            <select
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as Recurrence)}
              disabled={!due}
            >
              {Object.entries(REPEATS).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <section className="checklist">
          <h3>
            체크리스트{" "}
            <span>
              {list.filter((i) => i.done).length}/{list.length}
            </span>
          </h3>
          {list.map((entry) => (
            <div className="checklist-row" key={entry.id}>
              <input
                type="checkbox"
                checked={entry.done}
                aria-label={`${entry.title} 완료`}
                onChange={(e) =>
                  setList(
                    list.map((i) =>
                      i.id === entry.id ? { ...i, done: e.target.checked } : i,
                    ),
                  )
                }
              />
              <input
                aria-label="체크리스트 항목"
                value={entry.title}
                maxLength={200}
                required
                onChange={(e) =>
                  setList(
                    list.map((i) =>
                      i.id === entry.id ? { ...i, title: e.target.value } : i,
                    ),
                  )
                }
              />
              <button
                type="button"
                className="icon-button"
                aria-label={`${entry.title} 삭제`}
                onClick={() => setList(list.filter((i) => i.id !== entry.id))}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <div className="checklist-add">
            <input
              value={item}
              onChange={(e) => setItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addItem();
                }
              }}
              placeholder="항목 추가"
              aria-label="새 체크리스트 항목"
              maxLength={200}
            />
            <button
              className="icon-button"
              type="button"
              aria-label="체크리스트 추가"
              onClick={addItem}
              disabled={!item.trim() || list.length >= 50}
            >
              <Plus size={17} />
            </button>
          </div>
        </section>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="editor-actions">
          {task && (
            <button
              type="button"
              className="button quiet danger"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onTrash(task);
                  onClose();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Trash2 size={15} />
              휴지통으로
            </button>
          )}
          <span />
          <button
            type="button"
            className="button secondary"
            onClick={onClose}
            disabled={busy}
          >
            취소
          </button>
          <button className="button primary" disabled={busy || !title.trim()}>
            {busy ? <Loader2 size={16} className="spin" /> : "저장"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
