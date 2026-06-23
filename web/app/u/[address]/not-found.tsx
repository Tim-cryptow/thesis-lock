import ErrorPage, { type ErrorSuggestion } from "@/app/components/ErrorPage";
import { WalletIcon } from "@/app/components/ErrorIcons";

const SUGGESTIONS: ErrorSuggestion[] = [
  {
    href: "/search",
    label: "Search for a wallet",
    hint: "Find anchors by Stacks address",
  },
  { href: "/", label: "Go home", hint: "The ThesisLock overview" },
];

export default function ProfileNotFound() {
  return (
    <ErrorPage
      icon={<WalletIcon />}
      code="404"
      title="Invalid wallet address"
      description="Stacks addresses start with SP or ST and pass a checksum. Check the address and try again."
      suggestions={SUGGESTIONS}
    />
  );
}
