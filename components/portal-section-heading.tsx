import { createElement, type ElementType, type ReactNode } from "react";

type PortalSectionHeadingProps = {
  children: ReactNode;
  /** `label` = short uppercase section ribbon (e.g. About). `title` = sentence-case block title (e.g. dashboard). */
  variant?: "label" | "title";
  /** When the parent row already draws the accent rule (e.g. reviews header with actions). */
  textOnly?: boolean;
  className?: string;
  id?: string;
  as?: ElementType;
};

/**
 * App-wide section title styling: sans stack, amber rule, readable size (not `text-xs`).
 */
export function PortalSectionHeading({
  children,
  variant = "label",
  textOnly = false,
  className = "",
  id,
  as = "h2",
}: PortalSectionHeadingProps) {
  const base =
    variant === "label"
      ? textOnly
        ? "portal-section-heading-text"
        : "portal-section-heading"
      : textOnly
        ? "portal-section-heading-title-text"
        : "portal-section-heading-title";

  return createElement(
    as,
    { id, className: `${base} ${className}`.trim() },
    children,
  );
}
