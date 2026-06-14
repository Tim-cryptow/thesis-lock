import type { Metadata } from "next";
import EmbedClientLoader from "./EmbedClientLoader";

const TITLE = "Embed Verification Badge";
const DESCRIPTION =
  "Get an embeddable badge proving your document is anchored on Stacks";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "ThesisLock",
    title: `${TITLE} | ThesisLock`,
    description: DESCRIPTION,
    url: "/embed",
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | ThesisLock`,
    description: DESCRIPTION,
  },
};

export default function Page() {
  return <EmbedClientLoader />;
}
