import type { Metadata } from "next";

type Props = {
  params: Promise<{ id: string }>;
};

const title = "Group";
const description = "A ThesisLock group and its shared, on-chain anchoring history.";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title,
    description,
    alternates: { canonical: `/groups/${id}` },
    openGraph: {
      type: "website",
      siteName: "ThesisLock",
      title: `${title} | ThesisLock`,
      description,
      url: `/groups/${id}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ThesisLock`,
      description,
    },
  };
}

export default function GroupDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
