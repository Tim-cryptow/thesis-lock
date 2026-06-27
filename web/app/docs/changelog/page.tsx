import type { Metadata } from "next";
import { H2, Lead, List, P } from "../ui";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/changelog" },
  title: { absolute: "Changelog | ThesisLock Docs" },
  description:
    "Notable changes and improvements to ThesisLock, including the standardized copy interactions across the app.",
};

export default function ChangelogDocs() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">Changelog</h1>
      <Lead>Notable changes and improvements to ThesisLock, newest first.</Lead>

      <H2>Polished loading skeletons</H2>
      <P>
        Pages now show skeleton loaders shaped like their final layout while data loads, instead of
        spinners or blank screens. The shimmer is theme-aware and respects reduced-motion.
      </P>

      <H2>Standardized copy interactions</H2>
      <P>
        Copying hashes, addresses, API keys, and snippets now works the same way everywhere in the
        app, replacing the assorted one-off copy buttons that had grown inconsistent over time.
      </P>
      <List
        items={[
          <>
            A single copy control with a clipboard icon that switches to a checkmark, plus a brief
            &quot;Copied!&quot; tooltip.
          </>,
          <>
            Truncated hashes and addresses share one component: a compact display, the full value on
            hover, click-to-copy, and a profile link for addresses.
          </>,
          <>
            A global toast confirms every copy at the bottom of the screen and replaces the previous
            one rather than stacking.
          </>,
        ]}
      />
    </div>
  );
}
