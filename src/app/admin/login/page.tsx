import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { AdminLogin } from "@/components/AdminLogin";

// Cloudflare Pages runs every route on the edge runtime.
export const runtime = "edge";
export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (await isAdmin()) redirect("/admin/activities");
  const { next } = await searchParams;
  // Only a path within the app, so the parameter cannot bounce anyone offsite.
  const target = next?.startsWith("/admin/") ? next : "/admin/activities";
  return <AdminLogin next={target} />;
}
