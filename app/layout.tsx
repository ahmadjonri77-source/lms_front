import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IT Live Academy – Kirish",
  description: "IT Live Academy LMS platformasiga kiring",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz">
      <body>{children}</body>
    </html>
  );
}
