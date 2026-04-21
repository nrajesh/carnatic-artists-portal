"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminSpecialityRow } from "@/lib/queries/admin-specialities";
import {
  pickRandomUniqueSpecialityColorPair,
  specialityColorPairKey,
} from "@/lib/speciality-random-colors";
import { deleteSpecialityAction, updateSpecialityAction } from "./actions";

const HEX6 = /^#[0-9A-Fa-f]{6}$/;

export function SpecialityCard({
  row,
  allRows,
}: {
  row: AdminSpecialityRow;
  allRows: AdminSpecialityRow[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draftPrimary, setDraftPrimary] = useState(row.primaryColor);
  const [draftText, setDraftText] = useState(row.textColor);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const headerPrimary = editing && HEX6.test(draftPrimary) ? draftPrimary : row.primaryColor;
  const headerTextCol = editing && HEX6.test(draftText) ? draftText : row.textColor;

  const forbiddenPairKeysForRandomize = useMemo(() => {
    const s = new Set<string>();
    for (const r of allRows) {
      if (r.id === row.id) continue;
      s.add(specialityColorPairKey(r.primaryColor, r.textColor));
    }
    return s;
  }, [allRows, row.id]);

  function applyRandomColours() {
    const pair = pickRandomUniqueSpecialityColorPair(forbiddenPairKeysForRandomize);
    if (!pair) return;
    setDraftPrimary(pair.primaryColor);
    setDraftText(pair.textColor);
  }

  function openEditor() {
    setDraftPrimary(row.primaryColor);
    setDraftText(row.textColor);
    setEditing(true);
  }

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
        style={{
          background: `linear-gradient(135deg, ${headerPrimary}, ${headerPrimary}cc)`,
        }}
      >
        <span className="text-sm font-bold" style={{ color: headerTextCol }}>
          {row.name}
        </span>
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
              {row.artistCount > 0 ? (
                <Link
                  href={`/admin/artists?speciality=${row.id}`}
                  className="text-xs font-medium text-amber-800 underline underline-offset-2 hover:text-amber-950"
                >
                  {row.artistCount} artist{row.artistCount !== 1 ? "s" : ""}
                </Link>
              ) : (
                <span className="text-xs text-stone-500">0 artists</span>
              )}
              <button
                type="button"
                onClick={openEditor}
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
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
                Primary
                <input
                  name="primaryColor"
                  required
                  value={draftPrimary}
                  onChange={(e) => setDraftPrimary(e.target.value)}
                  pattern="^#[0-9A-Fa-f]{6}$"
                  className="w-24 rounded border border-stone-300 px-2 py-1.5 font-mono text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
                Text
                <input
                  name="textColor"
                  required
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  pattern="^#[0-9A-Fa-f]{6}$"
                  className="w-24 rounded border border-stone-300 px-2 py-1.5 font-mono text-sm"
                />
              </label>
              <div className="flex items-end gap-2">
                <div
                  className="h-8 w-8 shrink-0 rounded-md border border-stone-300 shadow-sm"
                  style={{
                    background: `linear-gradient(135deg, ${headerPrimary}, ${headerPrimary}cc)`,
                  }}
                  title="Preview of header colours"
                  aria-hidden
                />
                <button
                  type="button"
                  onClick={applyRandomColours}
                  className="rounded border border-stone-300 bg-white px-2 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
                >
                  Randomize
                </button>
              </div>
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
