import type { Metadata } from "next";
import { PortalStatusPage } from "@/components/portal-status-page";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return <PortalStatusPage variant="not-found" />;
}
