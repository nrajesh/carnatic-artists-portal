import { redirect } from "next/navigation";

export default async function AdminReportedPhotosRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort } = await searchParams;
  const target = sort
    ? `/admin/reported-profiles?sort=${encodeURIComponent(sort)}`
    : "/admin/reported-profiles";
  redirect(target);
}
