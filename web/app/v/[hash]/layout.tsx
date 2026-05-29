import type { Metadata } from "next";
import { fetchAnchor } from "@/lib/hiroAnchor";

type Props = {
  params: Promise<{ hash: string }>;
};

const HEX_64 = /^[0-9a-f]{64}$/;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { hash: raw } = await params;
  const hash = (raw ?? "").toLowerCase();

  const notFoundTitle = "Verify Document";
  const notFoundDescription =
    "Check if a document hash has been anchored on the Stacks blockchain.";

  if (!HEX_64.test(hash)) {
    return {
      title: notFoundTitle,
      description: notFoundDescription,
      openGraph: {
        type: "website",
        siteName: "ThesisLock",
        title: notFoundTitle,
        description: notFoundDescription,
        url: `/v/${hash}`,
      },
      twitter: {
        card: "summary_large_image",
        title: notFoundTitle,
        description: notFoundDescription,
      },
    };
  }

  let anchor: Awaited<ReturnType<typeof fetchAnchor>> = null;
  try {
    anchor = await fetchAnchor(hash);
  } catch {
    anchor = null;
  }

  if (anchor) {
    const short = `${hash.slice(0, 12)}...`;
    const title = `Verified: ${short}`;
    const description = `Document hash ${hash} was anchored on Stacks block ${anchor.stacksBlock} by ${anchor.anchoredBy}. Verified on-chain.`;
    return {
      title,
      description,
      openGraph: {
        type: "website",
        siteName: "ThesisLock",
        title: `${title} | ThesisLock`,
        description,
        url: `/v/${hash}`,
      },
      twitter: {
        card: "summary_large_image",
        title: `${title} | ThesisLock`,
        description,
      },
    };
  }

  return {
    title: notFoundTitle,
    description: notFoundDescription,
    openGraph: {
      type: "website",
      siteName: "ThesisLock",
      title: `${notFoundTitle} | ThesisLock`,
      description: notFoundDescription,
      url: `/v/${hash}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${notFoundTitle} | ThesisLock`,
      description: notFoundDescription,
    },
  };
}

export default function VerifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
