"use client";

import { useTransition } from "react";
import { setLocale } from "../actions/set-locale";
import type { Locale } from "../types";

type LanguageSwitchProps = {
  locale: Locale;
  label: string;
  switchToArabicLabel: string;
  switchToEnglishLabel: string;
};

export function LanguageSwitch({
  locale,
  label,
  switchToArabicLabel,
  switchToEnglishLabel,
}: LanguageSwitchProps) {
  const [isPending, startTransition] = useTransition();
  const nextLocale = locale === "ar" ? "en" : "ar";
  const nextLabel =
    nextLocale === "ar" ? switchToArabicLabel : switchToEnglishLabel;

  return (
    <button
      type="button"
      disabled={isPending}
      aria-label={label}
      onClick={() => {
        startTransition(async () => {
          await setLocale(
            nextLocale,
            window.location.pathname + window.location.search,
          );
        });
      }}
    >
      {nextLabel}
    </button>
  );
}
