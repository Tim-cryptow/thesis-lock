import type { Metadata } from "next";
import VerifyClientLoader from "./VerifyClientLoader";
import { notFound } from "next/navigation";
import JsonLd from "@/app/components/JsonLd";
import { fetchAnchor, fetchBatchAnchor } from "@/lib/hiroAnchor";

type Props = {
  params: Promise<{ hash: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const HEX_64 = /^[0-9a-f]{64}$/;
const STX_PRINCIPAL = /^S[PMNT][0-9A-Z]{5,40}$/;

function pickOwner(value: string | string[] | undefined): string | null {
  if (!value || Array.isArray(value)) return null;
  const upper = value.toUpperCase();
  return STX_PRINCIPAL.test(upper) ? upper : null;
}

function shareImageUrl(hash: string, owner: string | null): string {
  const base = `/v/${hash}/share-image`;
  return owner ? `${base}?owner=${owner}` : base;
}

function canonicalUrl(hash: string, owner: string | null): string {
  return owner ? `/v/${hash}?owner=${owner}` : `/v/${hash}`;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ hash: raw }, sp] = await Promise.all([params, searchParams]);
  const hash = (raw ?? "").toLowerCase();
  const owner = pickOwner(sp.owner);

  const notFoundTitle = "Verify Document";
  const notFoundDescription =
    "Check if a document hash has been anchored on the Stacks blockchain.";

  if (!HEX_64.test(hash)) {
    return {
      title: notFoundTitle,
      description: notFoundDescription,
      alternates: { canonical: `/v/${hash}` },
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

  let single: Awaited<ReturnType<typeof fetchAnchor>> = null;
  try {
    single = await fetchAnchor(hash);
  } catch {
    single = null;
  }

  // An explicit ?owner= means the link is asking about that owner-keyed batch
  // record, so prefer it over a global single anchor with the same hash (the
  // two contracts can carry unrelated records for the same hash). This mirrors
  // the client's preferBatch ordering in VerifyClient.tsx.
  let batch: Awaited<ReturnType<typeof fetchBatchAnchor>> = null;
  if (owner) {
    try {
      batch = await fetchBatchAnchor(hash, owner);
    } catch {
      batch = null;
    }
  }

  const ogImage = shareImageUrl(hash, owner);
  const canonical = canonicalUrl(hash, owner);

  if (batch && owner) {
    const short = `${hash.slice(0, 12)}...`;
    const title = `Verified: ${short}`;
    const description = `Document hash ${hash} was anchored on Stacks block ${batch.stacksBlock} by ${owner} via batch ${batch.batchId}. Verified on-chain.`;
    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        type: "website",
        siteName: "ThesisLock",
        title: `${title} | ThesisLock`,
        description,
        url: canonical,
        images: [{ url: ogImage, width: 1200, height: 630 }],
      },
      twitter: {
        card: "summary_large_image",
        title: `${title} | ThesisLock`,
        description,
        images: [ogImage],
      },
    };
  }

  if (single) {
    const short = `${hash.slice(0, 12)}...`;
    const title = `Verified: ${short}`;
    const description = `Document hash ${hash} was anchored on Stacks block ${single.stacksBlock} by ${single.anchoredBy}. Verified on-chain.`;
    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        type: "website",
        siteName: "ThesisLock",
        title: `${title} | ThesisLock`,
        description,
        url: canonical,
        images: [{ url: ogImage, width: 1200, height: 630 }],
      },
      twitter: {
        card: "summary_large_image",
        title: `${title} | ThesisLock`,
        description,
        images: [ogImage],
      },
    };
  }

  return {
    title: notFoundTitle,
    description: notFoundDescription,
    alternates: { canonical },
    openGraph: {
      type: "website",
      siteName: "ThesisLock",
      title: `${notFoundTitle} | ThesisLock`,
      description: notFoundDescription,
      url: canonical,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${notFoundTitle} | ThesisLock`,
      description: notFoundDescription,
      images: [ogImage],
    },
  };
}

const webPageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Verify Document",
  description: "Check if a document hash has been anchored on the Stacks blockchain.",
};

export default async function Page({ params }: Props) {
  const { hash } = await params;
  // Only the hash format is checked here. A well-formed hash that simply is not
  // anchored still renders the verify view, which explains it is unverified.
  if (!HEX_64.test((hash ?? "").toLowerCase())) {
    notFound();
  }
  return (
    <>
      <JsonLd data={webPageSchema} />
      <VerifyClientLoader />
    </>
  );
}
