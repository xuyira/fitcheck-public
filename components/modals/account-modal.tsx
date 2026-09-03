"use client";

import { CalendarDays, LogOut, Shirt, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { apiFetch } from "@/lib/client-api";

interface Stats { outfits: number; calendarDays: number }

export function AccountModal({ close }: { close: () => void }) {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { apiFetch<Stats>("/api/account/stats").then(setStats).catch((error) => setError(error.message)); }, []);
  const exit = async () => { await logout(); close(); };
  return <div className="overlay"><div className="account-modal"><button className="icon-close" aria-label="关闭" onClick={close}><X size={19} /></button><div className="account-avatar"><UserRound size={23} /></div><h2>我的账号</h2><p className="account-email">{user?.email}</p><div className="account-stats"><div><Shirt size={19} /><span>衣橱已上传</span><b>{stats ? `${stats.outfits}套穿搭` : "加载中…"}</b></div><div><CalendarDays size={19} /><span>日历已上传</span><b>{stats ? `${stats.calendarDays}天穿搭计划` : "加载中…"}</b></div></div>{error && <p className="form-error">{error}</p>}<button className="account-logout" onClick={() => void exit()}><LogOut size={17} />退出账号</button></div></div>;
}
