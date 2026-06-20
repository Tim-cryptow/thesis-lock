import type { Metadata } from "next";

const title = "Notifications";
const description =
  "Your unified notification center: transaction confirmations, watchlist updates, new protocol anchors, and group activity in one place, with optional browser push and sound alerts.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    type: "website",
    siteName: "ThesisLock",
    title: `${title} | ThesisLock`,
    description,
    url: "/notifications",
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | ThesisLock`,
    description,
  },
};

export default function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
