# Geo-Aware I18n in RedwoodSDK

This guide shows how to add server-rendered internationalization to a RedwoodSDK app running on Cloudflare.

The goal is to resolve the user's locale on the server before rendering HTML. A cookie stores the user's explicit language choice, Cloudflare geo data provides a default when there is no override, and RedwoodSDK renders the correct `lang`, `dir`, and localized content on the first response.

This is a defaulting strategy, not language detection. Country is only a heuristic. If your product needs a stronger fallback, add `Accept-Language` or an account-level preference ahead of geo.

This approach keeps the runtime small, avoids client-side language switching after hydration, and fits naturally into RedwoodSDK's middleware, request context, and server rendering model.

By the end of this guide, your app will:

- resolve locale from a cookie or Cloudflare country data
- store locale and direction in request context
- set `lang` and `dir` on the document
- render localized content on the server
- let users override the default locale with a language switch

## Resolve locale and direction in middleware

The Worker is where this guide makes the locale decision.

On Cloudflare, that gives you the right place to do it: close to the request, before rendering starts, and without relying on client-side code. By the time RedwoodSDK renders the page, the request already knows which locale and text direction it should use.

In this step, the middleware does the full resolution work:

- read the user's country from Cloudflare
- read a locale override from a cookie
- choose the effective locale
- derive the text direction
- attach everything to request context

In this repo, the locale helpers live in `src/app/features/i18n/server/resolve-locale.ts`, the locale types live in `src/app/features/i18n/types.ts`, and the Worker wires them together in `src/worker.tsx`:

```tsx
import { render, route } from "rwsdk/router";
import { defineApp } from "rwsdk/worker";

import { Document } from "@/app/document";
import { HomePage } from "@/app/features/home/page";
import { setCommonHeaders } from "@/app/headers";
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
    const direction = getDirection(locale);

    ctx.country = country;
    ctx.locale = locale;
    ctx.direction = direction;
  },
  render(Document, [route("/", HomePage)]),
]);
```

This makes the Worker the single source of truth for locale resolution.

The `ARABIC_COUNTRIES` list in this demo is application policy, not a universal language map. Treat it as one example of a fallback rule, not a production-ready truth table for all Arabic-speaking users.

That is the important design choice in this guide. Pages should not guess the locale, and client components should not be responsible for deciding document direction. Cloudflare gives you request metadata at the edge, and RedwoodSDK middleware gives you a clean place to turn that into request context before the response is rendered.

After this step, every request already carries:

- `country`
- `locale`
- `direction`

The next chapter will consume those values in the document so the HTML shell renders with the correct `lang` and `dir` from the first response.

## Set `lang` and `dir` in the document

Now that the Worker resolves `locale` and `direction`, the next step is to apply them at the document level.

This is where they belong. `lang` and `dir` are document concerns, not component concerns. If the locale is already known in middleware, the HTML shell should reflect it before the page is streamed to the browser.

Update `src/app/document.tsx` to read from request context:

```tsx
import { requestInfo } from "rwsdk/worker";
import { DEFAULT_LOCALE } from "@/app/features/i18n/types";

export const Document: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const locale = requestInfo?.ctx.locale ?? DEFAULT_LOCALE;
  const direction = requestInfo?.ctx.direction ?? "ltr";

  return (
    <html lang={locale} dir={direction}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>@redwoodjs/starter-minimal</title>
        <link rel="modulepreload" href="/src/client.tsx" />
      </head>
      <body>
        {children}
        <script>import("/src/client.tsx")</script>
      </body>
    </html>
  );
};
```

At this point, the document is no longer hardcoded to English left-to-right markup. It reflects the values resolved by middleware for the current request.

That matters for more than presentation:

- screen readers get the correct language metadata
- right-to-left layouts render correctly from the start
- the server sends the correct HTML on the first response
- the app avoids patching document direction on the client after hydration

Cloudflare makes this especially effective here. Because the locale is resolved at the edge before RedwoodSDK starts rendering, the document is correct from the first byte of HTML.

The next chapter moves the page content itself out of hardcoded component strings and into localized content files.

## Move content out of components

With locale and direction resolved on the server, the next step is to move translatable content out of `Welcome.tsx`.

This keeps the component focused on rendering and gives the app a clean content boundary. It also fits this kind of RedwoodSDK project well: the content stays in the repository, remains easy to edit, and does not get mixed into application code.

For this guide, store localized content as JSON static assets:

```txt
public/
  content/
    en/
      site.json
    ar/
      site.json
```

Putting the files under `public/` keeps them as normal web assets. In a Cloudflare Worker, the right way to read those assets from server-rendered code is through the `ASSETS` binding, not by calling `fetch()` back into your own Worker.

This is a clean boundary, not the absolute fastest path. For two tiny locale payloads, importing the content directly into the Worker bundle is faster because it avoids an asset fetch and JSON parse. The asset approach is still a good default for a guide because it keeps content separate from components and leaves a straight path to KV, R2, or a CMS later.

For example, `public/content/en/site.json`:

```json
{
  "hero": {
    "title": "Welcome to RedwoodSDK",
    "subtitle": "You’ve just installed the starter project. Here’s what to do next."
  },
  "sections": {
    "nextSteps": {
      "title": "Next steps",
      "items": [
        {
          "label": "Read the Quick Start to learn the basics.",
          "href": "https://docs.rwsdk.com/getting-started/quick-start/"
        },
        {
          "label": "Explore React Server Components and Server Functions in the Docs.",
          "href": "https://docs.rwsdk.com/"
        },
        {
          "label": "Join the community to ask questions and share what you’re building."
        }
      ]
    },
    "deploy": {
      "title": "Deploy to Cloudflare",
      "description": "RedwoodSDK runs on Cloudflare Workers. Here’s the quickest way to deploy.",
      "command": "pnpm release",
      "moreInfoLabel": "Cloudflare deployment guide",
      "moreInfoHref": "https://docs.rwsdk.com/core/hosting/"
    }
  },
  "actions": {
    "language": "Language",
    "switchToArabic": "العربية",
    "switchToEnglish": "English",
    "copy": "Copy",
    "copied": "Copied!"
  }
}
```

Create the same structure in `public/content/ar/site.json`, with translated values and the same keys.

Then add a small loader that fetches the correct JSON for the resolved locale through the Cloudflare asset binding:

```ts
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
```

This is a better fit for Cloudflare and for the web platform.

- the content is served as a static asset
- the loader reads assets through Cloudflare's `ASSETS` binding
- the rendering layer does not recurse back through the Worker to get its own files
- the same loader boundary can later point at KV, R2, or a CMS

After this step, the component tree does not need to know where content comes from. It only needs the content for the resolved locale.

For production, decide what should happen when content is missing. This demo throws immediately so missing assets fail loudly. A user-facing app may prefer to fall back to `en` and log the missing locale instead.

## Render localized content on the server

Once content lives in locale-specific JSON assets, the page can render the correct content directly on the server.

This is the point where the pieces come together:

- middleware resolves the locale
- the page reads that locale from request context
- the page fetches the matching content
- the component renders already-localized HTML

Update `src/app/features/home/page.tsx` so it becomes the server entrypoint for localized content:

```tsx
import { requestInfo } from "rwsdk/worker";

import { LanguageSwitch } from "@/app/features/i18n/components/language-switch";
import { loadSiteContent } from "@/app/features/i18n/server/load-site-content";
import { DEFAULT_LOCALE } from "@/app/features/i18n/types";
import { Welcome } from "./components/welcome";

export const HomePage = async () => {
  const locale = requestInfo?.ctx.locale ?? DEFAULT_LOCALE;
  const content = await loadSiteContent(locale);

  return (
    <Welcome
      content={content}
      locale={locale}
      switcher={
        <LanguageSwitch
          locale={locale}
          label={content.actions.language}
          switchToArabicLabel={content.actions.switchToArabic}
          switchToEnglishLabel={content.actions.switchToEnglish}
        />
      }
    />
  );
};
```

Then update `Welcome` so it renders the content it receives instead of defining the copy itself:

```tsx
import { useState } from "react";
import type { ReactNode } from "react";
import type { SiteContent } from "@/app/features/i18n/server/load-site-content";
import type { Locale } from "@/app/features/i18n/types";
import styles from "./welcome.module.css";

type WelcomeProps = {
  content: SiteContent;
  locale: Locale;
  switcher: ReactNode;
};

export const Welcome = ({ content, locale, switcher }: WelcomeProps) => {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.controls}>
          <span className={styles.localeBadge}>{locale.toUpperCase()}</span>
          <div className={styles.languageSwitch}>{switcher}</div>
        </div>
        <h1 className={styles.title}>{content.hero.title}</h1>
        <p className={styles.subtitle}>{content.hero.subtitle}</p>
      </header>

      <main>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{content.sections.nextSteps.title}</h2>
          <ol className={styles.list}>
            {content.sections.nextSteps.items.map((item) => (
              <li key={item.label}>
                {item.href ? (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.link}
                  >
                    {item.label}
                  </a>
                ) : (
                  item.label
                )}
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{content.sections.deploy.title}</h2>
          <p>{content.sections.deploy.description}</p>
          <div className={styles.codeBlock}>
            <span className={styles.codePrompt}>$</span>
            <code className={styles.code}>{content.sections.deploy.command}</code>
            <Copy
              textToCopy={content.sections.deploy.command}
              copyLabel={content.actions.copy}
              copiedLabel={content.actions.copied}
            />
          </div>
          <p>
            <a
              href={content.sections.deploy.moreInfoHref}
              target="_blank"
              rel="noreferrer"
              className={styles.link}
            >
              {content.sections.deploy.moreInfoLabel}
            </a>
          </p>
        </section>
      </main>
    </div>
  );
};
```

At this point, the server is rendering the correct locale before the browser hydrates anything.

That is the key behavior this guide is aiming for. The client is no longer responsible for deciding which language to display. Cloudflare provides the request signal, RedwoodSDK resolves locale in middleware, and the page renders the right content on the first response.

The only client-side behavior left in this page is UI interaction, like copying the deployment command or sending a locale preference. The translation decision itself stays on the server.

## Add a language switch with a server function

At this point, the app already knows how to render the correct locale on the server.

The language switch should not replace that logic. Its job is much smaller: store the user's explicit preference in a cookie, so the next request uses that locale instead of the Cloudflare geo default.

RedwoodSDK server functions are a good fit for this. They run on the server, have access to `requestInfo`, and can set response headers directly.

Create a server function for the locale preference:

```ts
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
```

Then call that function from a small client component:

```tsx
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
```

This keeps the responsibility split clean:

- Cloudflare geo chooses the default locale
- the cookie stores the user's override
- middleware resolves the effective locale for each request
- the page renders the correct HTML on the server

That is the main design rule for this guide: the client can express preference, but the server remains the source of truth for the rendered locale.

## Final request flow

At this point, the app has a complete server-first i18n flow built on RedwoodSDK and Cloudflare.

Each request follows the same path:

1. the request reaches your Cloudflare Worker
2. middleware reads the `locale` cookie, if it exists
3. if there is no cookie, middleware uses Cloudflare country data to choose a default locale
4. middleware derives the matching text direction
5. `locale`, `direction`, and `country` are attached to request context
6. the document reads `locale` and `direction` and sets `<html lang>` and `<html dir>`
7. the page loads the correct localized content
8. RedwoodSDK renders the correct HTML on the server
9. if the user changes language, a server function writes a cookie and the next request uses that override

In practice, the flow looks like this:

```txt
Request
  -> Cloudflare country signal
  -> middleware resolves locale
  -> request context stores locale + direction
  -> document sets lang + dir
  -> page fetches localized JSON content
  -> RedwoodSDK renders localized HTML
  -> client hydrates interactive controls
```

This model fits RedwoodSDK especially well because it keeps rendering decisions on the server, where the framework already has access to the request and response lifecycle.

It also plays to Cloudflare's strengths:

- locale defaults can be chosen at the edge
- no browser geolocation prompt is needed
- the first HTML response is already correct
- document metadata and page content stay in sync

The result is a simpler and more reliable i18n setup:

- middleware owns locale resolution
- the document owns `lang` and `dir`
- static JSON assets own translatable copy
- pages render the correct locale on the server
- the client only stores preference changes

That gives you correct first render behavior, better accessibility, cleaner SEO signals, and a straightforward path to expand from repository content to a CMS later without changing the rendering model.

## Verify the flow

Before you call the guide done, verify the behavior from the outside:

1. Request the page with no cookie and a non-Arabic country, then confirm the document starts with `<html lang="en" dir="ltr">`.
2. Request the page with no cookie and an Arabic-country header such as `CF-IPCountry: AE`, then confirm the document starts with `<html lang="ar" dir="rtl">`.
3. Trigger the language switch and confirm the response includes `Set-Cookie: locale=...` and a `303` redirect.
4. Repeat the next request with the cookie present and confirm the cookie wins over the geo default.

For the request-level checks:

```bash
curl -s http://localhost:5173/ | rg '<html'
curl -s -H 'CF-IPCountry: AE' http://localhost:5173/ | rg '<html'
curl -s -H 'CF-IPCountry: AE' --cookie 'locale=en' http://localhost:5173/ | rg '<html'
```

For the language switch itself, use the browser and confirm in DevTools that the server-function response writes `Set-Cookie: locale=...` and returns a `303` redirect. RedwoodSDK serializes that request for you, so the rendered `lang` and `dir` plus the cookie are the important contract to verify.
