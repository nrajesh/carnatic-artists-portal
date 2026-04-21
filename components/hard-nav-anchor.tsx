"use client";

import type { MouseEvent, ReactNode } from "react";

type Props = {
  href: string;
  className?: string;
  children: ReactNode;
};

/**
 * Same-origin navigation via `location.assign`, so the document fully reloads.
 * Needed after {@link app/error.tsx} because client `<Link>` transitions can
 * leave the error UI mounted or bounce via history to the failing URL.
 */
export function HardNavAnchor({ href, className, children }: Props) {
  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    if (e.button !== 0) return;
    const target = e.currentTarget.getAttribute("target");
    if (target && target.toLowerCase() !== "_self") return;
    e.preventDefault();
    window.location.assign(href);
  }

  return (
    <a href={href} className={className} onClick={onClick}>
      {children}
    </a>
  );
}
