"use client";

import dynamic from "next/dynamic";

const GroupsClient = dynamic(() => import("./GroupsClient"), { ssr: false });

export default function Page() {
  return <GroupsClient />;
}
