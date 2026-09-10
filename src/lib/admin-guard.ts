import { redirect } from "next/navigation";
import { isAdmin } from "./admin";

/**
 * The admin screens sit behind the passcode, and nothing else.
 *
 * They used to also demand an employee session, which sent anyone opening
 * /admin to the employee login and never showed the passcode screen at all —
 * the gate was invisible and looked like a broken link. The passcode is the
 * stronger credential anyway: an employee number is written on a badge.
 */
export async function requireAdmin(path: string) {
  if (!(await isAdmin())) redirect(`/admin/login?next=${encodeURIComponent(path)}`);
}
