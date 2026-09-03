"use client";

import { CalendarDays, X } from "lucide-react";
import { useState } from "react";

interface DatePickerModalProps {
  close: () => void;
  confirm: (date: string) => void;
}

export function DatePickerModal({ close, confirm }: DatePickerModalProps) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  return <div className="overlay"><div className="date-modal"><button className="icon-close" aria-label="关闭" onClick={close}><X size={19} /></button><CalendarDays size={22} /><h2>选择日期</h2><p>将这套穿搭添加到哪一天？</p><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /><button className="primary-btn" disabled={!date} onClick={() => confirm(date)}>确认添加</button></div></div>;
}
