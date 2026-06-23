"use client";

import dynamic from "next/dynamic";

// The group detail view reads browser-local state, so it is client only. ssr:
// false keeps it out of the server bundle while the server page handles param
// validation and metadata.
const GroupDetailClient = dynamic(() => import("./GroupDetailClient"), {
  ssr: false,
});

export default function GroupDetailLoader() {
  return <GroupDetailClient />;
}
