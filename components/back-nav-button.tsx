"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  siteNavIconBadgeClass,
  siteNavPillClass,
} from "@/components/site-nav-styles";

export function BackNavButton({ isAuthenticated }: { isAuthenticated?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();

  // Drop the back button in home page, and do NOT display it when user is NOT logged in.
  if (pathname === "/" || !isAuthenticated) {
    return null;
  }

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    // Full navigation so we recover cleanly from error boundaries (soft push can stick on the error UI).
    window.location.assign("/");
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`${siteNavPillClass} cursor-pointer`}
      aria-label="Go back"
    >
      <span aria-hidden="true" className={siteNavIconBadgeClass}>
        ←
      </span>
    </button>
  );
}
