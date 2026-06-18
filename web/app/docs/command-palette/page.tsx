import type { Metadata } from "next";
import Link from "next/link";
import { Code, H2, Lead, List, P } from "../ui";

export const metadata: Metadata = {
  title: { absolute: "Command Palette | ThesisLock Docs" },
  description:
    "Open the ThesisLock command palette with Ctrl+K (Cmd+K on macOS) to jump to any page or run a common action with fuzzy search and the keyboard.",
};

export default function CommandPalette() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">Command Palette</h1>
      <Lead>
        The command palette is a keyboard-first way to move around ThesisLock.
        Press <Code>Ctrl+K</Code> (or <Code>Cmd+K</Code> on macOS) anywhere to
        open it, type a few characters, and jump to any page or run a common
        action without leaving the keyboard.
      </Lead>

      <H2>Opening and navigating</H2>
      <List
        items={[
          <>
            <Code>Ctrl+K</Code> / <Code>Cmd+K</Code> opens (and closes) the
            palette. The search box is focused automatically.
          </>,
          <>
            The arrow keys move the selection; <Code>Enter</Code> runs the
            highlighted result; <Code>Escape</Code> closes the palette.
          </>,
          <>
            Results are grouped into Recent, Pages, and Actions, each under a
            subtle header.
          </>,
        ]}
      />

      <H2>Fuzzy search</H2>
      <P>
        Matching is fuzzy: the characters you type only need to appear in order.
        Typing <Code>anch</Code> matches Anchor, My Anchors, and Batch Anchor,
        ranking closer matches first. Search runs over both the title and the
        description of every item.
      </P>

      <H2>Pages and actions</H2>
      <P>
        Pages cover the whole app: Anchor, My Anchors, Verify, Search, Feed,
        Stats, Groups, Dashboard, Activity, Compare, Report, Bulk Verify,
        Templates, Developers, Docs, and Embed. Actions run a common task
        directly, including creating a new anchor or group, generating a report,
        toggling the theme, starting the{" "}
        <Link
          href="/docs/getting-started-tour"
          className="underline hover:text-foreground"
        >
          onboarding tour
        </Link>
        , and opening the keyboard shortcuts help. The Recent section lists the
        last few pages you visited this session.
      </P>

      <H2>Other shortcuts</H2>
      <P>
        Press <Code>?</Code> anywhere to see the full list of keyboard shortcuts,
        including <Code>Ctrl+K</Code> for the command palette, <Code>/</Code> to
        focus search, and the navigation shortcuts for new anchors, groups,
        history, docs, and the theme toggle.
      </P>
    </div>
  );
}
