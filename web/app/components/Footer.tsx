import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";

const REPO_URL = "https://github.com/Tim-cryptow/thesis-lock";
const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
  "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";
const EXPLORER_URL = `https://explorer.hiro.so/address/${CONTRACT_ADDRESS}?chain=mainnet`;

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-foreground/10 py-8 px-6 text-sm text-foreground/60">
      <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-foreground">ThesisLock</span>
          <span className="text-foreground/50">
            Built on Stacks &middot; Secured by Bitcoin
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/docs" className="hover:text-foreground transition">
            Docs
          </Link>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground transition"
          >
            GitHub
          </a>
          <a
            href={EXPLORER_URL}
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground transition"
          >
            Explorer
          </a>
          <Link href="/docs/api" className="hover:text-foreground transition">
            API
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
}
