"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ArtistSuggestion = {
  slug: string;
  label: string;
  province: string;
};

export function ArtistAutocomplete() {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState<ArtistSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const listboxId = useId();

  useEffect(() => {
    const query = value.trim();
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams({ q: query, limit: "8" });
        const response = await fetch(`/api/artist-suggestions?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) {
          setSuggestions([]);
          return;
        }
        const json = (await response.json()) as { suggestions?: ArtistSuggestion[] };
        setSuggestions(Array.isArray(json.suggestions) ? json.suggestions : []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setSuggestions([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
      setIsLoading(false);
    };
  }, [value]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const handleSelect = (suggestion: ArtistSuggestion) => {
    router.push(`/artists/${suggestion.slug}`);
    setValue("");
    setOpen(false);
    setActiveIndex(-1);
  };

  const showList = open && suggestions.length > 0;

  return (
    <div className="relative w-full sm:w-64" ref={wrapperRef}>
      <div className="relative flex items-center">
        <svg
          className="absolute left-3.5 h-4 w-4 text-stone-400 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (!showList) return;

            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((current) => (current + 1) % suggestions.length);
              return;
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
              return;
            }
            if (event.key === "Enter" && activeIndex >= 0) {
              event.preventDefault();
              const selected = suggestions[activeIndex];
              if (!selected) return;
              handleSelect(selected);
            }
            if (event.key === "Escape") {
              setOpen(false);
              setActiveIndex(-1);
            }
          }}
          placeholder="Search artists by name..."
          className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-4 text-sm text-stone-800 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all shadow-sm"
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={showList ? listboxId : undefined}
          aria-activedescendant={
            showList && activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined
          }
        />
        {isLoading && (
          <div className="absolute right-3.5 flex items-center">
            <svg className="animate-spin h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        )}
      </div>
      {showList ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-2xl border border-stone-200 bg-white py-1 shadow-lg animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {suggestions.map((suggestion, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={suggestion.slug}
                id={`${listboxId}-${index}`}
                type="button"
                role="option"
                aria-selected={isActive}
                className={`block w-full px-4 py-2.5 text-left text-sm transition-colors ${
                  isActive ? "bg-amber-50 text-amber-900" : "text-stone-700 hover:bg-stone-50"
                }`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  handleSelect(suggestion);
                }}
              >
                <div className="font-semibold">{suggestion.label}</div>
                <div className="text-xs text-stone-400">{suggestion.province}</div>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
