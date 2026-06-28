import type { Metadata } from "next";
import ErrorPage, { type ErrorSuggestion } from "./components/ErrorPage";
import { CompassIcon } from "./components/ErrorIcons";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you are looking for does not exist or may have moved.",
};

const SUGGESTIONS: ErrorSuggestion[] = [
  {
    href: "/anchor",
    label: "Anchor a document",
    hint: "Timestamp a file on chain",
  },
  {
    href: "/search",
    label: "Search anchors",
    hint: "By hash, wallet, or label",
  },
  { href: "/feed", label: "Recent anchors", hint: "The live protocol feed" },
  { href: "/help", label: "Visit the help center", hint: "FAQ, guides, and fixes" },
  { href: "/", label: "Go home", hint: "The ThesisLock overview" },
];

export default function NotFound() {
  return (
    <ErrorPage
      icon={<CompassIcon />}
      code="404"
      title="Page not found"
      description="The page you are looking for does not exist or may have moved."
      showSearch
      suggestions={SUGGESTIONS}
    />
  );
}
