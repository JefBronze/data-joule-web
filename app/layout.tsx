import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Chakra_Petch, DM_Sans, IBM_Plex_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { LocaleProvider } from "./lib/i18n";
import { TitleUpdater } from "./components/TitleUpdater";
import "./globals.css";

const display = Chakra_Petch({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-display",
});

const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});


export const viewport: Viewport = {
  themeColor: "#09090f",
};

type Locale = "en" | "pt" | "fr";

const OG_LOCALE: Record<Locale, string> = {
  en: "en_CA",
  pt: "pt_BR",
  fr: "fr_CA",
};

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const raw = cookieStore.get("dj-locale")?.value;
  const locale: Locale = raw === "pt" ? "pt" : raw === "fr" ? "fr" : "en";

  return {
    title: "Data Joule — Grid Response, Chainlink-Settled",
    description:
      "An AI edge node runs live LLM inference and responds to real OpenADR 3.0 demand-response signals. Four power tiers, five utility sources, live telemetry from Montréal.",
    keywords: [
      "OpenADR", "demand response", "AI edge compute", "grid interactive",
      "LLM inference", "demand flexibility", "Internet of Energy", "edge AI",
    ],
    alternates: {
      canonical: "https://data-joule.com",
    },
    icons: {
      icon: [
        { url: `/favicon-${locale}.svg`, type: "image/svg+xml" },
        { url: `/favicon-${locale}-32.png`, sizes: "32x32", type: "image/png" },
        { url: `/icon-${locale}-192.png`, sizes: "192x192", type: "image/png" },
      ],
      apple: `/apple-touch-icon-${locale}.png`,
    },
    openGraph: {
      title: "Data Joule — Grid Response, Chainlink-Settled",
      description:
        "Real hardware. Real OpenADR 3.0 signals. An AI edge node throttles its LLM under grid stress — live telemetry from Montréal.",
      url: "https://data-joule.com",
      siteName: "Data Joule",
      locale: OG_LOCALE[locale],
      type: "website",
    },
    twitter: {
      card: "summary",
      title: "Data Joule — Grid Response, Chainlink-Settled",
      description:
        "An AI edge node runs live LLM inference and responds to real OpenADR 3.0 demand-response signals. Four power tiers, five utility sources, live telemetry.",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full`}
    >
      <body suppressHydrationWarning className="min-h-full bg-(--background) text-neutral-100 antialiased font-[family-name:var(--font-body)]">
        <LocaleProvider>
          <TitleUpdater />
          {children}
        </LocaleProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
