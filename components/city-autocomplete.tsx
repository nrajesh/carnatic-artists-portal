"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

type CitySuggestion = {
  label: string;
};

type CityAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  error?: string;
  localOptions?: string[];
};

function normalizeOptions(options: string[]): CitySuggestion[] {
  return Array.from(new Set(options.map((option) => option.trim()).filter(Boolean)))
    .sort((left, right) => left.localeCompare(right))
    .map((label) => ({ label }));
}

export function CityAutocomplete({
  value,
  onChange,
  onBlur,
  placeholder,
  className,
  localOptions = [],
}: CityAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [remoteSuggestions, setRemoteSuggestions] = useState<CitySuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();

  const localSuggestions = useMemo(() => {
    const query = value.trim().toLocaleLowerCase();
    const options = normalizeOptions(localOptions);
    if (!query) return options.slice(0, 8);
    return options.filter((option) => option.label.toLocaleLowerCase().includes(query)).slice(0, 8);
  }, [localOptions, value]);

  useEffect(() => {
    const query = value.trim();
    if (query.length < 2) {
      setRemoteSuggestions([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams({ q: query, limit: "8" });
        const response = await fetch(`/api/city-suggestions?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) {
          setRemoteSuggestions([]);
          return;
        }
        const json = (await response.json()) as { suggestions?: CitySuggestion[] };
        setRemoteSuggestions(Array.isArray(json.suggestions) ? json.suggestions : []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setRemoteSuggestions([]);
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

  const suggestions = useMemo(() => {
    const merged = new Map<string, CitySuggestion>();
    for (const suggestion of [...remoteSuggestions, ...localSuggestions]) {
      const key = suggestion.label.toLocaleLowerCase();
      if (!merged.has(key)) merged.set(key, suggestion);
    }
    return Array.from(merged.values()).slice(0, 8);
  }, [localSuggestions, remoteSuggestions]);

  const showList = open && suggestions.length > 0;

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        type="text"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={onBlur}
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
            onChange(selected.label);
            setOpen(false);
            setActiveIndex(-1);
          }
          if (event.key === "Escape") {
            setOpen(false);
            setActiveIndex(-1);
          }
        }}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
        aria-autocomplete="list"
        aria-controls={showList ? listboxId : undefined}
        aria-activedescendant={showList && activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
      />
      {showList ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-stone-200 bg-white py-1 shadow-lg"
        >
          {suggestions.map((suggestion, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={suggestion.label}
                id={`${listboxId}-${index}`}
                type="button"
                role="option"
                aria-selected={isActive}
                className={`block w-full px-3 py-2 text-left text-sm ${
                  isActive ? "bg-amber-50 text-amber-900" : "text-stone-700 hover:bg-stone-50"
                }`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  onChange(suggestion.label);
                  setOpen(false);
                  setActiveIndex(-1);
                }}
              >
                {suggestion.label}
              </button>
            );
          })}
          {isLoading ? (
            <div className="px-3 py-2 text-xs text-stone-500">Loading suggestions...</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
