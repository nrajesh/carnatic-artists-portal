"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useTransition } from "react";

const SPECIALITIES = [
  "Vocal",
  "Violin",
  "Mridangam",
  "Veena",
  "Flute",
  "Ghatam",
  "Kanjira",
  "Thavil",
  "Nadaswaram",
  "Morsing",
  "Tavil",
];

const PROVINCES = [
  "Noord-Holland",
  "Zuid-Holland",
  "Utrecht",
  "Gelderland",
  "Noord-Brabant",
  "Overijssel",
  "Groningen",
  "Friesland",
  "Drenthe",
  "Flevoland",
  "Zeeland",
  "Limburg",
];

export default function ArtistsSearch({
  specialities = SPECIALITIES,
  provinces = PROVINCES,
}: {
  specialities?: string[];
  provinces?: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const q = searchParams.get("q") ?? "";
  const speciality = searchParams.get("speciality") ?? "";
  const province = searchParams.get("province") ?? "";

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams]
  );

  const clearAll = () => {
    startTransition(() => {
      router.replace(pathname);
    });
  };

  const hasFilters = q || speciality || province;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 mb-8">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Name search */}
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search by name…"
            defaultValue={q}
            onChange={(e) => updateParam("q", e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-stone-200 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
          />
        </div>

        {/* Speciality dropdown */}
        <select
          value={speciality}
          onChange={(e) => updateParam("speciality", e.target.value)}
          className="sm:w-44 px-3 py-2.5 rounded-lg border border-stone-200 text-sm text-stone-700 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
        >
          <option value="">All specialities</option>
          {SPECIALITIES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {/* Province dropdown */}
        <select
          value={province}
          onChange={(e) => updateParam("province", e.target.value)}
          className="sm:w-44 px-3 py-2.5 rounded-lg border border-stone-200 text-sm text-stone-700 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
        >
          <option value="">All provinces</option>
          {PROVINCES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        {/* Clear */}
        {hasFilters && (
          <button
            onClick={clearAll}
            className="px-4 py-2.5 rounded-lg border border-stone-200 text-sm text-stone-500 hover:bg-stone-50 hover:text-stone-700 transition-colors min-h-[44px] whitespace-nowrap"
          >
            Clear ×
          </button>
        )}
      </div>

      {/* Active filter chips */}
      {hasFilters && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-stone-100">
          {q && (
            <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-1 rounded-full font-medium">
              Name: &ldquo;{q}&rdquo;
              <button onClick={() => updateParam("q", "")} className="hover:text-amber-900 ml-1">×</button>
            </span>
          )}
          {speciality && (
            <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-1 rounded-full font-medium">
              {speciality}
              <button onClick={() => updateParam("speciality", "")} className="hover:text-amber-900 ml-1">×</button>
            </span>
          )}
          {province && (
            <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-1 rounded-full font-medium">
              {province}
              <button onClick={() => updateParam("province", "")} className="hover:text-amber-900 ml-1">×</button>
            </span>
          )}
          {isPending && <span className="text-xs text-stone-400 self-center">Filtering…</span>}
        </div>
      )}
    </div>
  );
}
