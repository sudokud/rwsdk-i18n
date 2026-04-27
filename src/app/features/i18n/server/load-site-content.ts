import { env } from "cloudflare:workers";
import { requestInfo } from "rwsdk/worker";
import { DEFAULT_LOCALE, type Locale } from "../types";

type SiteContentItem = {
  label: string;
  href?: string;
};

export type SiteContent = {
  hero: {
    title: string;
    subtitle: string;
  };
  sections: {
    nextSteps: {
      title: string;
      items: SiteContentItem[];
    };
    deploy: {
      title: string;
      description: string;
      command: string;
      moreInfoLabel: string;
      moreInfoHref: string;
    };
  };
  actions: {
    language: string;
    switchToArabic: string;
    switchToEnglish: string;
    copy: string;
    copied: string;
  };
};

async function fetchSiteContent(
  baseUrl: string,
  locale: Locale,
): Promise<SiteContent | undefined> {
  const assetUrl = new URL(`/content/${locale}/site.json`, baseUrl);
  const response = await env.ASSETS.fetch(assetUrl);

  if (!response.ok) {
    return undefined;
  }

  return (await response.json()) as SiteContent;
}

export async function loadSiteContent(locale: Locale): Promise<SiteContent> {
  const baseUrl = requestInfo?.request?.url;

  if (!baseUrl) {
    throw new Error("Cannot load site content outside a request lifecycle");
  }

  const content =
    (await fetchSiteContent(baseUrl, locale)) ??
    (locale === DEFAULT_LOCALE
      ? undefined
      : await fetchSiteContent(baseUrl, DEFAULT_LOCALE));

  if (!content) {
    throw new Error(
      `Failed to load site content for locale "${locale}" or fallback "${DEFAULT_LOCALE}"`,
    );
  }

  return content;
}
