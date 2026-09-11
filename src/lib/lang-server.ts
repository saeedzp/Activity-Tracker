import { cookies } from "next/headers";
import { LANG_COOKIE, langOf, type Lang } from "./i18n";

/** The language this request should be answered in. */
export async function currentLang(): Promise<Lang> {
  return langOf((await cookies()).get(LANG_COOKIE)?.value);
}
