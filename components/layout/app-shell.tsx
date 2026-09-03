"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Shirt, Sparkles, UserRound } from "lucide-react";
import { useState } from "react";
import { LoginModal } from "@/components/modals/login-modal";
import { useAuth } from "@/components/auth/auth-context";
import { AccountModal } from "@/components/modals/account-modal";

const navigation = [
  { href: "/try", label: "试衣", icon: Sparkles },
  { href: "/wardrobe", label: "衣橱", icon: Shirt },
  { href: "/calendar", label: "日历", icon: CalendarDays },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" href="/try">
          <span className="brand-mark"><Sparkles size={17} /></span>
          <span>fitcheck</span>
        </Link>
        <div className="top-actions">
          {user ? <button className="profile-btn" onClick={() => setAccountOpen(true)}><UserRound size={17} /><span>{user.email}</span></button> : <button className="profile-btn" onClick={() => setLoginOpen(true)}><UserRound size={17} /><span>登录</span></button>}
        </div>
      </header>
      <div className="body">
        <aside className="sidebar">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link key={href} className={`nav-item ${pathname === href ? "active" : ""}`} href={href}>
              <Icon size={18} /><span>{label}</span>
            </Link>
          ))}
        </aside>
        <main className="main-content">{children}</main>
      </div>
      {loginOpen && <LoginModal close={() => setLoginOpen(false)} />}
      {accountOpen && <AccountModal close={() => setAccountOpen(false)} />}
    </div>
  );
}
