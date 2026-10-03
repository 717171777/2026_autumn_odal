"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="standalone">
      <h1>잠시 문제가 생겼어요</h1>
      <button className="button primary" onClick={reset}>
        다시 시도
      </button>
    </main>
  );
}
