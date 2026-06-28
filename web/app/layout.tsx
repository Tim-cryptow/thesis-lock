import type { Metadata, Viewport } from "next";
import { Lora, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import SkipToContent from "./components/SkipToContent";
import ErrorBoundary from "./components/ErrorBoundary";
import EnvValidator from "./components/EnvValidator";
import { I18nProvider } from "./components/I18nProvider";
import { ThemeProvider } from "./components/ThemeProvider";
import { TxProvider } from "./components/TxProvider";
import ConfirmProvider from "./components/ConfirmProvider";
import TxToast from "./components/TxToast";
import ClipboardToast from "./components/ClipboardToast";
import KeyboardShortcuts from "./components/KeyboardShortcuts";
import ServiceWorkerRegistration from "./components/ServiceWorkerRegistration";
import InstallPrompt from "./components/InstallPrompt";
import OfflineIndicator from "./components/OfflineIndicator";
import { TourProvider } from "./components/TourProvider";
import CommandPalette from "./components/CommandPalette";
import WhatsNew from "./components/WhatsNew";
import RouteVisitRecorder from "./components/RouteVisitRecorder";
import { LiveProvider } from "./components/LiveProvider";
import LiveTicker from "./components/LiveTicker";
import { NotificationProvider } from "./components/NotificationProvider";
import NotificationBell from "./components/NotificationBell";
import NotificationSound from "./components/NotificationSound";
import PerformanceTracker from "./components/PerformanceTracker";
import PerformanceBanner from "./components/performance/PerformanceBanner";
import AuditLogger from "./components/AuditLogger";
import SettingsLink from "./components/SettingsLink";
import HelpNavLink from "./components/HelpNavLink";
import RecentPages from "./components/RecentPages";
import NavigationTracker from "./components/NavigationTracker";
import BackupReminder from "./components/BackupReminder";
import FavoritesBar from "./components/FavoritesBar";
import Footer from "./components/Footer";
import FavoritesNavLink from "./components/FavoritesNavLink";

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
  applicationName: "ThesisLock",
  authors: [{ name: "ThesisLock" }],
  creator: "ThesisLock",
  publisher: "ThesisLock",
  category: "technology",
  keywords: [
    "document timestamping",
    "proof of existence",
    "Stacks blockchain",
    "Bitcoin",
    "SHA-256",
    "document verification",
    "blockchain notarization",
    "Clarity smart contract",
  ],
  formatDetection: { telephone: false, address: false, email: false },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: "ThesisLock",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    type: "website",
    siteName: "ThesisLock",
    locale: "en_US",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  alternates: {
    types: {
      "application/rss+xml": [
        { url: "/api/feed/rss", title: "ThesisLock RSS" },
        { url: "/changelog/rss", title: "ThesisLock releases" },
      ],
      "application/atom+xml": [{ url: "/api/feed/atom", title: "ThesisLock Atom" }],
    },
  },
  other: {
    "talentapp:project_verification":
      "20612ea82236e7d5496a497d1a0b8365db5f52e3f165bdddee934452fbd947eb23f319049f11231ba4059180e440ea794710df90c355964ab98385391d6a461e",
    "apple-mobile-web-app-capable": "yes",
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
        <I18nProvider>
          <ThemeProvider>
            <TxProvider>
              <ConfirmProvider>
                <OfflineIndicator />
                <SkipToContent />
                <ServiceWorkerRegistration />
                <KeyboardShortcuts />
                <PerformanceTracker />
                <PerformanceBanner />
                <AuditLogger />
                <LiveProvider>
                  <NotificationProvider>
                    <TourProvider>
                      <LiveTicker />
                      <BackupReminder />
                      <NotificationBell />
                      <SettingsLink />
                      <HelpNavLink />
                      <RecentPages />
                      <FavoritesNavLink />
                      <NotificationSound />
                      <FavoritesBar />
                      <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col">
                        <ErrorBoundary>
                          <EnvValidator />
                          {children}
                        </ErrorBoundary>
                      </main>
                      <Footer />
                      <CommandPalette />
                      <WhatsNew />
                      <RouteVisitRecorder />
                      <NavigationTracker />
                    </TourProvider>
                  </NotificationProvider>
                </LiveProvider>
                <TxToast />
                <ClipboardToast />
                <InstallPrompt />
              </ConfirmProvider>
            </TxProvider>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
