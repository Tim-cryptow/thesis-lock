import type { Metadata } from "next";
import HomeClient from "./HomeClient";
import JsonLd from "./components/JsonLd";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "ThesisLock",
  url: "https://thesis-lock.vercel.app",
  description:
    "Anchor document hashes on the Stacks blockchain. Permanent, verifiable, private.",
  logo: "https://thesis-lock.vercel.app/icon-512.png",
};

export default function Page() {
  return (
    <>
      <JsonLd data={organizationSchema} />
      <HomeClient />
    </>
  );
}
