import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource/noto-sans-kr/400.css";
import "@fontsource/noto-sans-kr/500.css";
import "@fontsource/noto-sans-kr/600.css";
import "@fontsource/noto-sans-kr/700.css";
import "./globals.css";
export const metadata: Metadata = {
  title: "ODAL | 할 일",
  description: "오늘 할 일을 정리하는 작은 작업 공간.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
