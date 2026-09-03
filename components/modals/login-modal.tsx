"use client";

import { LogIn, Sparkles, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { apiFetch } from "@/lib/client-api";

export function LoginModal({ close, onSuccess }: { close: () => void; onSuccess?: () => void }) {
  const { refresh } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSubmitting(true); setError("");
    try { await apiFetch(`/api/auth/${mode}`, { method: "POST", body: JSON.stringify({ email, password }) }); await refresh(); onSuccess?.(); close(); }
    catch (error) { setError(error instanceof Error ? error.message : "操作失败"); }
    finally { setSubmitting(false); }
  };
  return (
    <div className="overlay">
      <form className="login-modal" onSubmit={submit}>
        <button type="button" className="icon-close" aria-label="关闭" onClick={close}><X size={19} /></button>
        <div className="login-mark"><Sparkles size={19} /></div>
        <h2>保存你的穿搭</h2>
        <div className="auth-tabs"><button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>登录</button><button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>注册</button></div>
        <label>邮箱地址<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></label>
        <label>密码<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="至少8个字符" minLength={8} required /></label>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-btn login-btn" disabled={submitting}><LogIn size={17} />{submitting ? "请稍候…" : mode === "login" ? "登录" : "创建账号"}</button>
      </form>
    </div>
  );
}
