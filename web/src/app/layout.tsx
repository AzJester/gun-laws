import type { Metadata } from "next";

import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gunlawmap.example";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "GunLawMap — Interactive US Firearm Law Map",
    template: "%s — GunLawMap",
  },
  description:
    "An interactive US map of state firearm laws. Informational only, not legal advice.",
  openGraph: {
    type: "website",
    siteName: "GunLawMap",
    title: "GunLawMap — Interactive US Firearm Law Map",
    description:
      "An interactive US map of state firearm laws. Informational only, not legal advice.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary",
    title: "GunLawMap — Interactive US Firearm Law Map",
    description:
      "An interactive US map of state firearm laws. Informational only, not legal advice.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
