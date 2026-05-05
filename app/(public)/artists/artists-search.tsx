"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useTransition } from "react";
import SearchTypeahead, { SearchOption } from "@/components/search-typeahead";

export default function ArtistsSearch({
  specialities = [],
  locationOptions = [],
  locationAreaLabelPlural = "Regions",
}: {
  specialities?: SearchOption[];
  locationOptions?: SearchOption[];
  locationAreaLabelPlural?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const q = searchParams.get("q") ?? "";
  const speciality = searchParams.get("speciality") ?? "";
  const location = searchParams.get("location") ?? searchParams.get("province") ?? "";

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      if (key === "location") {
        params.delete("province");
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

  const hasFilters = q || speciality || location;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 mb-8">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Name search */}
        <div className="flex-1 relative min-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Keyword: name, bio, social URLs…"
            defaultValue={q}
            onChange={(e) => updateParam("q", e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-stone-200 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
          />
        </div>

        <SearchTypeahead
          value={speciality}
          onChange={(val) => updateParam("speciality", val)}
          options={specialities}
          placeholder="All specialities"
        />

        <SearchTypeahead
          value={location}
          onChange={(val) => updateParam("location", val)}
          options={locationOptions}
          placeholder={`All ${locationAreaLabelPlural.toLowerCase()}`}
        />

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
              Keyword: &ldquo;{q}&rdquo;
              <button onClick={() => updateParam("q", "")} className="hover:text-amber-900 ml-1">×</button>
            </span>
          )}
          {isPending && <span className="text-xs text-stone-400 self-center">Filtering…</span>}
        </div>
      )}
    </div>
  );
}
