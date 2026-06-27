import type { Metadata } from "next";

const title = "Protocol Stats";
const description =
  "Live protocol statistics for ThesisLock: total anchors, unique wallets, contracts deployed, and on-chain activity across the Stacks mainnet contracts.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/stats" },
  openGraph: {
    type: "website",
    siteName: "ThesisLock",
    title: `${title} | ThesisLock`,
    description,
    url: "/stats",
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | ThesisLock`,
    description,
  },
};

export default function StatsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
