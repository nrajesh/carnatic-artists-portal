"use client";

import Link from "next/link";
import SortableTable, { Column } from "@/components/sortable-table";
import { DUMMY_ARTISTS } from "@/lib/dummy-artists";

type Artist = {
  id: string; name: string; email: string; province: string;
  specialities: { name: string; color: string }[]; status: string; joinedAt: string;
};

const TABLE_ARTISTS: Artist[] = DUMMY_ARTISTS.map(a => ({
  id: a.id, name: a.name, email: a.email, province: a.province,
  specialities: a.specialities, status: a.status, joinedAt: a.joinedAt,
}));

const COLUMNS: Column<Artist>[] = [
  {
    key: "name", label: "Artist",
    render: (a) => (
      <Link href={`/admin/artists/${a.id}`}>
        <div className="font-semibold text-stone-800 hover:text-amber-800 transition-colors">{a.name}</div>
        <div className="text-xs text-stone-400 mt-0.5">{a.email}</div>
      </Link>
    ),
  },
  {
    key: "specialities", label: "Specialities",
    sortValue: (a) => a.specialities.map(s => s.name).join(", "),
    render: (a) => (
      <div className="flex flex-wrap gap-1">
        {a.specialities.map(s => (
          <span key={s.name} className="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full font-medium">{s.name}</span>
        ))}
      </div>
    ),
  },
  { key: "province", label: "Province", render: (a) => <span className="text-stone-600">{a.province}</span> },
  {
    key: "status", label: "Status",
    render: (a) => (
      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${a.status === "active" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
        {a.status === "active" ? "Active" : "Suspended"}
      </span>
    ),
  },
  {
    key: "joinedAt", label: "Joined",
    render: (a) => <span className="text-stone-400 text-xs">{a.joinedAt}</span>,
  },
  {
    key: "actions", label: "", sortable: false,
    render: (a) => <Link href={`/admin/artists/${a.id}/edit`} className="text-xs text-amber-700 hover:text-amber-900 font-medium underline underline-offset-2">Edit</Link>,
  },
];

export default function AdminArtistsPage() {
  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 sm:px-8">
      <Link href="/admin/dashboard" className="text-sm text-amber-700 hover:text-amber-900 mb-6 inline-block">← Dashboard</Link>
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-800">Artists</h1>
          <p className="text-stone-500 mt-1">{TABLE_ARTISTS.length} registered artists</p>
        </div>
      </div>
      <SortableTable columns={COLUMNS} rows={TABLE_ARTISTS} rowKey={(a) => a.id} emptyMessage="No artists found." />
    </main>
  );
}
