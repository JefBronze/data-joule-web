import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ReactPlugin } from "@21st-extension/react";
import { TwentyFirstToolbar } from "@21st-extension/toolbar-next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const toolbarConfig = {
  plugins: [ReactPlugin],
};

export const metadata: Metadata = {
  title: "Data Joule — Grid-Interactive AI Compute",
  description:
    "A Raspberry Pi compute node that responds to real OpenADR 3.0 demand-response signals. Watch live wattage and inference status drop in real time.",
  openGraph: {
    title: "Data Joule — Grid-Interactive AI Compute",
    description:
      "Real hardware. Real OpenADR 3.0 signals. Live telemetry from a Raspberry Pi edge node in Montréal.",
    url: "https://data-joule.com",
    siteName: "Data Joule",
    locale: "en_CA",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full bg-[#09090f] text-neutral-100 antialiased">
        {children}
        <TwentyFirstToolbar config={toolbarConfig} />
      </body>
    </html>
  );
}
