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
