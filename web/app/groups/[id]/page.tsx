import { notFound } from "next/navigation";
import GroupDetailLoader from "./GroupDetailLoader";

type Props = {
  params: Promise<{ id: string }>;
};

// Group ids are sequential integers assigned on chain. Anything else cannot be
// a real group, so render the not-found page instead of loading the client.
export default async function Page({ params }: Props) {
  const { id } = await params;
  if (!/^\d+$/.test(id ?? "")) {
    notFound();
  }
  return <GroupDetailLoader />;
}
