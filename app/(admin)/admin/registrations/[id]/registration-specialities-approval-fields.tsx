"use client";

import { useMemo, useState } from "react";
import SpecialityPicker, { type SpecialityCatalogItem } from "@/components/speciality-picker";

type Props = {
  initialSpecialities: string[];
  catalog: SpecialityCatalogItem[];
  saveAction: string;
  approvalFormId: string;
};

export function RegistrationSpecialitiesApprovalFields({
  initialSpecialities,
  catalog,
  saveAction,
  approvalFormId,
}: Props) {
  const [selected, setSelected] = useState(initialSpecialities);

  const catalogByLower = useMemo(() => {
    const rows = new Set<string>();
    for (const item of catalog) rows.add(item.name.toLowerCase());
    return rows;
  }, [catalog]);

  const newSpecialityCount = selected.filter(
    (name) => !catalogByLower.has(name.toLowerCase()),
  ).length;

  return (
    <section className="rounded-xl border border-amber-200 bg-white p-5 shadow-sm">
      <input form={approvalFormId} type="hidden" name="specialities_present" value="1" />
      {selected.map((name, index) => (
        <input
          key={`approve-${name}-${index}`}
          form={approvalFormId}
          type="hidden"
          name="specialities"
          value={name}
        />
      ))}

      <form action={saveAction} method="POST">
        {selected.map((name, index) => (
          <input key={`save-${name}-${index}`} type="hidden" name="specialities" value={name} />
        ))}

        <h2 className="mb-2 text-sm font-semibold text-stone-800">Edit specialities</h2>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">
          Artist specialities <span className="font-normal normal-case text-stone-400">(1-3)</span>
        </label>
        <SpecialityPicker
          selected={selected}
          onChange={setSelected}
          catalog={catalog}
          allowCustom
          error={
            selected.length === 0 ? "Pick at least one speciality before approving." : undefined
          }
        />
        {newSpecialityCount > 0 ? (
          <p className="mt-2 text-xs text-amber-700">
            {newSpecialityCount === 1 ? "This new name" : "These new names"} will be added to the
            speciality catalogue with random accessible colours.
          </p>
        ) : null}
        <button
          type="submit"
          className="mt-4 min-h-[44px] rounded-lg bg-stone-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-stone-900"
        >
          Save specialities
        </button>
      </form>
    </section>
  );
}
