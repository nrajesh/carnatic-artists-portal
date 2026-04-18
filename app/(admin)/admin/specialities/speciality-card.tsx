"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminSpecialityRow } from "@/lib/queries/admin-specialities";
import { deleteSpecialityAction, updateSpecialityAction } from "./actions";

export function SpecialityCard({ row }: { row: AdminSpecialityRow }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onUpdate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setMessage(null);
    startTransition(async () => {
      const result = await updateSpecialityAction(fd);
      if (result.ok) {
        setEditing(false);
        router.refresh();
      } else {
        setMessage(result.error);
      }
    });
  }

  function onDelete() {
    if (!confirm(`Delete "${row.name}"? This only works if no artists use it.`)) return;
    setMessage(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", row.id);
      const result = await deleteSpecialityAction(fd);
      if (!result.ok) setMessage(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <div
        className="flex h-12 items-center px-5"
        style={{ background: `linear-gradient(135deg, ${row.primaryColor}, ${row.primaryColor}cc)` }}
      >
        <span className="text-sm font-bold text-white">{row.name}</span>
      </div>
      <div className="px-5 py-4">
        {message ? <p className="mb-2 text-sm text-red-600">{message}</p> : null}

        {!editing ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 rounded-full border border-stone-200" style={{ backgroundColor: row.primaryColor }} />
              <span className="font-mono text-xs text-stone-500">{row.primaryColor}</span>
              <span className="text-xs text-stone-400">text {row.textColor}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500">
                {row.artistCount} artist{row.artistCount !== 1 ? "s" : ""}
              </span>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-xs font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={pending || row.artistCount > 0}
                title={row.artistCount > 0 ? "Remove artists from this speciality first" : undefined}
                className="text-xs font-medium text-red-700 underline underline-offset-2 hover:text-red-900 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={onUpdate} className="space-y-3">
            <input type="hidden" name="id" value={row.id} />
            <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
              Name
              <input
                name="name"
                required
                defaultValue={row.name}
                className="rounded border border-stone-300 px-2 py-1.5 text-sm"
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
                Primary
                <input
                  name="primaryColor"
                  required
                  defaultValue={row.primaryColor}
                  pattern="^#[0-9A-Fa-f]{6}$"
                  className="w-24 rounded border border-stone-300 px-2 py-1.5 font-mono text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
                Text
                <input
                  name="textColor"
                  required
                  defaultValue={row.textColor}
                  pattern="^#[0-9A-Fa-f]{6}$"
                  className="w-24 rounded border border-stone-300 px-2 py-1.5 font-mono text-sm"
                />
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setMessage(null);
                }}
                className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
