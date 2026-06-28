import type { Metadata } from "next";
import FaqClient from "./FaqClient";

export const metadata: Metadata = {
  title: { absolute: "FAQ | ThesisLock" },
  description:
    "Frequently asked questions about anchoring, verification, groups, proof NFTs, and the technical basics.",
  alternates: { canonical: "/help/faq" },
};

export default function FaqPage() {
  return <FaqClient />;
}
