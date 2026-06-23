import ErrorPage, { type ErrorSuggestion } from "@/app/components/ErrorPage";

const SUGGESTIONS: ErrorSuggestion[] = [
  {
    href: "/anchor",
    label: "Try verifying a document",
    hint: "Hash and check a file in your browser",
  },
  {
    href: "/search",
    label: "Search for a hash",
    hint: "By hash, wallet, or label",
  },
];

export default function VerifyNotFound() {
  return (
    <ErrorPage
      code="404"
      title="Invalid document hash"
      description="Hashes must be 64 hexadecimal characters. Check the link and try again."
      suggestions={SUGGESTIONS}
    />
  );
}
