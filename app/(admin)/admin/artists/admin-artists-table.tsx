"use client";

import Link from "next/link";
import SortableTable, { Column } from "@/components/sortable-table";
import type { AdminArtistListRow } from "@/lib/queries/admin-artists";

const COLUMNS: Column<AdminArtistListRow>[] = [
  {
    key: "name",
    label: "Artist",
    render: (a) => (
      <Link href={`/admin/artists/${a.id}`}>
        <div className="font-semibold text-stone-800 transition-colors hover:text-amber-800">{a.name}</div>
        <div className="mt-0.5 text-xs text-stone-400">{a.email}</div>
      </Link>
    ),
  },
  {
    key: "specialities",
    label: "Specialities",
    sortValue: (a) => a.specialities.map((s) => s.name).join(", "),
    render: (a) => (
      <div className="flex flex-wrap gap-1">
        {a.specialities.map((s) => (
          <span
            key={s.name}
            className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"
          >
            {s.name}
          </span>
        ))}
      </div>
    ),
  },
  {
    key: "province",
    label: "Province",
    render: (a) => <span className="text-stone-600">{a.province}</span>,
  },
  {
    key: "status",
    label: "Status",
    sortValue: (a) => a.status,
    render: (a) => (
      <span
        className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${
          a.status === "active"
            ? "border-green-200 bg-green-50 text-green-700"
            : "border-red-200 bg-red-50 text-red-700"
        }`}
      >
        {a.status === "active" ? "Active" : "Suspended"}
      </span>
    ),
  },
  {
    key: "joinedAt",
    label: "Joined",
    sortValue: (a) => a.joinedAt.getTime(),
    render: (a) => <span className="text-xs text-stone-400">{a.joinedAtDisplay}</span>,
  },
  {
    key: "actions",
    label: "",
    sortable: false,
    render: (a) => (
      <Link
        href={`/admin/artists/${a.id}/edit`}
        className="text-xs font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900"
      >
        Edit
      </Link>
    ),
  },
];

export function AdminArtistsTable({ rows }: { rows: AdminArtistListRow[] }) {
  return (
    <SortableTable columns={COLUMNS} rows={rows} rowKey={(a) => a.id} emptyMessage="No artists found." />
  );
}
