import type { Metadata } from "next";
import { GUIDES } from "@/lib/help";

export const metadata: Metadata = {
  title: { absolute: "Guides | ThesisLock" },
  description:
    "Step-by-step guides for anchoring, verifying, groups, batches, proof NFTs, and exports.",
  alternates: { canonical: "/help/guides" },
};

export default function GuidesPage() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">Step-by-step guides</h1>
      <p className="mt-4 text-lg text-foreground/80 leading-relaxed">
        Short, numbered walkthroughs for the most common tasks.
      </p>

      {GUIDES.map((guide) => (
        <section key={guide.slug} id={guide.slug} className="mt-10 scroll-mt-24">
          <h2 className="text-2xl mb-4">{guide.title}</h2>
          <ol className="list-decimal space-y-3 pl-6 text-foreground/80">
            {guide.steps.map((step, index) => (
              <li key={index} className="pl-1 leading-relaxed">
                {step}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
