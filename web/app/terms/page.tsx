import type { Metadata } from "next";
import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";

const REPO_URL = "https://github.com/Tim-cryptow/thesis-lock";

const title = "Terms of Service";
const description =
  "ThesisLock is open source under the MIT license, provided as is with no warranty. On-chain anchors are permanent and public, and securing your wallet is your responsibility.";

export function generateMetadata(): Metadata {
  return {
    title,
    description,
    alternates: { canonical: "/terms" },
    openGraph: {
      type: "website",
      siteName: "ThesisLock",
      title: `${title} | ThesisLock`,
      description,
      url: "/terms",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ThesisLock`,
      description,
    },
  };
}

export default function TermsPage() {
  return (
    <div className="w-full flex-1">
      <div className="mx-auto w-full max-w-3xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" className="text-sm text-foreground/60 transition hover:text-foreground">
            &larr; ThesisLock
          </Link>
          <ThemeToggle />
        </div>

        <h1 className="mb-2 text-3xl">Terms of Service</h1>
        <p className="mb-8 text-sm text-foreground/55">Last updated June 2026</p>

        <div className="space-y-6 leading-relaxed text-foreground/80">
          <section>
            <h2 className="mb-2 text-lg font-medium text-foreground">Open source software</h2>
            <p>
              ThesisLock is free, open source software released under the MIT license. You are
              welcome to read, run, fork, and audit the source on{" "}
              <a
                href={REPO_URL}
                target="_blank"
                rel="noreferrer"
                className="underline hover:no-underline"
              >
                GitHub
              </a>
              . The MIT license, including its permission and limitation terms, governs your use of
              the code.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-medium text-foreground">
              Provided as is, with no warranty
            </h2>
            <p>
              ThesisLock is provided on an as-is basis, without warranties or conditions of any
              kind, express or implied. The authors and contributors are not liable for any loss or
              damage arising from its use. You use it at your own risk.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-medium text-foreground">
              Anchors are permanent and public
            </h2>
            <p>
              Anchoring a document writes its hash to the Stacks blockchain. On-chain records are
              permanent and public: once a transaction confirms, the hash, the label you attached,
              the wallet that signed it, and the timestamp cannot be edited or removed by anyone,
              including us. Only anchor hashes for documents whose existence you are comfortable
              proving publicly.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-medium text-foreground">
              Your wallet is your responsibility
            </h2>
            <p>
              ThesisLock never holds your private keys, seed phrase, or files. Securing your Stacks
              wallet, approving transactions, and paying their network fees are entirely your
              responsibility. We cannot recover keys, reverse transactions, or access your wallet on
              your behalf.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-medium text-foreground">Acceptable use</h2>
            <p>
              Do not use ThesisLock to anchor content you do not have the right to, or for any
              unlawful purpose. Hashing happens in your browser and the file itself is never
              uploaded, but you remain responsible for what you choose to anchor.
            </p>
          </section>

          <p className="text-sm text-foreground/55">
            See also the{" "}
            <Link href="/privacy" className="underline hover:no-underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
