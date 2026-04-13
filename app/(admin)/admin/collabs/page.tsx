"use client";

import Link from "next/link";
import SortableTable, { Column } from "@/components/sortable-table";

type Collab = {
  id: string; name: string; owner: string; members: number;
  messages: number; status: string; createdAt: Date;
};

const DUMMY_COLLABS: Collab[] = [
  { id: "c1", name: "Margazhi Concert Prep",       owner: "Lakshmi Narayanan",    members: 4, messages: 23, status: "active",     createdAt: new Date("2025-01-10") },
  { id: "c2", name: "Thyagaraja Aradhana 2025",    owner: "Ravi Krishnamurthy",   members: 6, messages: 47, status: "active",     createdAt: new Date("2025-01-20") },
  { id: "c3", name: "Rotterdam Kutcheri",          owner: "Anand Subramanian",    members: 3, messages: 31, status: "completed",  createdAt: new Date("2024-11-05") },
  { id: "c4", name: "Amsterdam Rasikas Evening",   owner: "Priya Balakrishnan",   members: 5, messages: 12, status: "active",     createdAt: new Date("2025-02-01") },
  { id: "c5", name: "Veena & Flute Jugalbandi",    owner: "Meera Venkatesh",      members: 2, messages: 18, status: "completed",  createdAt: new Date("2024-12-15") },
  { id: "c6", name: "Percussion Ensemble NL",      owner: "Karthik Seshadri",     members: 4, messages: 8,  status: "active",     createdAt: new Date("2025-02-20") },
  { id: "c7", name: "Carnatic Youth Workshop",     owner: "Nithya Subramanian",   members: 7, messages: 34, status: "active",     createdAt: new Date("2025-03-01") },
  { id: "c8", name: "Navarathri Golu Concert",     owner: "Kavitha Muralidharan", members: 5, messages: 9,  status: "incomplete", createdAt: new Date("2024-10-01") },
];

const STATUS_STYLES: Record<string, string> = {
  active:     "bg-green-50 text-green-700 border border-green-200",
  completed:  "bg-blue-50 text-blue-700 border border-blue-200",
  incomplete: "bg-stone-100 text-stone-500 border border-stone-200",
};
const STATUS_LABELS: Record<string, string> = { active: "Active", completed: "Completed", incomplete: "Incomplete" };

const COLUMNS: Column<Collab>[] = [
  { key: "name",     label: "Collab",    render: (c) => <span className="font-semibold text-stone-800">{c.name}</span> },
  { key: "owner",    label: "Owner",     render: (c) => <span className="text-stone-600">{c.owner}</span> },
  { key: "members",  label: "Members",   render: (c) => <span className="text-stone-600">{c.members}</span> },
  { key: "messages", label: "Messages",  render: (c) => <span className="text-stone-600">{c.messages}</span> },
  {
    key: "status", label: "Status",
    render: (c) => (
      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[c.status] ?? ""}`}>
        {STATUS_LABELS[c.status] ?? c.status}
      </span>
    ),
  },
  {
    key: "createdAt", label: "Created",
    sortValue: (c) => c.createdAt,
    render: (c) => <span className="text-stone-400 text-xs">{c.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>,
  },
  {
    key: "actions", label: "", sortable: false,
    render: (c) => <Link href={`/admin/collabs/${c.id}`} className="text-xs text-amber-700 hover:text-amber-900 font-medium underline underline-offset-2">View</Link>,
  },
];

export default function AdminCollabsPage() {
  const activeCount = DUMMY_COLLABS.filter(c => c.status === "active").length;
  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 sm:px-8">
      <Link href="/admin/dashboard" className="text-sm text-amber-700 hover:text-amber-900 mb-6 inline-block">← Dashboard</Link>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-800">Collab Moderation</h1>
        <p className="text-stone-500 mt-1">{DUMMY_COLLABS.length} collabs total · {activeCount} active</p>
      </div>
      <SortableTable columns={COLUMNS} rows={DUMMY_COLLABS} rowKey={(c) => c.id} emptyMessage="No collabs found." />
    </main>
  );
}
