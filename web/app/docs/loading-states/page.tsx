import type { Metadata } from "next";
import { Code, H2, Lead, List, P } from "../ui";

export const metadata: Metadata = {
  title: { absolute: "Loading States | ThesisLock Docs" },
  description:
    "ThesisLock uses skeleton loaders that match the final layout while data loads, giving instant visual feedback instead of spinners or blank screens.",
};

export default function LoadingStatesDocs() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">Loading States</h1>
      <Lead>
        While a page waits on an on-chain read or an API response, ThesisLock
        shows a skeleton shaped like the content that is about to appear, rather
        than a spinner or a blank screen. The layout stays stable and there is
        instant visual feedback.
      </Lead>

      <H2>Skeleton primitives</H2>
      <P>
        Three small building blocks compose every skeleton:{" "}
        <Code>SkeletonLine</Code> for text, <Code>SkeletonCircle</Code> for
        avatars and icons, and <Code>SkeletonBlock</Code> for larger areas. Each
        renders a gentle shimmer.
      </P>
      <List
        items={[
          <>
            The shimmer tint is derived from the foreground color, so it reads as
            a light shimmer in dark mode and a darker one in light mode
            automatically.
          </>,
          <>
            It honors <Code>prefers-reduced-motion</Code>: the animation is
            disabled for visitors who ask for reduced motion.
          </>,
          <>
            Skeletons are decorative and hidden from assistive technology; the
            surrounding region carries <Code>aria-busy</Code> instead.
          </>,
        ]}
      />

      <H2>Where they appear</H2>
      <P>
        Composed skeletons mirror each page&apos;s real layout: the anchor list,
        protocol and dashboard stats, the feed and search results, the verify
        record, groups, the activity timeline, and the calendar grid.
      </P>
    </div>
  );
}
