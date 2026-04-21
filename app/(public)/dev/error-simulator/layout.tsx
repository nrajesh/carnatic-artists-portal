import { redirect } from "next/navigation";

/**
 * Entire `/dev/error-simulator` tree is development-only.
 */
export default function DevErrorSimulatorLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") {
    redirect("/");
  }
  return children;
}
