"use client";

import { FormEvent, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PortalSectionHeading } from "@/components/portal-section-heading";
import {
  pickRandomUniqueSpecialityColorPair,
  specialityColorPairKey,
} from "@/lib/speciality-random-colors";
import { createSpecialityAction } from "./actions";

export function AddSpecialityForm({
  occupiedColorPairs,
}: {
  occupiedColorPairs: { primaryColor: string; textColor: string }[];
}) {
  const router = useRouter();
  const primaryRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const forbiddenPairKeys = useMemo(() => {
    const s = new Set<string>();
    for (const p of occupiedColorPairs) {
      s.add(specialityColorPairKey(p.primaryColor, p.textColor));
    }
    return s;
  }, [occupiedColorPairs]);

  const defaultAddFormPairKey = specialityColorPairKey("#92400E", "#FFFFFF");
  const didAdjustInitialColours = useRef(false);
  useLayoutEffect(() => {
    if (didAdjustInitialColours.current) return;
    if (!forbiddenPairKeys.has(defaultAddFormPairKey)) return;
    if (!primaryRef.current || !textRef.current) return;
    didAdjustInitialColours.current = true;
    const pair = pickRandomUniqueSpecialityColorPair(forbiddenPairKeys);
    if (!pair) return;
    primaryRef.current.value = pair.primaryColor;
    textRef.current.value = pair.textColor;
  }, [forbiddenPairKeys, defaultAddFormPairKey]);

  function applyRandomColours(extraForbidden?: ReadonlySet<string>) {
    const merged =
      extraForbidden && extraForbidden.size > 0
        ? new Set([...forbiddenPairKeys, ...extraForbidden])
        : forbiddenPairKeys;
    const pair = pickRandomUniqueSpecialityColorPair(merged);
    if (!pair || !primaryRef.current || !textRef.current) return;
    primaryRef.current.value = pair.primaryColor;
    textRef.current.value = pair.textColor;
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setMessage(null);
    startTransition(async () => {
      const result = await createSpecialityAction(fd);
      if (result.ok) {
        setMessage({ type: "ok", text: "Speciality added." });
        const addedPrimary = (form.elements.namedItem("primaryColor") as HTMLInputElement).value;
        const addedText = (form.elements.namedItem("textColor") as HTMLInputElement).value;
        form.reset();
        const justAdded = new Set<string>([specialityColorPairKey(addedPrimary, addedText)]);
        applyRandomColours(justAdded);
        router.refresh();
      } else {
        setMessage({ type: "err", text: result.error });
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mb-8 rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
    >
      <PortalSectionHeading variant="title" className="mb-3">
        Add speciality
      </PortalSectionHeading>
      {message ? (
        <p className={`mb-3 text-sm ${message.type === "ok" ? "text-green-700" : "text-red-700"}`}>
          {message.text}
        </p>
      ) : (
        <div className="mb-3 min-h-[1.25rem]" />
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Name
          <input
            name="name"
            required
            minLength={2}
            maxLength={80}
            className="min-h-[44px] rounded-lg border border-stone-300 px-3 py-2 text-sm"
            placeholder="e.g. Saraswati Veena"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Primary colour
          <input
            ref={primaryRef}
            name="primaryColor"
            type="text"
            required
            pattern="^#[0-9A-Fa-f]{6}$"
            defaultValue="#92400E"
            className="min-h-[44px] w-28 rounded-lg border border-stone-300 px-3 py-2 font-mono text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Text colour
          <input
            ref={textRef}
            name="textColor"
            type="text"
            required
            pattern="^#[0-9A-Fa-f]{6}$"
            defaultValue="#FFFFFF"
            className="min-h-[44px] w-28 rounded-lg border border-stone-300 px-3 py-2 font-mono text-sm"
          />
        </label>
        <button
          type="button"
          onClick={() => applyRandomColours()}
          className="min-h-[44px] rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 shadow-sm hover:bg-stone-50"
        >
          Randomize colours
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add speciality"}
        </button>
      </div>
      <p className="mt-2 text-xs text-stone-400">Use #RRGGBB hex codes (e.g. #92400E).</p>
    </form>
  );
}
