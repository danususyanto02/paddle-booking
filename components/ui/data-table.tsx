"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { SkeletonTableRows } from "./skeleton";

export type Column<T> = {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T, index: number) => React.ReactNode;
  className?: string;
};

export type DataTableMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type DataTableProps<T> = {
  data: T[];
  columns: Column<T>[];
  meta: DataTableMeta | null;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSortChange?: (sortBy: string, order: "asc" | "desc") => void;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  onSearch?: (q: string) => void;
  q?: string;
  statusFilter?: "ACTIVE" | "INACTIVE" | "";
  onStatusFilterChange?: (v: "ACTIVE" | "INACTIVE" | "") => void;
  loading?: boolean;
  emptyText?: string;
  rowKey: keyof T | ((row: T) => string);
};

function getRowKey<T>(row: T, rowKey: DataTableProps<T>["rowKey"], index: number): string {
  if (typeof rowKey === "function") return rowKey(row);
  const v = (row as Record<string, unknown>)[rowKey as string];
  return v != null ? String(v) : String(index);
}

export default function DataTable<T>({
  data,
  columns,
  meta,
  sortBy,
  sortOrder = "asc",
  onSortChange,
  onPageChange,
  onLimitChange,
  onSearch,
  q = "",
  statusFilter,
  onStatusFilterChange,
  loading = false,
  emptyText = "No data",
  rowKey,
}: DataTableProps<T>) {
  const [localQ, setLocalQ] = useState(q);

  useEffect(() => setLocalQ(q), [q]);

  // Debounced search ~300ms
  useEffect(() => {
    if (!onSearch) return;
    const t = setTimeout(() => {
      if (localQ !== q) onSearch(localQ);
    }, 300);
    return () => clearTimeout(t);
  }, [localQ, q, onSearch]);

  const handleSort = useCallback(
    (key: string) => {
      if (!onSortChange) return;
      if (sortBy === key) {
        onSortChange(key, sortOrder === "asc" ? "desc" : "asc");
      } else {
        onSortChange(key, "asc");
      }
    },
    [sortBy, sortOrder, onSortChange],
  );

  const ariaSort = useCallback(
    (key: string): "ascending" | "descending" | "none" => {
      if (sortBy !== key) return "none";
      return sortOrder === "asc" ? "ascending" : "descending";
    },
    [sortBy, sortOrder],
  );

  const pageNumbers = useMemo(() => {
    if (!meta) return [];
    const total = meta.totalPages;
    const cur = meta.page;
    const range: number[] = [];
    const start = Math.max(1, cur - 2);
    const end = Math.min(total, cur + 2);
    for (let i = start; i <= end; i++) range.push(i);
    return range;
  }, [meta]);

  return (
    <div className="w-full">
      {/* Toolbar: search + status filter */}
      {(onSearch || onStatusFilterChange) && (
        <div className="flex flex-wrap gap-3 mb-4">
          {onSearch && (
            <input
              value={localQ}
              onChange={(e) => setLocalQ(e.target.value)}
              placeholder="Search..."
              className="flex-1 min-w-[180px] bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label="Search"
            />
          )}
          {onStatusFilterChange && (
            <select
              value={statusFilter ?? ""}
              onChange={(e) => onStatusFilterChange(e.target.value as never)}
              className="border border-outline-variant rounded-lg px-3 py-2 text-sm bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label="Status filter"
            >
              <option value="">All status</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-surface-variant">
        <table className="w-full text-sm">
          <thead className="bg-surface-container text-on-surface-variant text-xs uppercase">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={col.sortable ? ariaSort(col.key) : undefined}
                  className={`px-4 py-3 text-left font-semibold whitespace-nowrap ${col.sortable ? "cursor-pointer select-none hover:text-primary" : ""} ${col.className ?? ""}`}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  onKeyDown={
                    col.sortable
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleSort(col.key);
                          }
                        }
                      : undefined
                  }
                  tabIndex={col.sortable ? 0 : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortBy === col.key && (
                      <span aria-hidden="true" className="text-[10px]">
                        {sortOrder === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-variant/30">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="p-0">
                  <SkeletonTableRows rows={meta?.limit ?? 5} cols={columns.length} />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-3xl opacity-40">inbox</span>
                    <p className="text-sm font-medium">{emptyText}</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr key={getRowKey(row, rowKey, idx)} className="hover:bg-surface-container-low transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 ${col.className ?? ""}`}>
                      {col.render ? col.render(row, idx) : String((row as Record<string, unknown>)[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta && (
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
          <div className="flex items-center gap-2 text-sm text-on-surface-variant">
            <span>
              Page {meta.page} of {meta.totalPages || 1} • {meta.total} total
            </span>
            {onLimitChange && (
              <select
                value={meta.limit}
                onChange={(e) => onLimitChange(Number(e.target.value))}
                className="border border-outline-variant rounded-lg px-2 py-1 text-sm bg-surface-container-lowest"
                aria-label="Rows per page"
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}/page
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              disabled={meta.page <= 1}
              onClick={() => onPageChange?.(meta.page - 1)}
              className="px-3 py-1.5 rounded-lg border border-outline-variant text-sm disabled:opacity-40 hover:bg-surface-container disabled:cursor-not-allowed"
            >
              Prev
            </button>
            {pageNumbers.map((n) => (
              <button
                key={n}
                onClick={() => onPageChange?.(n)}
                aria-current={n === meta.page ? "page" : undefined}
                className={`w-8 h-8 rounded-lg text-sm ${n === meta.page ? "bg-primary text-on-primary" : "border border-outline-variant hover:bg-surface-container"}`}
              >
                {n}
              </button>
            ))}
            <button
              disabled={meta.page >= meta.totalPages}
              onClick={() => onPageChange?.(meta.page + 1)}
              className="px-3 py-1.5 rounded-lg border border-outline-variant text-sm disabled:opacity-40 hover:bg-surface-container disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
