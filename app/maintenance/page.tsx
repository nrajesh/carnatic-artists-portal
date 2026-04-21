import type { Metadata } from "next";
import { PortalStatusPage } from "@/components/portal-status-page";

export const metadata: Metadata = {
  title: "Temporarily unavailable",
};

/**
 * Human-friendly 503-style page. Point infra or a rewrite rule here during
 * maintenance (this route is not wired automatically).
 */
export default function MaintenancePage() {
  return <PortalStatusPage variant="unavailable" />;
}
