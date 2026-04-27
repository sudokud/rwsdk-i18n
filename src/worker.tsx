import { render, route } from "rwsdk/router";
import { defineApp } from "rwsdk/worker";

import { Document } from "@/app/document";
import { setCommonHeaders } from "@/app/headers";
import { HomePage } from "@/app/features/home/page";
import {
  getDirection,
  readLocaleCookie,
  resolveLocale,
} from "@/app/features/i18n/server/resolve-locale";
import type { Direction, Locale } from "@/app/features/i18n/types";

export type AppContext = {
  locale?: Locale;
  direction?: Direction;
  country?: string;
};

export default defineApp([
  setCommonHeaders(),
  ({ ctx, request }) => {
    const requestCountry = request.cf?.country;
    const country =
      typeof requestCountry === "string"
        ? requestCountry
        : request.headers.get("CF-IPCountry") || undefined;

    const cookieLocale = readLocaleCookie(request.headers.get("Cookie"));
    const locale = resolveLocale(country, cookieLocale);

    ctx.country = country;
    ctx.locale = locale;
    ctx.direction = getDirection(locale);
  },
  render(Document, [route("/", HomePage)]),
]);
