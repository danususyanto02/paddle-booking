"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";

export type CustomSelectOption = { value: string; label: string; desc?: string; disabled?: boolean; icon?: string };

type Props = {
  value: string;
  onChange: (v: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  icon?: string;
  disabled?: boolean;
  searchable?: boolean;
  clearable?: boolean;
};

export default function CustomSelect({ value, onChange, options, placeholder="Select", icon, disabled, searchable=false, clearable=false }: Props) {
  const [open,setOpen]=useState(false);
  const [q,setQ]=useState("");
  const btnRef=useRef<HTMLButtonElement>(null);
  const popRef=useRef<HTMLDivElement>(null);
  const inputRef=useRef<HTMLInputElement>(null);
  const [focusIdx,setFocusIdx]=useState(0);

  const filtered = useMemo(()=>{
    if(!searchable || !q.trim()) return options;
    const s=q.toLowerCase().trim();
    return options.filter(o=> o.label.toLowerCase().includes(s) || o.value.toLowerCase().includes(s));
  },[options,q,searchable]);

  const selected = options.find(o=>o.value===value) ?? null;

  useEffect(()=>{ if(open && searchable) setTimeout(()=>inputRef.current?.focus(), 30); },[open,searchable]);
  useEffect(()=>{ setFocusIdx(0); },[q,open]);
  useEffect(()=>{
    if(!open) return;
    const onDown=(e:MouseEvent)=>{ const t=e.target as Node; if(popRef.current?.contains(t) || btnRef.current?.contains(t)) return; setOpen(false); };
    const onKey=(e:KeyboardEvent)=>{ if(e.key==="Escape") setOpen(false); };
    document.addEventListener("mousedown",onDown); document.addEventListener("keydown",onKey);
    return()=>{ document.removeEventListener("mousedown",onDown); document.removeEventListener("keydown",onKey); };
  },[open]);

  const handleKey=(e:React.KeyboardEvent)=>{
    if(e.key==="ArrowDown"){ e.preventDefault(); if(!open)setOpen(true); else setFocusIdx(i=> Math.min(i+1, filtered.length-1)); }
    else if(e.key==="ArrowUp"){ e.preventDefault(); setFocusIdx(i=> Math.max(i-1,0)); }
    else if(e.key==="Enter"){ if(open && filtered[focusIdx]){ onChange(filtered[focusIdx].value); setOpen(false); setQ(""); }}
    else if(e.key==="Escape") setOpen(false);
  };

  const portal = open && typeof document!=="undefined" ? createPortal(
    <div ref={popRef} role="listbox" tabIndex={-1}
      className="fixed z-[70] bg-white border border-outline-variant/15 rounded-2xl shadow-[0_20px_60px_-16px_rgba(0,0,0,0.2),0_8px_24px_-8px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col"
      style={btnRef.current ? (()=>{ const r=btnRef.current!.getBoundingClientRect(); const w=r.width; const ideal=Math.max(w, 300); const width=Math.min(ideal, window.innerWidth-24); let left=r.left; if(left+width > window.innerWidth-12) left=window.innerWidth-width-12; if(left<12) left=12; return { top: r.bottom+10, left, width } as const; })() : undefined}
    >
      <style>{`.cs-scroll::-webkit-scrollbar{width:5px;height:0}.cs-scroll::-webkit-scrollbar-thumb{background:#c0c8c3;border-radius:999px}.cs-scroll::-webkit-scrollbar-track{background:transparent}`}</style>

      {searchable && (
        <div className="px-3 pt-3 pb-2 shrink-0">
          <label className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 focus-within:bg-white focus-within:border-primary/25 focus-within:ring-4 focus-within:ring-primary/10 transition-all">
            <span className="material-symbols-outlined text-on-surface-variant/60 text-[18px] shrink-0">search</span>
            <input ref={inputRef} value={q} onChange={e=>setQ(e.target.value)} onKeyDown={handleKey} placeholder="Search venue..." className="flex-1 min-w-0 bg-transparent outline-none text-[13px] font-medium placeholder:text-on-surface-variant/40 placeholder:font-normal text-on-surface" autoComplete="off" />
            {q ? <button type="button" onClick={()=>setQ("")} className="w-6 h-6 grid place-items-center rounded-full bg-surface-container hover:bg-surface-variant text-on-surface-variant shrink-0 transition"><span className="material-symbols-outlined text-[14px]">close</span></button> : null}
          </label>
        </div>
      )}

      <div className={`cs-scroll overflow-y-auto overflow-x-hidden overscroll-contain flex-1 ${searchable ? "px-2 pb-2" : "p-2"}`} style={{ maxHeight: 286, scrollbarWidth: "thin", scrollbarColor: "#c0c8c3 transparent" }}>
        {filtered.length===0 ? (
          <div className="px-4 py-10 text-center">
            <div className="w-10 h-10 mx-auto grid place-items-center rounded-full bg-surface-container text-on-surface-variant/50 mb-2"><span className="material-symbols-outlined text-[20px]">search_off</span></div>
            <p className="text-sm font-medium text-on-surface">No venues found</p>
            <p className="text-xs text-on-surface-variant mt-1">Try another keyword</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {filtered.map((o,idx)=>{
              const active = idx===focusIdx;
              const sel = o.value===value;
              return (
                <button key={o.value} type="button" role="option" aria-selected={sel} disabled={o.disabled} onMouseEnter={()=>setFocusIdx(idx)}
                  onClick={()=>{ if(!o.disabled){ onChange(o.value); setOpen(false); setQ(""); }}}
                  className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-150
                    ${sel ? "bg-primary text-on-primary shadow-sm" : active ? "bg-mint-glace text-primary" : "hover:bg-surface-container-low text-on-surface"}
                    ${o.disabled ? "opacity-40 pointer-events-none":""}`}
                >
                  <span className={`w-8 h-8 rounded-full grid place-items-center shrink-0 transition-colors ${sel ? "bg-white/20 text-white" : active ? "bg-white text-primary shadow-sm" : "bg-surface-container text-on-surface-variant"}`}>
                    <span className="material-symbols-outlined text-[16px]">{o.icon ?? "location_on"}</span>
                  </span>
                  <span className="flex-1 min-w-0 text-left">
                    <span className={`block text-[13.5px] leading-none truncate ${sel ? "font-semibold text-white" : active ? "font-semibold" : "font-medium"}`}>{o.label}</span>
                    {o.desc ? <span className={`block text-[11.5px] truncate mt-1 leading-none ${sel ? "text-white/75" : "text-on-surface-variant"}`}>{o.desc}</span> : null}
                  </span>
                  {sel ? <span className="w-6 h-6 rounded-full bg-white grid place-items-center shrink-0"><span className="material-symbols-outlined text-primary text-[14px] font-bold">check</span></span> : null}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {clearable && value ? (
        <div className="px-3 py-2.5 border-t border-outline-variant/10 bg-surface-container-low/50 shrink-0">
          <button type="button" onClick={()=>{ onChange(""); setOpen(false); setQ(""); }} className="w-full py-2 rounded-full text-xs font-semibold text-on-surface-variant hover:text-primary hover:bg-white border border-transparent hover:border-outline-variant/15 transition flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-[14px]">close</span> Clear selection
          </button>
        </div>
      ) : null}
    </div>, document.body) : null;

  return (
    <>
      <button ref={btnRef} type="button" disabled={disabled} onClick={()=>!disabled && setOpen(v=>!v)} onKeyDown={handleKey} aria-haspopup="listbox" aria-expanded={open}
        className={`w-full flex items-center gap-2.5 text-left group min-w-0 ${disabled ? "opacity-50 pointer-events-none":""}`}
      >
        {icon ? <span className={`material-symbols-outlined text-[19px] shrink-0 transition-colors ${value ? "text-primary" : "text-on-surface-variant/60 group-hover:text-on-surface-variant"}`}>{icon}</span> : null}
        <span className={`flex-1 min-w-0 text-[13.5px] truncate leading-none pt-0.5 ${selected ? "text-on-surface font-medium" : "text-on-surface-variant/55 font-normal"}`}>{selected ? selected.label : placeholder}</span>
        <span className={`material-symbols-outlined text-[18px] shrink-0 transition-all duration-200 ${open ? "rotate-180 text-primary" : "text-on-surface-variant/40 group-hover:text-on-surface-variant/70"}`}>expand_more</span>
      </button>
      {portal}
    </>
  );
}
