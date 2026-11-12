import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EcoPartnerHub | Collaborative Platform",
  description: "EcoPartnerHub - Sustainable team development and partner hub",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
