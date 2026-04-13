"use client";

import { useState, useMemo } from "react";

export type Column<T> = {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  className?: string;
  render?: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number | Date;
};

type SortDir = "asc" | "desc";

interface SortableTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className="inline-flex flex-col ml-1.5 gap-[2px] align-middle">
      <span className={`block w-0 h-0 border-l-[4px] border-r-[4px] border-b-[5px] border-l-transparent border-r-transparent ${active && dir === "asc" ? "border-b-amber-600" : "border-b-stone-300"}`} />
      <span className={`block w-0 h-0 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent ${active && dir === "desc" ? "border-t-amber-600" : "border-t-stone-300"}`} />
    </span>
  );
}

export default function SortableTable<T>({ columns, rows, rowKey, emptyMessage = "No data." }: SortableTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    return [...rows].sort((a, b) => {
      const aVal = col?.sortValue ? col.sortValue(a) : (a as Record<string, unknown>)[sortKey];
      const bVal = col?.sortValue ? col.sortValue(b) : (b as Record<string, unknown>)[sortKey];
      let cmp = 0;
      if (aVal instanceof Date && bVal instanceof Date) {
        cmp = aVal.getTime() - bVal.getTime();
      } else if (typeof aVal === "number" && typeof bVal === "number") {
        cmp = aVal - bVal;
      } else {
        cmp = String(aVal ?? "").localeCompare(String(bVal ?? ""));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir, columns]);

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-stone-50 border-b border-stone-200">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={`text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide whitespace-nowrap select-none ${col.sortable !== false ? "cursor-pointer hover:text-amber-700 hover:bg-amber-50 transition-colors" : ""} ${col.className ?? ""}`}
                onClick={() => col.sortable !== false && handleSort(String(col.key))}
              >
                {col.label}
                {col.sortable !== false && (
                  <SortIcon active={sortKey === String(col.key)} dir={sortDir} />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-5 py-12 text-center text-stone-400">{emptyMessage}</td>
            </tr>
          ) : (
            sorted.map((row) => (
              <tr key={rowKey(row)} className="hover:bg-stone-50 transition-colors">
                {columns.map((col) => (
                  <td key={String(col.key)} className={`px-5 py-4 ${col.className ?? ""}`}>
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[String(col.key)] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
