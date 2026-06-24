import ErrorPage, { type ErrorSuggestion } from "@/app/components/ErrorPage";
import { UsersIcon } from "@/app/components/ErrorIcons";

const SUGGESTIONS: ErrorSuggestion[] = [
  { href: "/groups", label: "Browse all groups", hint: "See every group" },
  { href: "/", label: "Go home", hint: "The ThesisLock overview" },
];

export default function GroupNotFound() {
  return (
    <ErrorPage
      icon={<UsersIcon />}
      code="404"
      title="Group not found"
      description="This group may not exist or may have been created on a different network."
      suggestions={SUGGESTIONS}
    />
  );
}
