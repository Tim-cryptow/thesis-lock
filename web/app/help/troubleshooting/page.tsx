import type { Metadata } from "next";
import Link from "next/link";
import { TROUBLESHOOTING } from "@/lib/help";

export const metadata: Metadata = {
  title: { absolute: "Troubleshooting | ThesisLock" },
  description: "Fixes for common wallet, transaction, hash, badge, and connectivity problems.",
  alternates: { canonical: "/help/troubleshooting" },
};

export default function TroubleshootingPage() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">Troubleshooting</h1>
      <p className="mt-4 text-lg text-foreground/80 leading-relaxed">
        Common problems and how to fix them. If none of these help, reach out from the{" "}
        <Link href="/help/contact" className="underline hover:text-foreground">
          contact page
        </Link>
        .
      </p>

      <div className="mt-8 space-y-5">
        {TROUBLESHOOTING.map((item) => (
          <section
            key={item.slug}
            id={item.slug}
            className="scroll-mt-24 rounded-lg border border-foreground/10 bg-card p-5"
          >
            <h2 className="text-lg">{item.problem}</h2>
            <p className="mt-2 text-sm text-foreground/80 leading-relaxed">{item.solution}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
