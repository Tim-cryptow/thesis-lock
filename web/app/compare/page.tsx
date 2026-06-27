import type { Metadata } from "next";
import CompareClientLoader from "./CompareClientLoader";
import { getTranslation, isLocale, DEFAULT_LOCALE } from "@/lib/i18n";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const HEX_64 = /^[0-9a-f]{64}$/;

function pickHash(value: string | string[] | undefined): string | null {
  if (!value || Array.isArray(value)) return null;
  const lower = value.toLowerCase();
  return HEX_64.test(lower) ? lower : null;
}

// The compared hashes live in query params, so the title and description reflect
// them when both are present, making a shared comparison link self-describing in
// previews and search results. Falls back to the generic page copy otherwise.
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const locale = isLocale(sp.lang) ? sp.lang : DEFAULT_LOCALE;
  const t = getTranslation(locale).compare.meta;

  const a = pickHash(sp.a);
  const b = pickHash(sp.b);

  const title =
    a && b
      ? t.titleWith.replace("{a}", `${a.slice(0, 10)}...`).replace("{b}", `${b.slice(0, 10)}...`)
      : t.title;
  const description = t.description;
  const canonical = a && b ? `/compare?a=${a}&b=${b}` : "/compare";

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      siteName: "ThesisLock",
      title: `${title} | ThesisLock`,
      description,
      url: canonical,
    },
    twitter: {
      card: "summary",
      title: `${title} | ThesisLock`,
      description,
    },
  };
}

export default function Page() {
  return <CompareClientLoader />;
}
