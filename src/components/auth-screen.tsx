"use client";
import { useState } from "react";
import { ArrowRight, Check, CalendarDays, Flag, Loader2 } from "lucide-react";
import { Brand, Field } from "./primitives";
export async function api(path: string, method = "GET", body?: unknown) {
  const response = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "요청을 처리하지 못했습니다.");
  return data;
}
export default function AuthScreen({
  onSuccess,
  initial = "signup",
  compact = false,
}: {
  onSuccess: () => Promise<void>;
  initial?: "signup" | "login";
  compact?: boolean;
}) {
  const [mode, setMode] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await api(`/api/auth/${mode}`, "POST", {
        email: data.get("email"),
        password: data.get("password"),
        ...(mode === "signup" ? { name: data.get("name") } : {}),
      });
      await onSuccess();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function demo() {
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/demo", "POST", {});
      await onSuccess();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const form = (
    <div className="auth-form">
      <div className="auth-tabs">
        <button
          className={mode === "signup" ? "active" : ""}
          onClick={() => {
            setMode("signup");
            setError("");
          }}
        >
          가입하기
        </button>
        <button
          className={mode === "login" ? "active" : ""}
          onClick={() => {
            setMode("login");
            setError("");
          }}
        >
          로그인
        </button>
      </div>
      <h2>
        {mode === "signup" ? "나만의 목록을 시작해요" : "다시 만나서 반가워요"}
      </h2>
      <form onSubmit={submit}>
        {mode === "signup" && (
          <Field label="이름">
            <input
              name="name"
              autoComplete="name"
              required
              maxLength={50}
              placeholder="이름"
            />
          </Field>
        )}
        <Field label="이메일">
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder="name@example.com"
          />
        </Field>
        <Field label="비밀번호">
          <input
            name="password"
            type="password"
            autoComplete={
              mode === "signup" ? "new-password" : "current-password"
            }
            required
            minLength={10}
            maxLength={128}
            placeholder="10자 이상"
          />
        </Field>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="button primary full" disabled={busy}>
          {busy ? (
            <Loader2 className="spin" size={17} />
          ) : (
            <>
              {mode === "signup" ? "가입하기" : "로그인"}
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>
      {!compact && (
        <button
          className="button secondary full demo-button"
          disabled={busy}
          onClick={demo}
        >
          가입 없이 체험하기
        </button>
      )}
    </div>
  );
  if (compact) return form;
  return (
    <main className="auth-page">
      <header className="auth-top">
        <Brand />
        <span>할 일은 여기서.</span>
      </header>
      <div className="auth-layout">
        <section className="auth-intro">
          <h1>
            머릿속 할 일을
            <br />
            꺼내 놓으세요.
          </h1>
          <p>
            오늘 해야 할 일부터
            <br />
            나중에 하고 싶은 일까지.
          </p>
          <div className="paper-preview" aria-hidden="true">
            <div className="preview-heading">
              <span>오늘</span>
              <span className="muted">10월 3일</span>
            </div>
            <div className="preview-item">
              <span className="preview-circle checked">
                <Check size={12} />
              </span>
              <span className="strike">책상 정리하기</span>
            </div>
            <div className="preview-item">
              <span className="preview-circle urgent" />
              <span>이번 주에 할 일 정리하기</span>
              <Flag size={13} />
            </div>
            <div className="preview-item">
              <span className="preview-circle" />
              <span>책 20페이지 읽기</span>
              <CalendarDays size={14} />
            </div>
            <div className="preview-item">
              <span className="preview-circle" />
              <span>산책하면서 잠깐 쉬기</span>
            </div>
            <div className="preview-foot">하나씩 체크하면 돼요.</div>
          </div>
        </section>
        {form}
      </div>
    </main>
  );
}
