"use client";

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

type CopyProps = {
  textToCopy: string;
  copyLabel: string;
  copiedLabel: string;
};

const Copy = ({ textToCopy, copyLabel, copiedLabel }: CopyProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button onClick={handleCopy} className={styles.copyButton}>
      {copied ? copiedLabel : copyLabel}
    </button>
  );
};
