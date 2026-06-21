import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "GunLawMap — Interactive US Firearm Law Map",
  description:
    "An interactive US map of state firearm laws. Informational only, not legal advice.",
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
