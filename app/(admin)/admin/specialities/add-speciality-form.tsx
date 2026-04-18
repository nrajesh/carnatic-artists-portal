"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSpecialityAction } from "./actions";

export function AddSpecialityForm() {
  const router = useRouter();
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setMessage(null);
    startTransition(async () => {
      const result = await createSpecialityAction(fd);
      if (result.ok) {
        setMessage({ type: "ok", text: "Speciality added." });
        form.reset();
        (form.elements.namedItem("primaryColor") as HTMLInputElement).value = "#92400E";
        (form.elements.namedItem("textColor") as HTMLInputElement).value = "#FFFFFF";
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
      <h2 className="mb-3 text-sm font-semibold text-stone-700">Add speciality</h2>
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
            name="textColor"
            type="text"
            required
            pattern="^#[0-9A-Fa-f]{6}$"
            defaultValue="#FFFFFF"
            className="min-h-[44px] w-28 rounded-lg border border-stone-300 px-3 py-2 font-mono text-sm"
          />
        </label>
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
