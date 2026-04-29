import type { Metadata } from "next";
import { Lora, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ThesisLock",
  description:
    "Permanent, verifiable timestamps for your work. Anchor a SHA-256 hash on Bitcoin via Stacks without ever sharing the file.",
  other: {
    "talentapp:project_verification":
      "20612ea82236e7d5496a497d1a0b8365db5f52e3f165bdddee934452fbd947eb23f319049f11231ba4059180e440ea794710df90c355964ab98385391d6a461e",
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
      className={`${lora.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
