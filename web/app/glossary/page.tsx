import type { Metadata } from "next";
import GlossaryClient from "./GlossaryClient";

const title = "Glossary";
const description =
  "Plain-English definitions of the technical terms ThesisLock uses: hashes, blocks, principals, anchors, proof NFTs, and more.";

export function generateMetadata(): Metadata {
  return {
    title,
    description,
    openGraph: {
      type: "website",
      siteName: "ThesisLock",
      title: `${title} | ThesisLock`,
      description,
      url: "/glossary",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ThesisLock`,
      description,
    },
  };
}

export default function Page() {
  return <GlossaryClient />;
}
