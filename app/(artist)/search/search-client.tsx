"use client";

import { useState } from "react";
import { usePostHog } from "posthog-js/react";
import type { ArtistListing } from "@/lib/queries/artists";

export default function ArtistSearchClient({ artists }: { artists: ArtistListing[] }) {
  const posthog = usePostHog();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ArtistListing[]>([]);
  const [searched, setSearched] = useState(false);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const filtered = artists.filter(
      (a) =>
        a.name.toLowerCase().includes(query.toLowerCase()) ||
        a.specialities.some((s) => s.name.toLowerCase().includes(query.toLowerCase())),
    );
    setResults(filtered);
    setSearched(true);
    posthog.capture("artist_search_performed", { result_count: filtered.length });
  }

  return (
    <main className="min-h-screen bg-amber-50 px-4 py-8 sm:px-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-stone-800 mb-6">Artist Search</h1>
        <form onSubmit={handleSearch} className="flex gap-3 mb-6">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or speciality…"
            className="flex-1 border border-stone-200 rounded-lg px-3 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-amber-700 text-white font-semibold rounded-lg hover:bg-amber-800 transition-colors min-h-[44px]"
          >
            Search
          </button>
        </form>
        {searched &&
          (results.length === 0 ? (
            <p className="text-stone-400 text-sm italic">No artists found.</p>
          ) : (
            <ul className="space-y-3">
              {results.map((a) => (
                <li key={a.slug} className="bg-white rounded-xl border border-stone-200 px-4 py-3">
                  <p className="font-semibold text-stone-800">{a.name}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{a.specialities.map((s) => s.name).join(", ")}</p>
                </li>
              ))}
            </ul>
          ))}
      </div>
    </main>
  );
}
