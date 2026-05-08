import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "드래프트 메모리 코치",
  description: "BGA Arena 아그리콜라 드래프트 추천과 복기 도구"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
