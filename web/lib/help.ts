// Content and routing for the in-app help center. Like lib/docs.ts, this is the
// single source of truth: the help pages, the HelpLink component, and the command
// palette all read from here, so a topic is defined in exactly one place and its
// deep-link anchor stays stable.

export type HelpCategory = {
  slug: string;
  title: string;
  description: string;
  // Where the category card links. Deep links target a question or guide anchor.
  href: string;
};

// The landing grid. Each card points at the page and anchor that best answers it.
export const HELP_CATEGORIES: HelpCategory[] = [
  {
    slug: "getting-started",
    title: "Getting Started",
    description: "What ThesisLock is, what you need, and how to anchor your first document.",
    href: "/help/faq#what-is-thesislock",
  },
  {
    slug: "anchoring",
    title: "Anchoring",
    description: "Hashing files locally, labels, batches, and what actually happens on chain.",
    href: "/help/faq#what-happens-when-i-anchor-a-document",
  },
  {
    slug: "verification",
    title: "Verification",
    description: "Confirming a document was anchored, and what to do when it is not found.",
    href: "/help/faq#how-do-i-verify-a-document",
  },
  {
    slug: "groups",
    title: "Groups",
    description: "Creating named groups and anchoring documents under a shared, on-chain history.",
    href: "/help/faq#what-are-groups",
  },
  {
    slug: "proof-nfts",
    title: "Proof NFTs",
    description: "Optional soulbound SIP-009 tokens that record an anchor in your wallet.",
    href: "/help/faq#what-is-a-proof-nft",
  },
  {
    slug: "developer-tools",
    title: "Developer Tools",
    description: "The SDK, CLI, REST API, and GitHub Action for scripting verification.",
    href: "/docs/sdk",
  },
  {
    slug: "account-settings",
    title: "Account & Settings",
    description: "Your anchor history, data portability, and browser-local preferences.",
    href: "/help/guides#export-your-anchor-history",
  },
  {
    slug: "troubleshooting",
    title: "Troubleshooting",
    description: "Fixes for wallet, transaction, hash, badge, and connectivity problems.",
    href: "/help/troubleshooting",
  },
];
