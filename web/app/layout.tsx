import type { Metadata, Viewport } from "next";
import { Lora, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import SkipToContent from "./components/SkipToContent";
import { ThemeProvider } from "./components/ThemeProvider";
import { TxProvider } from "./components/TxProvider";
import TxToast from "./components/TxToast";

// Runs before first paint to apply the saved (or system) theme, avoiding a
// flash of the wrong theme before React hydrates. Inlined as a string so it
// executes synchronously in <head>.
const THEME_INIT_SCRIPT = `(function(){try{var m=localStorage.getItem("thesislock.theme");var d=m==="dark"||((m==="system"||!m)&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

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

const SITE_TITLE = "ThesisLock - Document Timestamping on Stacks";
const SITE_DESCRIPTION =
  "Anchor document hashes on the Stacks blockchain. Permanent, verifiable, private.";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://thesis-lock.vercel.app");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: SITE_TITLE,
    template: "%s | ThesisLock",
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "ThesisLock",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  other: {
    "talentapp:project_verification":
      "20612ea82236e7d5496a497d1a0b8365db5f52e3f165bdddee934452fbd947eb23f319049f11231ba4059180e440ea794710df90c355964ab98385391d6a461e",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAF7" },
    { media: "(prefers-color-scheme: dark)", color: "#121212" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${lora.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <TxProvider>
            <SkipToContent />
            <main
              id="main-content"
              tabIndex={-1}
              className="flex-1 flex flex-col"
            >
              {children}
            </main>
            <TxToast />
          </TxProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
