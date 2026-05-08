import type { Metadata, Viewport } from "next";
import { Chakra_Petch, DM_Sans, IBM_Plex_Mono } from "next/font/google";
import { ReactPlugin } from "@21st-extension/react";
import { TwentyFirstToolbar } from "@21st-extension/toolbar-next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { LocaleProvider } from "./lib/i18n";
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

const toolbarConfig = {
  plugins: [ReactPlugin],
};

export const viewport: Viewport = {
  themeColor: "#09090f",
};

export const metadata: Metadata = {
  title: "Data Joule — Grid-Interactive AI Compute",
  description:
    "A Raspberry Pi runs live LLM inference and responds to real OpenADR 3.0 demand-response signals. Four power tiers, five utility sources, live telemetry from Montréal.",
  keywords: [
    "OpenADR", "demand response", "AI edge compute", "grid interactive",
    "Raspberry Pi", "LLM inference", "demand flexibility", "Internet of Energy",
  ],
  alternates: {
    canonical: "https://data-joule.com",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.ico",
  },
  openGraph: {
    title: "Data Joule — Grid-Interactive AI Compute",
    description:
      "Real hardware. Real OpenADR 3.0 signals. A Raspberry Pi throttles its LLM under grid stress — live telemetry from Montréal.",
    url: "https://data-joule.com",
    siteName: "Data Joule",
    locale: "en_CA",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Data Joule — Grid-Interactive AI Compute",
    description:
      "A Raspberry Pi runs live LLM inference and responds to real OpenADR 3.0 demand-response signals. Four power tiers, five utility sources, live telemetry.",
  },
};

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
        <LocaleProvider>{children}</LocaleProvider>
        {process.env.NODE_ENV === "development" && (
          <TwentyFirstToolbar config={toolbarConfig} />
        )}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
