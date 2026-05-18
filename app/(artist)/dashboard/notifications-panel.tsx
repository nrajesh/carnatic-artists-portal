"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { PortalSectionHeading } from "@/components/portal-section-heading";
import { showError, showSuccess } from "@/lib/toast";
import type { DashboardNotification } from "@/lib/queries/artists";
import { markAllDashboardNotificationsReadAction } from "./actions";

const PAGE_SIZE = 10;

function notificationIcon(type: string): string {
  if (type === "collab_invite") return "💬";
  if (type.startsWith("connection_")) return "🤝";
  if (type === "feedback") return "⭐";
  if (type === "collab_closed") return "✅";
  return "🔔";
}

export function NotificationsPanel({
  notifications,
}: {
  notifications: DashboardNotification[];
}) {
  const [items, setItems] = useState(notifications);
  const [prevNotifications, setPrevNotifications] = useState(notifications);
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  if (notifications !== prevNotifications) {
    setPrevNotifications(notifications);
    setItems(notifications);
  }

  const unreadCount = items.filter((item) => !item.read).length;
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleItems = items.slice(startIndex, startIndex + PAGE_SIZE);
  const rangeStart = items.length === 0 ? 0 : startIndex + 1;
  const rangeEnd = Math.min(startIndex + PAGE_SIZE, items.length);

  function handleClearAll() {
    if (unreadCount === 0 || isPending) return;

    const previousItems = items;
    setItems((currentItems) => currentItems.map((item) => ({ ...item, read: true })));
    setPage(1);

    startTransition(async () => {
      const result = await markAllDashboardNotificationsReadAction();
      if (!result.ok) {
        setItems(previousItems);
        showError(result.error);
        return;
      }

      showSuccess("All notifications marked as read.");
    });
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-amber-400/70 pb-2">
        <div className="flex flex-wrap items-center gap-3">
          <PortalSectionHeading variant="title" textOnly className="mb-0">
            Notifications
          </PortalSectionHeading>
          <div className="flex items-center gap-2">
            {unreadCount > 0 ? (
              <span className="inline-block rounded-full bg-amber-600 px-2 py-0.5 text-xs font-bold text-white">
                {unreadCount}
              </span>
            ) : (
              <span className="inline-block rounded-full bg-stone-200 px-2 py-0.5 text-xs font-semibold text-stone-600">
                0
              </span>
            )}
            <button
              type="button"
              onClick={handleClearAll}
              disabled={unreadCount === 0 || isPending}
              className="text-xs font-semibold text-amber-700 underline underline-offset-2 transition-colors hover:text-amber-900 disabled:cursor-not-allowed disabled:text-stone-400"
            >
              {isPending ? "Clearing..." : "Clear all"}
            </button>
          </div>
        </div>

        {items.length > 10 ? (
          <p className="text-xs text-stone-500">
            Showing {rangeStart}-{rangeEnd} of {items.length}
          </p>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="text-sm italic text-stone-400">No notifications yet.</p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {visibleItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={`flex gap-3 rounded-lg border p-3 transition-all hover:shadow-sm ${
                  item.read
                    ? "border-stone-200 bg-white hover:bg-stone-50"
                    : "border-amber-200 bg-amber-50 hover:border-amber-300"
                }`}
              >
                <span className="mt-0.5 flex-shrink-0 text-lg">{notificationIcon(item.type)}</span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm leading-snug ${
                      item.read ? "text-stone-600" : "font-medium text-stone-800"
                    }`}
                  >
                    {item.text}
                  </p>
                  <p className="mt-0.5 text-xs text-stone-400">{item.time}</p>
                </div>
                <span className="self-center flex-shrink-0 text-sm text-stone-300">→</span>
              </Link>
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
              <p className="text-xs text-stone-500">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={currentPage === 1}
                  className="min-h-[44px] rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-amber-300 hover:bg-amber-50 disabled:cursor-not-allowed disabled:text-stone-400"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={currentPage === totalPages}
                  className="min-h-[44px] rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-amber-300 hover:bg-amber-50 disabled:cursor-not-allowed disabled:text-stone-400"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
