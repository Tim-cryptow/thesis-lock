type SocialLinksProps = {
  size?: "sm" | "md";
  layout?: "row" | "column";
};

const REPO_URL = "https://github.com/Tim-cryptow/thesis-lock";
const X_URL = "https://x.com/Stacks";
const DISCORD_URL = "https://discord.gg/stacks";
const RSS_URL = "/api/feed/rss";

function GitHubIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17 4.7 18 5 18 5c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0 0 23.5 12C23.5 5.7 18.3.5 12 .5z" />
    </svg>
  );
}

function XIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644Z" />
    </svg>
  );
}

function DiscordIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3.2a.07.07 0 0 0-.075.035c-.21.375-.444.864-.608 1.249a18.27 18.27 0 0 0-5.487 0 12.6 12.6 0 0 0-.617-1.25.07.07 0 0 0-.075-.034A19.74 19.74 0 0 0 5.677 4.37a.06.06 0 0 0-.03.024C3.018 8.045 2.298 11.62 2.65 15.147a.08.08 0 0 0 .03.054 19.9 19.9 0 0 0 5.993 3.03.07.07 0 0 0 .078-.027c.462-.63.873-1.295 1.226-1.992a.07.07 0 0 0-.04-.098 13.1 13.1 0 0 1-1.872-.892.07.07 0 0 1-.007-.117c.126-.094.252-.192.371-.291a.07.07 0 0 1 .073-.01c3.927 1.793 8.18 1.793 12.061 0a.07.07 0 0 1 .074.009c.12.099.245.198.372.292a.07.07 0 0 1-.006.116c-.598.35-1.22.645-1.873.892a.07.07 0 0 0-.039.099c.36.697.772 1.362 1.225 1.991a.07.07 0 0 0 .078.028 19.84 19.84 0 0 0 6.002-3.03.08.08 0 0 0 .03-.053c.5-4.087-.838-7.626-3.549-10.754a.06.06 0 0 0-.03-.024ZM8.02 13c-1.183 0-2.157-1.086-2.157-2.42 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.086-2.157-2.42 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z" />
    </svg>
  );
}

function RssIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <circle cx="6.18" cy="17.82" r="2.18" />
      <path d="M4 4.44v2.83c7.03 0 12.73 5.7 12.73 12.73h2.83C19.56 11.4 12.6 4.44 4 4.44z" />
      <path d="M4 10.1v2.83c3.9 0 7.07 3.17 7.07 7.07h2.83c0-5.47-4.43-9.9-9.9-9.9z" />
    </svg>
  );
}

const LINKS = [
  { label: "GitHub", href: REPO_URL, Icon: GitHubIcon },
  { label: "X", href: X_URL, Icon: XIcon },
  { label: "Stacks Discord", href: DISCORD_URL, Icon: DiscordIcon },
  { label: "RSS feed", href: RSS_URL, Icon: RssIcon },
];

// A row (or column) of social and feed links. Used in the footer, and available
// for the landing page or anywhere else the project's links belong.
export default function SocialLinks({
  size = "md",
  layout = "row",
}: SocialLinksProps) {
  const iconClass = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <div
      className={
        layout === "column"
          ? "flex flex-col gap-3"
          : "flex items-center gap-4"
      }
    >
      {LINKS.map(({ label, href, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label={label}
          title={label}
          className="press-scale inline-flex text-foreground/55 transition hover:text-foreground"
        >
          <Icon className={iconClass} />
        </a>
      ))}
    </div>
  );
}
