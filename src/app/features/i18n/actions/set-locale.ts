"use server";

import { requestInfo } from "rwsdk/worker";
import { DEFAULT_LOCALE, type Locale } from "../types";

export async function setLocale(locale: Locale, redirectTo: string) {
  const safeLocale = locale === "ar" ? "ar" : DEFAULT_LOCALE;
  const safeRedirectTo = redirectTo.startsWith("/") ? redirectTo : "/";

  requestInfo.response.headers.append(
    "Set-Cookie",
    `locale=${safeLocale}; Path=/; HttpOnly; SameSite=Lax; Secure`,
  );
  requestInfo.response.headers.set("Location", safeRedirectTo);

  return new Response(null, {
    status: 303,
    headers: requestInfo.response.headers,
  });
}
