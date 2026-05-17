"use client";

import { useRef, useEffect, useMemo, useState } from "react";
import { normalizeSpecialityLabel } from "@/lib/speciality-catalog";
import { rankTypeaheadMatches, splitTypeaheadHighlight } from "@/lib/typeahead-search";

export type SpecialityCatalogItem = { name: string; color: string };

interface Props {
  selected: string[];
  onChange: (next: string[]) => void;
  error?: string;
  /** Catalogue rows (typically from GET /api/specialities or server props). */
  catalog: SpecialityCatalogItem[];
  /** Allow typing a custom speciality not in the catalogue (registration flow). */
  allowCustom?: boolean;
}

export default function SpecialityPicker({
  selected,
  onChange,
  error,
  catalog,
  allowCustom = false,
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const catalogByLower = useMemo(() => {
    const m = new Map<string, SpecialityCatalogItem>();
    for (const row of catalog) {
      m.set(row.name.toLowerCase(), row);
    }
    return m;
  }, [catalog]);

  const available = useMemo(() => {
    const unselectedCatalog = catalog.filter(
      (s) => !selected.some((x) => x.toLowerCase() === s.name.toLowerCase()),
    );
    if (!query.trim()) {
      return unselectedCatalog.map((item) => ({
        item,
        matchIndex: -1,
        matchLength: 0,
        wordStart: false,
      }));
    }
    return rankTypeaheadMatches(unselectedCatalog, (item) => item.name, query);
  }, [catalog, query, selected]);

  const availableItems = useMemo(() => {
    return available.map(({ item }) => item);
  }, [available]);

  const normalizedQuery = normalizeSpecialityLabel(query);
  /** Only offer "Add custom" when nothing in the catalogue matches  -  avoids a second panel covering matches. */
  const customEligible =
    allowCustom &&
    availableItems.length === 0 &&
    normalizedQuery.length >= 2 &&
    normalizedQuery.length <= 80 &&
    selected.length < 3 &&
    !selected.some((x) => x.toLowerCase() === normalizedQuery.toLowerCase()) &&
    !catalogByLower.has(normalizedQuery.toLowerCase());

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function addFromCatalog(name: string) {
    const canonical = catalogByLower.get(name.toLowerCase())?.name ?? name;
    if (selected.length < 3) {
      onChange([...selected, canonical]);
    }
    setQuery("");
    setOpen(false);
  }

  function addCustom() {
    const label = normalizeSpecialityLabel(query);
    if (selected.length >= 3 || label.length < 2) return;
    if (selected.some((x) => x.toLowerCase() === label.toLowerCase())) return;
    onChange([...selected, label]);
    setQuery("");
    setOpen(false);
  }

  function remove(name: string) {
    onChange(selected.filter((s) => s !== name));
  }

  function chipColor(name: string): string {
    return catalogByLower.get(name.toLowerCase())?.color ?? "#92400E";
  }

  return (
    <div>
      <div className={`${selected.length > 0 ? "mb-2 min-h-[36px]" : ""} flex flex-wrap gap-2`}>
        {selected.map((name) => {
          const c = chipColor(name);
          return (
            <span
              key={name}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium"
              style={{ backgroundColor: c, color: "#FFFFFF" }}
            >
              {name}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  remove(name);
                }}
                className="ml-1 flex h-4 w-4 items-center justify-center rounded-full transition-colors hover:bg-white/20"
                aria-label={`Remove ${name}`}
              >
                ×
              </button>
            </span>
          );
        })}
      </div>

      {selected.length < 3 && (
        <div ref={containerRef} className="relative">
          <input
            type="text"
            value={query}
            placeholder={
              catalog.length === 0 ? "Loading specialities…" : "Search or type a speciality…"
            }
            disabled={catalog.length === 0 && !allowCustom}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            className="min-h-[44px] w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-stone-800 placeholder:text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 sm:w-64"
          />

          {open && catalog.length > 0 && query.trim().length >= 2 && (availableItems.length > 0 || customEligible) && (
            <ul className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-stone-200 bg-white shadow-lg sm:w-64">
              {availableItems.map((item) => {
                const highlight = splitTypeaheadHighlight(item.name, query);
                return (
                <li key={item.name}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      addFromCatalog(item.name);
                    }}
                    className="flex min-h-[44px] w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-stone-800 hover:bg-amber-50"
                  >
                    <span className="h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                    <span>
                      {highlight ? (
                        <>
                          {highlight.before}
                          <strong className="font-semibold text-stone-950">{highlight.match}</strong>
                          {highlight.after}
                        </>
                      ) : (
                        item.name
                      )}
                    </span>
                  </button>
                </li>
                );
              })}
              {customEligible ? (
                <li className="border-t border-amber-100 bg-amber-50/50">
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      addCustom();
                    }}
                    className="flex min-h-[44px] w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold text-amber-700 hover:bg-amber-100/80"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-dashed border-amber-400 text-lg leading-none">
                      +
                    </span>
                    <span>Add custom: &ldquo;{normalizedQuery}&rdquo;</span>
                  </button>
                </li>
              ) : null}
            </ul>
          )}

          {open &&
            catalog.length > 0 &&
            query.trim().length >= 2 &&
            availableItems.length === 0 &&
            !customEligible && (
              <div className="absolute z-20 mt-1 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-400 shadow-lg sm:w-64">
                No matching specialities
              </div>
            )}

          {open && catalog.length === 0 && allowCustom && customEligible && (
            <div className="absolute z-20 mt-1 w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 shadow-lg sm:w-64">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  addCustom();
                }}
                className="flex w-full items-center gap-2 text-left text-sm font-bold text-amber-700"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-dashed border-amber-400 text-lg leading-none">
                  +
                </span>
                <span>Add custom: &ldquo;{normalizedQuery}&rdquo;</span>
              </button>
            </div>
          )}
        </div>
      )}

      {error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
    </div>
  );
}
