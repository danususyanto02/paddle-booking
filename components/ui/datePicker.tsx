"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";

type Props = {
  value: string; // YYYY-MM-DD or ""
  onChange: (iso: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const WEEKDAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function fmtDisplay(iso: string) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function isoOf(y:number,m:number,d:number){ return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`; }

export default function DatePicker({ value, onChange, placeholder="Select date", disabled }: Props) {
  const [open,setOpen]=useState(false);
  const todayISO = useMemo(()=> new Date().toISOString().slice(0,10),[]);
  const parsed = value ? new Date(value+"T00:00:00") : new Date();
  const initY = Number.isNaN(parsed.getTime()) ? new Date().getFullYear() : parsed.getFullYear();
  const initM = Number.isNaN(parsed.getTime()) ? new Date().getMonth() : parsed.getMonth();
  const [year,setYear]=useState(initY);
  const [month,setMonth]=useState(initM);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{ if(value){ const d=new Date(value+"T00:00:00"); if(!Number.isNaN(d.getTime())){ setYear(d.getFullYear()); setMonth(d.getMonth()); } } },[value]);
  useEffect(()=>{ if(!open) return; const h=(e:MouseEvent)=>{ const t=e.target as Node; if(popRef.current?.contains(t) || btnRef.current?.contains(t)) return; setOpen(false); }; const k=(e:KeyboardEvent)=>{ if(e.key==="Escape") setOpen(false); };
    document.addEventListener("mousedown",h); document.addEventListener("keydown",k); return()=>{ document.removeEventListener("mousedown",h); document.removeEventListener("keydown",k); };
  },[open]);

  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const cells: (number|null)[] = [];
  for(let i=0;i<startDay;i++) cells.push(null);
  for(let d=1; d<=daysInMonth; d++) cells.push(d);

  const prev=()=>{ let y=year,m=month-1; if(m<0){m=11;y--;} setYear(y); setMonth(m); };
  const next=()=>{ let y=year,m=month+1; if(m>11){m=0;y++;} setYear(y); setMonth(m); };

  const portal = open && typeof document!=="undefined" ? createPortal(
    <div ref={popRef} role="dialog" aria-label="Choose date"
      className="fixed z-[70] w-[320px] bg-white border border-outline-variant/15 rounded-2xl shadow-[0_20px_60px_-16px_rgba(0,0,0,0.2),0_8px_24px_-8px_rgba(0,0,0,0.12)] p-4"
      style={btnRef.current ? (()=>{ const r=btnRef.current!.getBoundingClientRect(); const top=r.bottom+10; const w=320; let left=r.left; if(left+w > window.innerWidth-12) left=window.innerWidth-w-12; if(left<12) left=12; return { top, left } as const; })() : undefined}
    >
      <div className="flex items-center justify-between mb-3.5">
        <div className="font-semibold text-[13.5px] tracking-tight text-on-surface">{MONTHS[month]} <span className="font-normal text-on-surface-variant">{year}</span></div>
        <div className="flex gap-1">
          <button type="button" onClick={prev} aria-label="Previous month" className="w-8 h-8 grid place-items-center rounded-full bg-surface-container-low hover:bg-surface-container border border-outline-variant/10 hover:border-outline-variant/20 text-on-surface-variant hover:text-on-surface transition"><span className="material-symbols-outlined text-[18px]">chevron_left</span></button>
          <button type="button" onClick={next} aria-label="Next month" className="w-8 h-8 grid place-items-center rounded-full bg-surface-container-low hover:bg-surface-container border border-outline-variant/10 hover:border-outline-variant/20 text-on-surface-variant hover:text-on-surface transition"><span className="material-symbols-outlined text-[18px]">chevron_right</span></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0 mb-1">
        {WEEKDAYS.map(w=> <div key={w} className="h-7 grid place-items-center text-[10.5px] font-semibold tracking-widest text-on-surface-variant/40">{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1" role="grid">
        {cells.map((v,i)=>{
          if(v===null) return <div key={`e-${i}`} />;
          const iso=isoOf(year,month,v);
          const isPast = iso < todayISO;
          const isToday = iso===todayISO;
          const isSelected = iso===value;
          return (
            <button key={iso} type="button" role="gridcell" aria-selected={isSelected} disabled={isPast}
              onClick={()=>{ if(!isPast){ onChange(iso); setOpen(false); }}}
              className={`h-9 w-9 grid place-items-center rounded-full text-[13px] font-medium transition-all duration-150
                ${isSelected ? "bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]" : ""}
                ${!isSelected && isToday ? "ring-1 ring-primary text-primary bg-mint-glace font-semibold" : ""}
                ${!isSelected && !isToday && !isPast ? "hover:bg-mint-glace hover:text-primary text-on-surface" : ""}
                ${isPast ? "text-outline-variant/35 cursor-not-allowed font-normal" : "cursor-pointer"}`}
            >{v}</button>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-outline-variant/10">
        <button type="button" onClick={()=>{ onChange(""); setOpen(false); }} className="inline-flex items-center gap-1 text-xs font-semibold text-on-surface-variant hover:text-primary px-3 py-1.5 rounded-full hover:bg-surface-container-low transition"><span className="material-symbols-outlined text-[14px]">close</span> Clear</button>
        <button type="button" onClick={()=>{ onChange(todayISO); setOpen(false); }} className="text-xs font-semibold bg-primary text-white px-4 py-2 rounded-full hover:opacity-90 shadow-sm shadow-primary/20 transition">Today</button>
      </div>
    </div>, document.body) : null;

  return (
    <>
      <button ref={btnRef} type="button" disabled={disabled}
        onClick={()=>!disabled && setOpen(v=>!v)}
        aria-haspopup="dialog" aria-expanded={open}
        className={`w-full flex items-center gap-2.5 text-left group min-w-0 ${disabled ? "opacity-50 pointer-events-none":""}`}
      >
        <span className={`material-symbols-outlined text-[19px] shrink-0 transition-colors ${value ? "text-primary" : "text-on-surface-variant/60 group-hover:text-on-surface-variant"}`}>calendar_today</span>
        <span className={`flex-1 min-w-0 text-[13.5px] truncate leading-none pt-0.5 ${value ? "text-on-surface font-medium" : "text-on-surface-variant/55 font-normal"}`}>{value ? fmtDisplay(value) : placeholder}</span>
        {value ? (
          <span onClick={(e)=>{ e.stopPropagation(); onChange(""); }} role="button" tabIndex={0} onKeyDown={(e)=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); onChange(""); }}} aria-label="Clear date" className="w-6 h-6 grid place-items-center rounded-full hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface shrink-0 transition"><span className="material-symbols-outlined text-[14px]">close</span></span>
        ) : (
          <span className={`material-symbols-outlined text-[18px] shrink-0 transition-all duration-200 ${open ? "rotate-180 text-primary" : "text-on-surface-variant/40 group-hover:text-on-surface-variant/70"}`}>expand_more</span>
        )}
      </button>
      {portal}
    </>
  );
}
