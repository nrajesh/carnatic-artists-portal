import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Legacy URL: forwards to {@link /dev/error-simulator}.
 */
export default async function DevTriggerErrorRedirect({
  searchParams,
}: {
  searchParams: Promise<{ go?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") {
    redirect("/");
  }

  const { go } = await searchParams;
  if (go === "1") {
    redirect("/dev/error-simulator/segment");
  }
  redirect("/dev/error-simulator");
}
