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

export type TableSelectionHandlers = {
  selectedIds: ReadonlySet<string>;
  onToggle: (id: string) => void;
  /** Toggle all rows currently shown (after sort/filter in the table). */
  onToggleAllVisible: (visibleRowIds: string[]) => void;
};

interface SortableTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  selection?: TableSelectionHandlers;
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className="inline-flex flex-col ml-1.5 gap-[2px] align-middle">
      <span className={`block w-0 h-0 border-l-[4px] border-r-[4px] border-b-[5px] border-l-transparent border-r-transparent ${active && dir === "asc" ? "border-b-amber-600" : "border-b-stone-300"}`} />
      <span className={`block w-0 h-0 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent ${active && dir === "desc" ? "border-t-amber-600" : "border-t-stone-300"}`} />
    </span>
  );
}

export default function SortableTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = "No data.",
  selection,
}: SortableTableProps<T>) {
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

  const visibleIds = sorted.map((row) => rowKey(row));
  const selectedInView = visibleIds.filter((id) => selection?.selectedIds.has(id));
  const allVisibleSelected =
    selection && visibleIds.length > 0 && selectedInView.length === visibleIds.length;
  const someVisibleSelected =
    selection && selectedInView.length > 0 && selectedInView.length < visibleIds.length;

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-200 bg-stone-50 px-4 py-3 sm:hidden">
        {selection ? (
          <label className="inline-flex items-center gap-2 text-sm font-medium text-stone-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
              checked={allVisibleSelected}
              ref={(el) => {
                if (el) el.indeterminate = someVisibleSelected ?? false;
              }}
              onChange={() => selection.onToggleAllVisible(visibleIds)}
              aria-label="Select all rows"
            />
            Select visible
          </label>
        ) : (
          <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Entries
          </div>
        )}
      </div>

      <div className="sm:hidden">
        {sorted.length === 0 ? (
          <div className="px-5 py-12 text-center text-stone-400">{emptyMessage}</div>
        ) : (
          <div className="divide-y divide-stone-100">
            {sorted.map((row) => {
              const id = rowKey(row);
              return (
                <div key={id} className="space-y-3 px-4 py-4">
                  {selection ? (
                    <label className="inline-flex items-center gap-2 text-sm font-medium text-stone-700">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                        checked={selection.selectedIds.has(id)}
                        onChange={() => selection.onToggle(id)}
                        aria-label={`Select row ${id}`}
                      />
                      Select
                    </label>
                  ) : null}
                  <div className="space-y-3">
                    {columns.map((col) => {
                      const content = col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[String(col.key)] ?? "");
                      const hasLabel = col.label.trim().length > 0;
                      return (
                        <div key={String(col.key)} className="space-y-1">
                          {hasLabel ? (
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                              {col.label}
                            </div>
                          ) : null}
                          <div className={hasLabel ? "text-sm text-stone-700" : ""}>{content}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              {selection ? (
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                    checked={allVisibleSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someVisibleSelected ?? false;
                    }}
                    onChange={() => selection.onToggleAllVisible(visibleIds)}
                    aria-label="Select all rows"
                  />
                </th>
              ) : null}
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
                <td
                  colSpan={columns.length + (selection ? 1 : 0)}
                  className="px-5 py-12 text-center text-stone-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sorted.map((row) => {
                const id = rowKey(row);
                return (
                  <tr key={id} className="transition-colors hover:bg-stone-50">
                    {selection ? (
                      <td className="w-10 px-3 py-4 align-middle">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                          checked={selection.selectedIds.has(id)}
                          onChange={() => selection.onToggle(id)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select row ${id}`}
                        />
                      </td>
                    ) : null}
                    {columns.map((col) => (
                      <td key={String(col.key)} className={`px-5 py-4 ${col.className ?? ""}`}>
                        {col.render
                          ? col.render(row)
                          : String((row as Record<string, unknown>)[String(col.key)] ?? "")}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
