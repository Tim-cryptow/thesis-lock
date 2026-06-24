import type { Metadata } from "next";
import ProfileClient from "./ProfileClient";
import { notFound } from "next/navigation";
import { validateAddress } from "@/lib/validators";

type Props = {
  params: Promise<{ address: string }>;
};

function truncate(address: string): string {
  if (address.length <= 13) return address;
  return `${address.slice(0, 6)}...${address.slice(-5)}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { address: raw } = await params;
  const address = (raw ?? "").toUpperCase();
  const short = truncate(address);
  const title = `${short} Profile | ThesisLock`;
  const description = `View anchoring history for ${address} on ThesisLock`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/u/${address}` },
    openGraph: {
      type: "profile",
      siteName: "ThesisLock",
      title,
      description,
      url: `/u/${address}`,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function Page({ params }: Props) {
  const { address } = await params;
  if (!validateAddress(address ?? "").valid) {
    notFound();
  }
  return <ProfileClient />;
}
