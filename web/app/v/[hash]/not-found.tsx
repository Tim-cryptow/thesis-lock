import ErrorPage, { type ErrorSuggestion } from "@/app/components/ErrorPage";
import { FileIcon } from "@/app/components/ErrorIcons";

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
      icon={<FileIcon />}
      code="404"
      title="Invalid hash format."
      description="A valid hash is 64 lowercase hex characters."
      suggestions={SUGGESTIONS}
    />
  );
}
