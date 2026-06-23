import type { Metadata } from "next";
import { Code, CodeBlock, H2, Lead, List, P } from "../ui";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/confirmation-dialogs" },
  title: { absolute: "Confirmation Dialogs | ThesisLock Docs" },
  description:
    "How ThesisLock guards destructive and irreversible actions with a confirmation dialog, and how to use the useConfirm hook.",
};

export default function ConfirmationDialogsDocs() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">Confirmation Dialogs</h1>
      <Lead>
        Actions that delete data or cannot be undone always ask first. Instead of
        the browser&apos;s plain prompt, ThesisLock shows a single, consistent
        dialog that names what is about to happen and asks you to confirm, so an
        accidental click never quietly throws work away.
      </Lead>

      <H2>What asks for confirmation</H2>
      <List
        items={[
          <>Deleting a collection, or revoking an API key.</>,
          <>Removing a member from a group, or removing a watchlist item.</>,
          <>
            Clearing data: the audit log, notifications, search and request
            history, performance data, and the Clear All Data action in
            settings.
          </>,
          <>Anchoring a large batch, which needs several wallet signatures.</>,
          <>Leaving a page that has staged but unsaved work.</>,
        ]}
      />

      <H2>How a dialog signals risk</H2>
      <P>
        Each dialog uses one of three variants. <Code>danger</Code> (a red
        confirm button) marks irreversible deletions, <Code>warning</Code> (amber)
        marks clearing or removing data, and <Code>info</Code> (blue) marks
        actions that are merely worth a second look. Only info dialogs can be
        dismissed by clicking outside; the rest require an explicit choice.
      </P>
      <P>
        The most destructive actions, such as Clear All Data and deleting a
        collection, also ask you to type a word like <Code>DELETE</Code> before
        the confirm button turns on, so they can never be triggered by a single
        stray click.
      </P>

      <H2>Leaving with unsaved work</H2>
      <P>
        If you have added files on the anchor page but not yet anchored them, or
        generated a report you have not downloaded, ThesisLock warns you before
        you navigate away, both for in-app links and for closing or reloading the
        tab.
      </P>

      <H2>For contributors</H2>
      <P>
        Confirmations are driven by a promise-based <Code>useConfirm</Code> hook
        backed by a single <Code>ConfirmProvider</Code> in the app layout. Any
        client component can request one without rendering a dialog or threading
        open and close state through props.
      </P>
      <CodeBlock language="tsx">{`const confirm = useConfirm();

async function onDelete() {
  const ok = await confirm({
    title: "Delete collection",
    message: "Delete this collection? This cannot be undone.",
    confirmLabel: "Delete",
    variant: "danger",
    requireType: "DELETE",
  });
  if (!ok) return;
  // ...perform the irreversible action
}`}</CodeBlock>
      <P>
        To warn on navigation away from unsaved work, the{" "}
        <Code>useUnsavedChanges</Code> hook takes a boolean and a message and
        handles both the browser prompt and in-app link clicks for you.
      </P>
    </div>
  );
}
