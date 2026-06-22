import type { Metadata } from "next";
import Link from "next/link";
import { Code, H2, Lead, List, P } from "../ui";

export const metadata: Metadata = {
  title: { absolute: "Navigation | ThesisLock Docs" },
  description:
    "Find your way around ThesisLock with breadcrumb trails, a context-aware back button, and a recently visited pages menu.",
};

export default function NavigationDocs() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">Navigation</h1>
      <Lead>
        ThesisLock has grown to many pages, including nested views such as group,
        collection, profile, and verification pages. Three wayfinding aids keep
        you oriented: breadcrumbs, a back button, and a recently visited menu.
      </Lead>

      <H2>Breadcrumbs</H2>
      <P>
        A breadcrumb trail sits below the navigation on every page, showing where
        the current page lives in the site. Each step links back to that level,
        except the current page. Dynamic pages read naturally: a verification
        page shows <Code>Home / Verify / abc123...</Code> with the document hash
        shortened, a profile shows the wallet, and a group or collection shows
        its name.
      </P>

      <H2>Back button</H2>
      <P>
        Next to the breadcrumbs on nested pages, a back link points to the
        previous page you actually came from, named so you know where it leads,
        for example <Code>Back to My Anchors</Code>. If you opened a deep link
        directly with no history yet, it falls back to your browser&apos;s back.
      </P>

      <H2>Recently visited</H2>
      <P>
        The clock icon in the top corner opens a list of the last pages you
        visited this session, each with its title, path, and how long ago you
        were there. Select any entry to jump straight back to it, or choose{" "}
        <Code>Clear history</Code> to empty the list.
      </P>
      <List
        items={[
          <>The list keeps your most recent pages, newest first.</>,
          <>
            History is stored only for the current tab and is cleared when the
            tab closes.
          </>,
          <>
            Nothing is sent anywhere: like the rest of ThesisLock, this stays on
            your device.
          </>,
        ]}
      />
      <P>
        To jump to any page or action by name rather than retracing your steps,
        the{" "}
        <Link
          href="/docs/command-palette"
          className="underline hover:text-foreground"
        >
          command palette
        </Link>{" "}
        is the fastest route.
      </P>
    </div>
  );
}
