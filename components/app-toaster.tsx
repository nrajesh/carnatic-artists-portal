"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      closeButton
      duration={3600}
      offset={16}
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: "border border-stone-200 bg-white text-stone-900 shadow-xl rounded-2xl",
          title: "text-sm font-semibold text-stone-900",
          description: "text-sm text-stone-500",
          closeButton:
            "border border-stone-200 bg-white text-stone-500 hover:bg-stone-50 hover:text-stone-700",
        },
      }}
    />
  );
}
