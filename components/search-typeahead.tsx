"use client";

import { useRef, useEffect, useMemo, useState } from "react";
import { rankTypeaheadMatches, splitTypeaheadHighlight } from "@/lib/typeahead-search";

export type SearchOption = { label: string; color?: string };

interface Props {
  value: string;
  onChange: (next: string) => void;
  options: SearchOption[];
  placeholder: string;
}

export default function SearchTypeahead({ value, onChange, options, placeholder }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const available = useMemo(() => {
    return rankTypeaheadMatches(options, (option) => option.label, query);
  }, [options, query]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function selectOption(name: string) {
    onChange(name);
    setQuery("");
    setOpen(false);
  }

  const selectedOption = options.find(o => o.label === value);

  return (
    <div ref={containerRef} className={`relative ${open ? "z-[1300]" : "z-[1200]"} flex-1 sm:flex-none sm:min-w-[200px]`}>
      {value ? (
        <div className="flex min-h-[44px] items-center rounded-lg border border-stone-200 bg-white px-2 py-1">
          <span 
            className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium"
            style={
              selectedOption?.color 
                ? { backgroundColor: selectedOption.color, color: "#FFFFFF" }
                : { backgroundColor: "#FFFBEB", color: "#B45309", border: "1px solid #FDE68A" }
            }
          >
            {value}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange("");
              }}
              className="ml-1 flex h-4 w-4 items-center justify-center rounded-full transition-colors hover:bg-white/20"
            >
              ×
            </button>
          </span>
        </div>
      ) : (
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          className="min-h-[44px] w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      )}

      {open && !value && query.trim().length >= 2 && available.length > 0 && (
        <ul className="absolute z-[1200] mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-stone-200 bg-white shadow-lg">
          {available.map(({ item }) => {
            const highlight = splitTypeaheadHighlight(item.label, query);
            return (
            <li key={item.label}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectOption(item.label);
                }}
                className="flex min-h-[44px] w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-stone-800 hover:bg-amber-50"
              >
                {item.color && <span className="h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: item.color }} />}
                <span>
                  {highlight ? (
                    <>
                      {highlight.before}
                      <strong className="font-semibold text-stone-950">{highlight.match}</strong>
                      {highlight.after}
                    </>
                  ) : (
                    item.label
                  )}
                </span>
              </button>
            </li>
            );
          })}
        </ul>
      )}

      {open && !value && query.trim().length >= 2 && available.length === 0 && (
        <div className="absolute z-[1200] mt-1 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-400 shadow-lg">
          No matches found
        </div>
      )}
    </div>
  );
}
