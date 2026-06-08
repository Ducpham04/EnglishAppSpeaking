import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "GB Speaking AI — Luyện nói tiếng Anh với AI",
  description: "Nâng cao kỹ năng nói tiếng Anh với AI thông minh. Chọn level CEFR, chọn chủ đề, nói chuyện và nhận phản hồi tức thì. Phù hợp mọi trình độ từ A1 đến C2.",
  keywords: ["học tiếng Anh", "luyện nói tiếng Anh", "AI English speaking", "CEFR", "speaking practice"],
  openGraph: {
    title: "GB Speaking AI — Luyện nói tiếng Anh với AI",
    description: "Nâng cao kỹ năng nói tiếng Anh với AI thông minh.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" data-scroll-behavior="smooth">
      <body className="noise-overlay">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
