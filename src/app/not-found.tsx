import Link from "next/link";
export default function NotFound() {
  return (
    <main className="standalone">
      <h1>페이지를 찾을 수 없어요</h1>
      <Link href="/">할 일로 돌아가기</Link>
    </main>
  );
}
