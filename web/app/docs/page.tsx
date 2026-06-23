import type { Metadata } from "next";
import Link from "next/link";
import { DOCS } from "@/lib/docs";

export const metadata: Metadata = {
  title: { absolute: "Documentation | ThesisLock Docs" },
  description:
    "Guides and reference for ThesisLock: contracts, web app, REST API, SDK, CLI, and GitHub Action.",
  alternates: { canonical: "/docs" },
};

export default function DocsHome() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">ThesisLock Documentation</h1>
      <p className="mt-4 text-lg text-foreground/80 leading-relaxed">
        ThesisLock anchors a SHA-256 hash of any document on the Stacks
        blockchain, giving you a permanent, verifiable timestamp without ever
        exposing the file. These guides cover the contracts, the web app, and
        every way to integrate verification into your own tools.
      </p>

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {DOCS.map((doc) => (
          <Link
            key={doc.slug}
            href={`/docs/${doc.slug}`}
            className="block rounded-lg border border-foreground/10 bg-card p-5 hover:border-foreground/30 transition"
          >
            <h2 className="text-lg">{doc.title}</h2>
            <p className="mt-2 text-sm text-foreground/70 leading-relaxed">
              {doc.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
