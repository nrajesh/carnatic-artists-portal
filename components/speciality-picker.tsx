"use client";

import { useRef, useEffect, useMemo, useState } from "react";
import { normalizeSpecialityLabel } from "@/lib/speciality-catalog";

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
    const q = query.trim().toLowerCase();
    return catalog.filter(
      (s) =>
        !selected.some((x) => x.toLowerCase() === s.name.toLowerCase()) &&
        s.name.toLowerCase().includes(q),
    );
  }, [catalog, query, selected]);

  const normalizedQuery = normalizeSpecialityLabel(query);
  const customEligible =
    allowCustom &&
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
      <div className="mb-2 flex min-h-[36px] flex-wrap gap-2">
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

          {open && catalog.length > 0 && available.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-stone-200 bg-white shadow-lg sm:w-64">
              {available.map((s) => (
                <li key={s.name}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      addFromCatalog(s.name);
                    }}
                    className="flex min-h-[44px] w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-stone-800 hover:bg-amber-50"
                  >
                    <span className="h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.name}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {open && allowCustom && customEligible && (
            <div className="absolute z-20 mt-1 w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 shadow-lg sm:w-64">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  addCustom();
                }}
                className="w-full text-left text-sm font-medium text-amber-900"
              >
                Add custom: &ldquo;{normalizedQuery}&rdquo;
              </button>
              <p className="mt-1 text-xs text-stone-500">
                If it&apos;s missing from the list, admins can add it to the catalogue when reviewing your application.
              </p>
            </div>
          )}

          {open &&
            catalog.length > 0 &&
            query.length > 0 &&
            available.length === 0 &&
            !customEligible && (
              <div className="absolute z-20 mt-1 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-400 shadow-lg sm:w-64">
                No matching specialities
              </div>
            )}
        </div>
      )}

      {error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
    </div>
  );
}
