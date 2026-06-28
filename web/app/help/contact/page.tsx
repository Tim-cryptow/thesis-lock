import { REPO_URL } from "@/lib/docs";

const DISCORD_URL = "https://discord.gg/stacks";

const BUG_BODY = `**What happened?**

**Steps to reproduce**
1.
2.

**Expected result**

**Browser and wallet**
`;

// A pre-filled GitHub issue so a bug report opens with a ready template.
const BUG_REPORT_URL = `${REPO_URL}/issues/new?labels=bug&title=${encodeURIComponent(
  "Bug: ",
)}&body=${encodeURIComponent(BUG_BODY)}`;

type ContactCard = { title: string; description: string; href: string; cta: string };

const CARDS: ContactCard[] = [
  {
    title: "Report a bug",
    description: "Found something broken? Open a pre-filled bug report on GitHub.",
    href: BUG_REPORT_URL,
    cta: "Report a bug",
  },
  {
    title: "GitHub Issues",
    description: "Browse known issues or open a new one for bugs and feature requests.",
    href: `${REPO_URL}/issues`,
    cta: "Open Issues",
  },
  {
    title: "GitHub Discussions",
    description: "Ask a question or share an idea with the community.",
    href: `${REPO_URL}/discussions`,
    cta: "Open Discussions",
  },
  {
    title: "Stacks Discord",
    description: "Chat with the wider Stacks community in real time.",
    href: DISCORD_URL,
    cta: "Join the Discord",
  },
];

export default function ContactPage() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">Need more help?</h1>
      <p className="mt-4 text-lg text-foreground/80 leading-relaxed">
        If the FAQ, guides, and troubleshooting did not answer your question, here is how to reach
        the project and the community.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {CARDS.map((card) => (
          <a
            key={card.title}
            href={card.href}
            target="_blank"
            rel="noreferrer"
            className="block rounded-lg border border-foreground/10 bg-card p-5 transition hover:border-foreground/30"
          >
            <h2 className="text-lg">{card.title}</h2>
            <p className="mt-2 text-sm text-foreground/70 leading-relaxed">{card.description}</p>
            <span className="mt-3 inline-block text-sm text-foreground/80 underline">
              {card.cta}
            </span>
          </a>
        ))}
      </div>

      <p className="mt-8 text-sm text-foreground/70 leading-relaxed">
        ThesisLock is open source and contributions are welcome. See the{" "}
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-foreground"
        >
          repository on GitHub
        </a>{" "}
        to explore the code or get involved.
      </p>
    </div>
  );
}
