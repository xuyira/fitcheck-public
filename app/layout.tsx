import type { Metadata } from "next";
import "@/src/styles.css";
import { AppShell } from "@/components/layout/app-shell";
import { AuthProvider } from "@/components/auth/auth-context";

export const metadata: Metadata = {
  title: "FitCheck",
  description: "AI 虚拟试衣、衣橱与穿搭日历",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <AuthProvider><AppShell>{children}</AppShell></AuthProvider>
      </body>
    </html>
  );
}
