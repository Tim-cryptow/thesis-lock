import type { Metadata } from "next";
import HelpClient from "./HelpClient";

export const metadata: Metadata = {
  title: { absolute: "Help Center | ThesisLock" },
  description: "Answers, step-by-step guides, and fixes for common ThesisLock questions.",
  alternates: { canonical: "/help" },
};

export default function HelpPage() {
  return <HelpClient />;
}
