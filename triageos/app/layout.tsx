import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TriageOS — AI workflow cards for Gmail + Calendar",
  description:
    "Turn every important email into a confirmed next action with Corsair-powered Gmail and Google Calendar workflows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
