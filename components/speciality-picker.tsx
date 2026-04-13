"use client";

import { useState, useRef, useEffect } from "react";

const ALL_SPECIALITIES = [
  { name: "Vocal",             color: "#7C3AED" },
  { name: "Violin",            color: "#B45309" },
  { name: "Mridangam",         color: "#B91C1C" },
  { name: "Veena",             color: "#047857" },
  { name: "Flute",             color: "#0369A1" },
  { name: "Ghatam",            color: "#92400E" },
  { name: "Kanjira",           color: "#BE185D" },
  { name: "Thavil",            color: "#7E22CE" },
  { name: "Nadaswaram",        color: "#C2410C" },
  { name: "Violin (Carnatic)", color: "#A16207" },
  { name: "Morsing",           color: "#065F46" },
  { name: "Tavil",             color: "#1D4ED8" },
];

interface Props {
  selected: string[];
  onChange: (next: string[]) => void;
  error?: string;
}

export default function SpecialityPicker({ selected, onChange, error }: Props) {
  const [query, setQuery]       = useState("");
  const [open, setOpen]         = useState(false);
  const containerRef            = useRef<HTMLDivElement>(null);

  const available = ALL_SPECIALITIES.filter(
    s => !selected.includes(s.name) &&
         s.name.toLowerCase().includes(query.toLowerCase())
  );

  // Close on outside click
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

  function add(name: string) {
    if (selected.length < 3) {
      onChange([...selected, name]);
    }
    setQuery("");
    setOpen(false);
  }

  function remove(name: string) {
    onChange(selected.filter(s => s !== name));
  }

  return (
    <div>
      {/* Selected chips */}
      <div className="flex flex-wrap gap-2 mb-2 min-h-[36px]">
        {selected.map(name => {
          const c = ALL_SPECIALITIES.find(s => s.name === name)?.color ?? "#92400E";
          return (
            <span key={name}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium"
              style={{ backgroundColor: c, color: "#FFFFFF" }}>
              {name}
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); remove(name); }}
                className="ml-1 w-4 h-4 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                aria-label={`Remove ${name}`}>
                ×
              </button>
            </span>
          );
        })}
      </div>

      {/* Typeahead input - hidden once 3 selected */}
      {selected.length < 3 && (
        <div ref={containerRef} className="relative">
          <input
            type="text"
            value={query}
            placeholder="Type to search speciality…"
            onFocus={() => setOpen(true)}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            className="w-full sm:w-64 border border-amber-200 bg-amber-50 rounded-lg px-3 py-2 text-sm text-stone-800 placeholder-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
          />

          {open && available.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full sm:w-64 bg-white border border-stone-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
              {available.map(s => (
                <li key={s.name}>
                  <button
                    type="button"
                    onMouseDown={e => { e.preventDefault(); add(s.name); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-stone-800 hover:bg-amber-50 flex items-center gap-2 min-h-[44px]">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    {s.name}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {open && query.length > 0 && available.length === 0 && (
            <div className="absolute z-20 mt-1 w-full sm:w-64 bg-white border border-stone-200 rounded-xl shadow-lg px-4 py-3 text-sm text-stone-400">
              No matching specialities
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
