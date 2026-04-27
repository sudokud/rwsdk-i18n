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
