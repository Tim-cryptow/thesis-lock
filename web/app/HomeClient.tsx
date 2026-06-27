"use client";

import Link from "next/link";
import HeroStats from "@/app/components/HeroStats";
import StatsBar from "@/app/components/StatsBar";
import FeatureCard from "@/app/components/FeatureCard";
import TourBanner from "@/app/components/TourBanner";
import FadeIn from "@/app/components/FadeIn";
import ThemeToggle from "@/app/components/ThemeToggle";
import { useI18n } from "@/app/components/I18nProvider";

const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";

function contractUrl(name: string): string {
  return `https://explorer.hiro.so/txid/${CONTRACT_ADDRESS}.${name}?chain=mainnet`;
}

// Stable ids drive the translation keys (landing.features.<id>); icons and
// hrefs are structural and stay in the array.
const FEATURES = [
  {
    id: "anchoring",
    href: "/anchor",
    icon: (
      <>
        <path d="M4 5h16" />
        <path d="M4 12h16" />
        <path d="M4 19h10" />
      </>
    ),
  },
  {
    id: "groups",
    href: "/groups",
    icon: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20a6 6 0 0 1 12 0" />
        <path d="M16 6a3 3 0 0 1 0 6" />
        <path d="M18 20a6 6 0 0 0-3-5.2" />
      </>
    ),
  },
  {
    id: "proofNfts",
    href: "/docs/contracts",
    icon: (
      <>
        <path d="M12 2 3 7v6c0 5 4 8 9 9 5-1 9-4 9-9V7z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
  },
  {
    id: "badges",
    href: "/embed",
    icon: (
      <>
        <circle cx="12" cy="9" r="6" />
        <path d="m9 14-2 7 5-3 5 3-2-7" />
      </>
    ),
  },
  {
    id: "exportCerts",
    href: "/verify-bulk",
    icon: (
      <>
        <path d="M6 2h9l5 5v15H6z" />
        <path d="M15 2v5h5" />
        <path d="M9 13h6" />
        <path d="M9 17h6" />
      </>
    ),
  },
  {
    id: "devtools",
    href: "/docs",
    icon: (
      <>
        <path d="m8 9-3 3 3 3" />
        <path d="m16 9 3 3-3 3" />
        <path d="m13 7-2 10" />
      </>
    ),
  },
  {
    id: "reports",
    href: "/report",
    icon: (
      <>
        <path d="M6 2h9l5 5v15H6z" />
        <path d="M15 2v5h5" />
        <path d="M9 12h6" />
        <path d="M9 16h6" />
      </>
    ),
  },
  {
    id: "watchlist",
    href: "/watchlist",
    icon: (
      <>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
  },
  {
    id: "collections",
    href: "/collections",
    icon: (
      <>
        <path d="M4 5a2 2 0 0 1 2-2h3l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      </>
    ),
  },
  {
    id: "notifications",
    href: "/notifications",
    icon: (
      <>
        <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </>
    ),
  },
];

const CONTRACTS = [
  { name: "thesislock", id: "thesislock" },
  { name: "thesislock-batch", id: "batch" },
  { name: "thesislock-registry", id: "registry" },
  { name: "thesislock-proof", id: "proof" },
  { name: "thesislock-groups", id: "groups" },
];

const STEPS = [
  {
    id: "dropFile",
    icon: (
      <>
        <path d="M12 3v12" />
        <path d="m8 11 4 4 4-4" />
        <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      </>
    ),
  },
  {
    id: "sign",
    icon: (
      <>
        <path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <path d="M16 11h2" />
        <path d="M3 9h18" />
      </>
    ),
  },
  {
    id: "verify",
    icon: (
      <>
        <path d="M12 3 4 6v6c0 4 3.5 7.5 8 9 4.5-1.5 8-5 8-9V6z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
  },
];

export default function HomeClient() {
  const { t } = useI18n();

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex justify-end px-6 pt-6">
        <ThemeToggle />
      </div>
      <FadeIn delay={0}>
        <section className="max-w-4xl mx-auto px-6 pt-24 pb-20 w-full">
          <h1 className="text-5xl md:text-6xl leading-tight">{t("landing.hero.title")}</h1>
          <p className="mt-6 text-lg max-w-2xl text-foreground/80">{t("landing.hero.subtitle")}</p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/anchor"
              className="inline-flex items-center px-6 py-3 rounded-md bg-heading text-background font-medium hover:opacity-90 press-scale"
            >
              {t("landing.hero.anchorCta")}
            </Link>
            <Link
              href="/search"
              className="inline-flex items-center px-6 py-3 rounded-md border border-foreground/15 hover:border-foreground/40 press-scale"
            >
              {t("landing.hero.verifyCta")}
            </Link>
          </div>
          <HeroStats />
          <TourBanner />
        </section>
      </FadeIn>

      <FadeIn delay={80}>
        <section className="max-w-5xl mx-auto px-6 pb-24 w-full">
          <h2 className="text-3xl mb-10">{t("landing.steps.heading")}</h2>
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((step, i) => (
              <li
                key={step.id}
                className="rounded-lg border border-foreground/10 bg-card p-6 flex flex-col"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-heading text-background text-sm font-mono">
                    {i + 1}
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-6 h-6 text-foreground/70"
                    aria-hidden="true"
                  >
                    {step.icon}
                  </svg>
                </div>
                <h3 className="text-xl mb-2">{t(`landing.steps.${step.id}.title`)}</h3>
                <p className="text-foreground/80 text-sm leading-relaxed">
                  {t(`landing.steps.${step.id}.body`)}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </FadeIn>

      <FadeIn delay={160}>
        <section className="max-w-5xl mx-auto px-6 pb-24 w-full">
          <h2 className="text-3xl mb-3">{t("landing.features.heading")}</h2>
          <p className="text-foreground/70 mb-10 max-w-2xl">{t("landing.features.intro")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature) => (
              <FeatureCard
                key={feature.id}
                title={t(`landing.features.${feature.id}.title`)}
                body={t(`landing.features.${feature.id}.body`)}
                href={feature.href}
                icon={feature.icon}
              />
            ))}
            <FeatureCard
              title="Tags"
              body="Add flexible tags to any anchor, then filter by tag across your history, the feed, and search, with auto-suggestions, a tag cloud, and stats."
              href="/tags"
              icon={
                <>
                  <path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3H4a1 1 0 0 0-1 1v5.59A2 2 0 0 0 3.59 11l9.58 9.59a2 2 0 0 0 2.83 0l4.59-4.59a2 2 0 0 0 0-2.83Z" />
                  <circle cx="7.5" cy="7.5" r="1.5" />
                </>
              }
            />
            <FeatureCard
              title="Track your anchoring streak"
              body="See your anchoring activity as a GitHub-style contribution graph, browse it by month, and keep your daily streak going, all from the calendar."
              href="/calendar"
              icon={
                <>
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </>
              }
            />
          </div>
        </section>
      </FadeIn>

      <FadeIn delay={240}>
        <section className="max-w-5xl mx-auto px-6 pb-24 w-full">
          <h2 className="text-3xl mb-3">{t("landing.contracts.heading")}</h2>
          <p className="text-foreground/70 mb-4 max-w-2xl">{t("landing.contracts.intro")}</p>
          <p className="mb-10">
            <Link
              href="/explorer"
              className="text-sm text-foreground underline hover:text-foreground/70"
            >
              {t("landing.contracts.explore")} &rarr;
            </Link>
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            <ul className="flex flex-col gap-3">
              {CONTRACTS.map((contract) => (
                <li
                  key={contract.name}
                  className="rounded-lg border border-foreground/10 bg-card p-4"
                >
                  <a
                    href={contractUrl(contract.name)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-sm text-foreground hover:underline"
                  >
                    {contract.name}
                  </a>
                  <p className="text-foreground/70 text-sm mt-1">
                    {t(`landing.contracts.${contract.id}`)}
                  </p>
                </li>
              ))}
            </ul>
            <div className="rounded-lg border border-foreground/10 bg-card p-6 font-mono text-xs text-foreground/70 leading-relaxed">
              <pre className="whitespace-pre overflow-x-auto">{`  your file
     |
     v  SHA-256 (in browser)
  document hash
     |
     +--> thesislock            single anchor
     +--> thesislock-batch      up to 10 at once
     |          |
     |          v
     +--> thesislock-registry   per-wallet history
     +--> thesislock-proof      soulbound NFT
     +--> thesislock-groups     shared anchoring
     |
     v
  Stacks  ->  Bitcoin (settled)`}</pre>
            </div>
          </div>
        </section>
      </FadeIn>

      <FadeIn delay={320}>
        <section className="max-w-5xl mx-auto px-6 pb-24 w-full">
          <h2 className="text-3xl mb-3">{t("landing.integrate.heading")}</h2>
          <p className="text-foreground/70 mb-10 max-w-2xl">{t("landing.integrate.intro")}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-lg border border-foreground/10 bg-card p-6 flex flex-col">
              <h3 className="text-xl mb-3">{t("landing.integrate.sdk.title")}</h3>
              <p className="text-foreground/80 text-sm leading-relaxed mb-4">
                {t("landing.integrate.sdk.body")}
              </p>
              <pre className="mt-auto rounded-md bg-foreground/5 p-3 font-mono text-xs text-foreground/80 overflow-x-auto whitespace-pre">{`npm install thesislock-sdk

import { createClient } from 'thesislock-sdk';
const client = createClient();
const result = await client.verify(hash);`}</pre>
            </div>
            <div className="rounded-lg border border-foreground/10 bg-card p-6 flex flex-col">
              <h3 className="text-xl mb-3">{t("landing.integrate.cli.title")}</h3>
              <p className="text-foreground/80 text-sm leading-relaxed mb-4">
                {t("landing.integrate.cli.body")}
              </p>
              <pre className="mt-auto rounded-md bg-foreground/5 p-3 font-mono text-xs text-foreground/80 overflow-x-auto whitespace-pre">{`npx thesislock-cli verify <hash>`}</pre>
            </div>
            <div className="rounded-lg border border-foreground/10 bg-card p-6 flex flex-col">
              <h3 className="text-xl mb-3">{t("landing.integrate.githubAction.title")}</h3>
              <p className="text-foreground/80 text-sm leading-relaxed mb-4">
                {t("landing.integrate.githubAction.body")}
              </p>
              <pre className="mt-auto rounded-md bg-foreground/5 p-3 font-mono text-xs text-foreground/80 overflow-x-auto whitespace-pre">{`- uses: Tim-cryptow/thesis-lock/action@main
  with:
    hash: "abc123..."`}</pre>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/docs"
              className="inline-flex items-center px-6 py-3 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
            >
              {t("landing.integrate.readDocs")}
            </Link>
            <Link
              href="/developers"
              className="inline-flex items-center px-6 py-3 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
            >
              {t("landing.integrate.developerPortal")}
            </Link>
          </div>
        </section>
      </FadeIn>

      <FadeIn delay={400}>
        <section className="max-w-5xl mx-auto px-6 pb-24 w-full">
          <h2 className="text-3xl mb-3">{t("landing.live.heading")}</h2>
          <p className="text-foreground/70 mb-10 max-w-2xl">
            A live protocol feed streams new anchors as they land on chain. Watch the activity
            ticker at the top of the page, or open the{" "}
            <Link href="/feed" className="underline hover:text-foreground">
              feed
            </Link>{" "}
            and{" "}
            <Link href="/stats" className="underline hover:text-foreground">
              stats
            </Link>{" "}
            to see them update in real time.
          </p>
          <StatsBar />
        </section>
      </FadeIn>
    </div>
  );
}
