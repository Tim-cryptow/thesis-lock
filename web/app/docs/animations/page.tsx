import type { Metadata } from "next";
import { Code, CodeBlock, H2, Lead, List, P } from "../ui";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/animations" },
  title: { absolute: "Animations | ThesisLock Docs" },
  description:
    "The subtle motion in ThesisLock: fade-ins, staggered lists, count-up stats, and micro-interactions, all of which respect reduced motion.",
};

export default function AnimationsDocs() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">Animations</h1>
      <Lead>
        ThesisLock uses small, consistent motion to make the app feel
        responsive: content fades in as it loads, lists reveal one row after
        another, statistics count up, and buttons and cards respond to your
        cursor. Nothing blocks you, and everything is built from plain CSS
        transitions with no animation library.
      </Lead>

      <H2>What moves</H2>
      <List
        items={[
          <>
            Page sections fade in on load, sliding up slightly into place, with
            later sections following the earlier ones.
          </>,
          <>
            Lists of anchors, feed entries, search results, activity, and groups
            reveal their rows in a quick staggered sequence.
          </>,
          <>
            Headline numbers on the stats, dashboard, and profile pages count up
            from zero the first time they scroll into view.
          </>,
          <>
            Buttons press in slightly when clicked, cards lift on hover, nav
            links grow an underline, and the copy button gives a small bounce
            when it succeeds.
          </>,
        ]}
      />

      <H2>Respecting reduced motion</H2>
      <P>
        Every animation honors the operating system{" "}
        <Code>prefers-reduced-motion</Code> setting. When reduced motion is
        requested, content appears immediately, numbers show their final value at
        once, and the hover and press effects are turned off, so the app stays
        usable and calm.
      </P>

      <H2>For contributors</H2>
      <P>
        Three small client components cover most cases. <Code>FadeIn</Code> fades
        and slides its children in on mount; <Code>StaggerList</Code> wraps a list
        and fades each child in after the last; and <Code>CountUp</Code> animates
        a number toward its value once it scrolls into view.
      </P>
      <CodeBlock language="tsx">{`// Fade a section in on mount
<FadeIn delay={100} direction="up">
  <section>...</section>
</FadeIn>

// Stagger a list of cards
<div className="space-y-3">
  <StaggerList>
    {items.map((item) => (
      <div key={item.id}>...</div>
    ))}
  </StaggerList>
</div>

// Count a stat up when it scrolls into view
<CountUp value={total} suffix=" anchors" />`}</CodeBlock>
      <P>
        For a list rendered as a <Code>ul</Code>, pass <Code>as=&quot;li&quot;</Code>{" "}
        to <Code>FadeIn</Code> so the row stays valid markup instead of nesting a
        div inside the list. The micro-interactions are utility classes you can
        add to any element: <Code>press-scale</Code> for buttons,{" "}
        <Code>hover-lift</Code> for cards, and <Code>nav-underline</Code> for
        links.
      </P>
    </div>
  );
}
