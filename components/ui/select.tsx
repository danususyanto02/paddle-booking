"use client";

import { useState, useEffect, useRef, useMemo, useId, useCallback } from "react";
import { createPortal } from "react-dom";

export type SelectOption = { value: string; label: string; disabled?: boolean };

export type SelectProps = {
  options?: SelectOption[];
  loadOptions?: (input: string) => Promise<SelectOption[]>;
  value?: string | string[] | null;
  multiple?: boolean;
  searchable?: boolean; // default true (select2)
  clearable?: boolean;
  placeholder?: string;
  debounceMs?: number; // default 300 for async
  onChange: (value: string | string[] | null) => void;
  loading?: boolean;
  error?: string;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
};

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export default function Select({
  options = [],
  loadOptions,
  value,
  multiple = false,
  searchable = true,
  clearable = false,
  placeholder = "Select...",
  debounceMs = 300,
  onChange,
  loading: externalLoading = false,
  error,
  disabled = false,
  id,
  "aria-label": ariaLabel,
}: SelectProps) {
  const listboxId = useId();
  const inputId = id ?? `select-${listboxId}`;
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [asyncOptions, setAsyncOptions] = useState<SelectOption[] | null>(null);
  const [asyncLoading, setAsyncLoading] = useState(false);
  const [asyncError, setAsyncError] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const debouncedInput = useDebounced(input, debounceMs);

  // Fetch async options
  useEffect(() => {
    if (!loadOptions || !open) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setAsyncLoading(true);
    setAsyncError(null);
    loadOptions(debouncedInput)
      .then((res) => {
        if (ctrl.signal.aborted) return;
        setAsyncOptions(res);
      })
      .catch(() => {
        if (ctrl.signal.aborted) return;
        setAsyncError("Failed to load");
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setAsyncLoading(false);
      });
    return () => ctrl.abort();
  }, [debouncedInput, loadOptions, open]);

  const baseOptions = useMemo(
    () => (loadOptions ? (asyncOptions ?? []) : options),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loadOptions ? asyncOptions : options, !!loadOptions],
  );

  const filteredOptions = useMemo(() => {
    if (loadOptions) return baseOptions; // server already filtered via loadOptions(input)
    if (!searchable || !input.trim()) return baseOptions;
    const q = input.trim().toLowerCase();
    return baseOptions.filter((o) => o.label.toLowerCase().includes(q));
  }, [baseOptions, input, searchable, loadOptions]);

  const selectedValues: string[] = useMemo(() => {
    if (value == null) return [];
    if (Array.isArray(value)) return value;
    return [value];
  }, [value]);

  const labelFor = useCallback(
    (v: string) => baseOptions.find((o) => o.value === v)?.label ?? v,
    [baseOptions],
  );

  useEffect(() => setFocusedIndex(0), [filteredOptions.length, open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const isLoading = externalLoading || asyncLoading;
  const displayError = error ?? asyncError;

  const selectOption = (opt: SelectOption) => {
    if (opt.disabled) return;
    if (multiple) {
      const next = selectedValues.includes(opt.value)
        ? selectedValues.filter((v) => v !== opt.value)
        : [...selectedValues, opt.value];
      onChange(next);
    } else {
      onChange(opt.value);
      setOpen(false);
      setInput("");
    }
  };

  const clearAll = () => {
    onChange(multiple ? [] : null);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      setFocusedIndex((i) => Math.min(i + 1, Math.max(0, filteredOptions.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (!open) { setOpen(true); return; }
      const opt = filteredOptions[focusedIndex];
      if (opt) { e.preventDefault(); selectOption(opt); }
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Backspace" && multiple && !input && selectedValues.length) {
      onChange(selectedValues.slice(0, -1));
    }
  };

  const portal =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed z-50 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg max-h-60 overflow-auto py-1"
            style={
              containerRef.current
                ? (() => {
                    const r = containerRef.current!.getBoundingClientRect();
                    return { top: r.bottom + 4, left: r.left, width: r.width, maxWidth: "calc(100vw - 16px)" } as const;
                  })()
                : undefined
            }
            role="listbox"
            id={listboxId}
            aria-multiselectable={multiple || undefined}
          >
            {isLoading ? (
              <div className="px-3 py-2 space-y-2" aria-hidden="true">
                <div className="skeleton-line w-full h-4" />
                <div className="skeleton-line w-3/4 h-4" />
              </div>
            ) : displayError ? (
              <div className="px-3 py-2 text-sm text-error">{displayError}</div>
            ) : filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-on-surface-variant">No results</div>
            ) : (
              filteredOptions.map((opt, idx) => (
                <div
                  key={opt.value}
                  role="option"
                  aria-selected={selectedValues.includes(opt.value)}
                  aria-disabled={opt.disabled || undefined}
                  onClick={() => selectOption(opt)}
                  onMouseEnter={() => setFocusedIndex(idx)}
                  className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between ${
                    idx === focusedIndex ? "bg-mint-glace text-primary" : "hover:bg-surface-container"
                  } ${opt.disabled ? "opacity-40 cursor-not-allowed" : ""} ${selectedValues.includes(opt.value) ? "font-semibold" : ""}`}
                >
                  <span>{opt.label}</span>
                  {selectedValues.includes(opt.value) && <span aria-hidden="true">✓</span>}
                </div>
              ))
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-label={ariaLabel}
        className={`flex flex-wrap items-center gap-1 min-h-10 px-2 py-1.5 bg-surface-container-lowest border rounded-lg text-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary ${
          disabled ? "opacity-60 pointer-events-none bg-surface-variant" : "border-outline-variant"
        } ${error || asyncError ? "border-error" : ""}`}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
          if (!open) inputRef.current?.focus();
        }}
      >
        {multiple && selectedValues.length > 0 ? (
          selectedValues.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 bg-primary-container text-on-primary-container px-2 py-0.5 rounded-full text-xs font-medium"
            >
              {labelFor(v)}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(selectedValues.filter((x) => x !== v));
                }}
                className="hover:text-primary ml-0.5"
                aria-label={`Remove ${labelFor(v)}`}
              >
                ×
              </button>
            </span>
          ))
        ) : !multiple && selectedValues[0] ? (
          <span className="flex-1 truncate">{labelFor(selectedValues[0])}</span>
        ) : null}

        <input
          ref={inputRef}
          id={inputId}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => !disabled && setOpen(true)}
          placeholder={selectedValues.length === 0 ? placeholder : undefined}
          disabled={disabled || (!searchable && !loadOptions)}
          className="flex-1 min-w-[60px] bg-transparent outline-none placeholder:text-on-surface-variant/50"
          autoComplete="off"
          aria-autocomplete={searchable ? "list" : "none"}
        />

        {clearable && selectedValues.length > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              clearAll();
            }}
            className="text-on-surface-variant hover:text-primary p-1"
            aria-label="Clear"
          >
            ×
          </button>
        )}
        <span className="text-on-surface-variant pointer-events-none" aria-hidden="true">
          ▾
        </span>
      </div>

      {error && <p className="mt-1 text-xs text-error">{error}</p>}

      {portal}
    </div>
  );
}
