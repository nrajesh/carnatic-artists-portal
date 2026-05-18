import type { ReactNode } from "react";

export function StickyFormActions({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="sticky bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-20 min-w-0 pb-2 sm:bottom-[calc(6rem+env(safe-area-inset-bottom))]">
      <div
        className={`rounded-2xl border border-stone-200/90 bg-white/95 p-3 shadow-xl backdrop-blur ${className}`.trim()}
      >
        {children}
      </div>
    </div>
  );
}
