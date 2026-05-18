"use client";

import { useState, useTransition } from "react";
import { deleteArtistInvitesAction } from "./actions";

type RegistrationDetail = {
  fullName: string;
  status: string;
  submittedAt: Date | string;
};

type InviteDetail = {
  id: string;
  selectedLinkType: string;
  selectedLinkUrl: string;
  createdAt: Date | string;
  registrations: RegistrationDetail[];
};

type InviteStatusesListProps = {
  initialInvites: InviteDetail[];
};

const INVITE_LINK_LABELS: Record<string, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  twitter: "X (Twitter)",
  x: "X (Twitter)",
  website: "Website",
};

function formatLinkLabel(linkType: string): string {
  const normalized = linkType.trim().toLowerCase();
  const target = normalized === "x" ? "twitter" : normalized;
  return INVITE_LINK_LABELS[target] ?? (linkType.trim() || "Link");
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatFullDate(dateInput: Date | string): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  const day = d.getDate();
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${month} ${day}, ${year}`;
}

function formatShortDate(dateInput: Date | string): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  const day = d.getDate();
  const month = MONTHS[d.getMonth()];
  return `${month} ${day}`;
}

export function InviteStatusesList({ initialInvites }: InviteStatusesListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const toggleSelectAll = () => {
    if (selectedIds.size === initialInvites.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(initialInvites.map((invite) => invite.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete the ${selectedIds.size} selected invite(s)?`)) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteArtistInvitesAction(Array.from(selectedIds));
        setSelectedIds(new Set());
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to delete invites.");
      }
    });
  };

  const allSelected = initialInvites.length > 0 && selectedIds.size === initialInvites.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < initialInvites.length;

  return (
    <div className="space-y-4">
      {/* Bulk actions banner */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-4 shadow-sm backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-semibold text-red-900">
              Selected {selectedIds.size} invite{selectedIds.size === 1 ? "" : "s"}
            </span>
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={handleDeleteSelected}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Delete Selected</span>
              </>
            )}
          </button>
        </div>
      )}

      {initialInvites.length === 0 ? (
        <p className="text-sm text-stone-500 text-center py-6">
          You haven't generated any invite links yet. Use the share button above to create one!
        </p>
      ) : (
        <>
          {/* DESKTOP TABLE VIEW */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm text-stone-600">
              <thead className="border-b border-stone-100 text-xs uppercase tracking-wider text-stone-400">
                <tr>
                  <th className="pb-3 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected;
                      }}
                      onChange={toggleSelectAll}
                      className="h-4.5 w-4.5 rounded border-stone-300 text-amber-600 accent-amber-700 cursor-pointer"
                    />
                  </th>
                  <th className="pb-3 font-semibold">Featured Link</th>
                  <th className="pb-3 font-semibold">Created At</th>
                  <th className="pb-3 font-semibold">Signups via Invite</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {initialInvites.map((invite) => {
                  const checked = selectedIds.has(invite.id);
                  return (
                    <tr
                      key={invite.id}
                      className={`align-top transition-colors ${
                        checked ? "bg-amber-50/30" : "hover:bg-stone-50/40"
                      }`}
                    >
                      <td className="py-4">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelectOne(invite.id)}
                          className="h-4.5 w-4.5 rounded border-stone-300 text-amber-600 accent-amber-700 cursor-pointer"
                        />
                      </td>
                      <td className="py-4 pr-4">
                        <div className="font-semibold text-stone-800">
                          {formatLinkLabel(invite.selectedLinkType)}
                        </div>
                        <div className="mt-0.5 truncate text-xs text-stone-400 max-w-[240px]">
                          {invite.selectedLinkUrl}
                        </div>
                      </td>
                      <td className="py-4 text-stone-500">
                        {formatFullDate(invite.createdAt)}
                      </td>
                      <td className="py-4 pl-4">
                        {invite.registrations.length === 0 ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-500">
                            <span className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-pulse" />
                            No signups yet (Active)
                          </span>
                        ) : (
                          <div className="space-y-2">
                            <div className="inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-2.5 py-1 text-xs font-bold text-green-700 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                              </span>
                              {invite.registrations.length} Signup{invite.registrations.length === 1 ? "" : "s"}
                            </div>
                            <div className="space-y-1.5 pl-1">
                              {invite.registrations.map((reg, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs">
                                  <span className="font-semibold text-stone-700">{reg.fullName}</span>
                                  <span
                                    className={`inline-flex items-center rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                                      reg.status === "approved"
                                        ? "bg-green-100 text-green-800"
                                        : reg.status === "rejected"
                                          ? "bg-red-100 text-red-800"
                                          : "bg-amber-100 text-amber-800"
                                    }`}
                                  >
                                    {reg.status.charAt(0).toUpperCase() + reg.status.slice(1)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS VIEW (NO HORIZONTAL SCROLL) */}
          <div className="block md:hidden space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleSelectAll}
                  className="h-4.5 w-4.5 rounded border-stone-300 text-amber-600 accent-amber-700 cursor-pointer"
                />
                <span>Select All Invites</span>
              </label>
            </div>
            {initialInvites.map((invite) => {
              const checked = selectedIds.has(invite.id);
              return (
                <div
                  key={invite.id}
                  className={`rounded-2xl border p-4 shadow-sm transition-all ${
                    checked
                      ? "border-amber-400 bg-amber-50/40"
                      : "border-stone-200 bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSelectOne(invite.id)}
                      className="mt-1 h-4.5 w-4.5 rounded border-stone-300 text-amber-600 accent-amber-700 cursor-pointer shrink-0"
                    />
                    <div className="min-w-0 flex-1 space-y-3">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-stone-900 text-base">
                            {formatLinkLabel(invite.selectedLinkType)}
                          </span>
                          <span className="text-xs text-stone-400 shrink-0 font-medium bg-stone-50 px-2 py-0.5 rounded-md border border-stone-100">
                            {formatShortDate(invite.createdAt)}
                          </span>
                        </div>
                        <a
                          href={invite.selectedLinkUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-0.5 block truncate text-xs text-amber-700 hover:text-amber-900 font-medium"
                        >
                          {invite.selectedLinkUrl}
                        </a>
                      </div>

                      <div className="border-t border-dashed border-stone-100 pt-3">
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <span className="block text-xs font-semibold uppercase tracking-wider text-stone-400">
                            Signups via invite:
                          </span>
                          {invite.registrations.length > 0 && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-2.5 py-0.5 text-xs font-bold text-green-700 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                              </span>
                              {invite.registrations.length} Signup{invite.registrations.length === 1 ? "" : "s"}
                            </span>
                          )}
                        </div>

                        {invite.registrations.length === 0 ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-500">
                            <span className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-pulse" />
                            No signups yet (Active)
                          </span>
                        ) : (
                          <div className="space-y-2">
                            {invite.registrations.map((reg, idx) => (
                              <div key={idx} className="flex items-center justify-between gap-2 rounded-xl bg-stone-50/60 p-2 border border-stone-100/50">
                                <span className="font-semibold text-stone-800 text-sm">{reg.fullName}</span>
                                <span
                                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                    reg.status === "approved"
                                      ? "bg-green-50 text-green-700 border border-green-200"
                                      : reg.status === "rejected"
                                        ? "bg-red-50 text-red-700 border border-red-200"
                                        : "bg-amber-50 text-amber-700 border border-amber-200"
                                  }`}
                                >
                                  {reg.status.charAt(0).toUpperCase() + reg.status.slice(1)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
