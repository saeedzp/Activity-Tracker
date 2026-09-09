import { redirect } from "next/navigation";
import { currentSession } from "./session";
import { isAdmin } from "./admin";

/**
 * Both doors an admin screen sits behind: a signed-in employee, and the admin
 * passcode. Returns the session so the caller does not fetch it twice.
 */
export async function requireAdmin(path: string) {
  const session = await currentSession();
  if (!session) redirect("/");
  if (!(await isAdmin())) redirect(`/admin/login?next=${encodeURIComponent(path)}`);
  return session;
}
