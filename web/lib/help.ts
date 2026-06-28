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

export type FaqCategory =
  "Getting started" | "Anchoring" | "Verification" | "Groups" | "Proof NFTs" | "Technical";

export type Faq = {
  // Stable anchor id; also the deep-link target used by HelpLink and the palette.
  slug: string;
  question: string;
  answer: string;
  category: FaqCategory;
};

// Render order for the grouped FAQ accordion.
export const FAQ_CATEGORIES: FaqCategory[] = [
  "Getting started",
  "Anchoring",
  "Verification",
  "Groups",
  "Proof NFTs",
  "Technical",
];

export const FAQS: Faq[] = [
  {
    slug: "what-is-thesislock",
    category: "Getting started",
    question: "What is ThesisLock?",
    answer:
      "ThesisLock is a proof-of-existence service for documents. Your browser hashes a file with SHA-256 and anchors that hash on the Stacks blockchain, so you can later prove the file existed at a point in time without ever revealing the file itself.",
  },
  {
    slug: "what-do-i-need-to-get-started",
    category: "Getting started",
    question: "What do I need to get started?",
    answer:
      "To anchor a document you need a Stacks wallet and a small amount of STX for the transaction fee. To verify an existing document you need nothing at all, since verification is a free, read-only lookup.",
  },
  {
    slug: "what-wallets-are-supported",
    category: "Getting started",
    question: "What wallets are supported?",
    answer:
      "ThesisLock connects through Stacks Connect, which supports Leather, Xverse, and Asigna, a multisig wallet. Install one as a browser extension, then connect it on the anchor page.",
  },
  {
    slug: "does-it-cost-anything",
    category: "Getting started",
    question: "Does it cost anything?",
    answer:
      "The app itself is free and open source. Anchoring a document costs a small Stacks network fee paid in STX, the same as any on-chain transaction, while verifying a document is always free.",
  },
  {
    slug: "what-happens-when-i-anchor-a-document",
    category: "Anchoring",
    question: "What happens when I anchor a document?",
    answer:
      "Your browser computes the SHA-256 hash of the file locally, then you sign a Stacks transaction that writes the hash, an optional label, and the current block heights to a Clarity contract. Once the transaction confirms, the anchor is a permanent on-chain record.",
  },
  {
    slug: "is-my-file-uploaded",
    category: "Anchoring",
    question: "Is my file uploaded?",
    answer:
      "No. The file never leaves your device. Only its SHA-256 hash, a one-way fingerprint, is sent to the blockchain, so the contents stay private.",
  },
  {
    slug: "what-is-a-label",
    category: "Anchoring",
    question: "What is a label?",
    answer:
      "A label is an optional, short description you attach to an anchor, such as a title or version. It can be up to 64 printable ASCII characters and is stored on chain alongside the hash.",
  },
  {
    slug: "how-many-files-can-i-batch-anchor",
    category: "Anchoring",
    question: "How many files can I batch anchor?",
    answer:
      "You can anchor up to ten files in a single batch transaction. Each file is hashed locally and recorded under your wallet, which is more efficient than anchoring them one at a time.",
  },
  {
    slug: "can-i-anchor-the-same-file-twice",
    category: "Anchoring",
    question: "Can I anchor the same file twice?",
    answer:
      "The original single-anchor contract keeps one immutable record per hash, so re-anchoring the exact same file there is rejected as already anchored. The first anchor and its timestamp stay valid forever, and you can still register that hash under your own wallet or a group.",
  },
  {
    slug: "how-do-i-verify-a-document",
    category: "Verification",
    question: "How do I verify a document?",
    answer:
      "Open the verification page for a hash at /v/<hash>, or drop the file into the verify page so the browser can re-hash it and check the chain. A match confirms when the document was anchored, by which wallet, and what label was attached.",
  },
  {
    slug: "what-if-verification-says-not-found",
    category: "Verification",
    question: "What if verification says not found?",
    answer:
      "The hash may not be anchored yet, or its transaction may still be pending, so wait a few minutes and try again. If the document was batch anchored, add the owner to the lookup with ?owner=your-principal, since batch records are keyed by wallet.",
  },
  {
    slug: "can-anyone-verify-my-document",
    category: "Verification",
    question: "Can anyone verify my document?",
    answer:
      "Yes. Verification is a public, read-only lookup against the blockchain and needs no wallet. Anyone with the hash or the original file can confirm the anchor, but they cannot see the file unless you share it.",
  },
  {
    slug: "what-are-groups",
    category: "Groups",
    question: "What are groups?",
    answer:
      "Groups let several people anchor documents under one shared, on-chain history. An admin creates a named group and adds members, and every anchor made to the group is recorded together.",
  },
  {
    slug: "who-can-anchor-to-a-group",
    category: "Groups",
    question: "Who can anchor to a group?",
    answer:
      "Only members of a group can anchor documents to it. The admin who created the group can add or remove members at any time.",
  },
  {
    slug: "can-i-remove-a-member",
    category: "Groups",
    question: "Can I remove a member?",
    answer:
      "Yes, the group admin can remove any member. You cannot remove yourself from a group, which keeps every group with at least its admin in place.",
  },
  {
    slug: "what-is-a-proof-nft",
    category: "Proof NFTs",
    question: "What is a proof NFT?",
    answer:
      "A proof NFT is an optional SIP-009 token you can mint as permanent, in-wallet evidence of an anchor. It records the hash and label and lives in your Stacks wallet alongside your other assets.",
  },
  {
    slug: "can-i-transfer-my-proof-nft",
    category: "Proof NFTs",
    question: "Can I transfer my proof NFT?",
    answer:
      "No. Proof NFTs are soulbound, meaning they are permanently tied to the wallet that minted them and cannot be transferred or sold. This keeps the proof bound to its original owner.",
  },
  {
    slug: "do-i-need-to-mint-one",
    category: "Proof NFTs",
    question: "Do I need to mint one?",
    answer:
      "No. Minting a proof NFT is entirely optional. The on-chain anchor is the proof on its own, and the NFT is just a convenient, visible record in your wallet.",
  },
  {
    slug: "what-is-a-sha-256-hash",
    category: "Technical",
    question: "What is a SHA-256 hash?",
    answer:
      "SHA-256 is a cryptographic function that turns any file into a fixed 64-character hexadecimal fingerprint. The same file always produces the same hash, but the original file cannot be reconstructed from it.",
  },
  {
    slug: "what-blockchain-does-thesislock-use",
    category: "Technical",
    question: "What blockchain does ThesisLock use?",
    answer:
      "ThesisLock anchors hashes on the Stacks blockchain, which settles its transactions on Bitcoin. Reads come from the public Hiro API, so anyone can verify an anchor independently.",
  },
  {
    slug: "are-my-anchors-permanent",
    category: "Technical",
    question: "Are my anchors permanent?",
    answer:
      "Yes. Once a transaction confirms, the anchor is a permanent record on chain that cannot be edited or deleted. Its timestamp and details stay verifiable by anyone, indefinitely.",
  },
];

/** Look up a FAQ by its slug. */
export function getFaq(slug: string): Faq | undefined {
  return FAQS.find((faq) => faq.slug === slug);
}
