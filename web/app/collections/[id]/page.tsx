"use client";

import dynamic from "next/dynamic";

// Collections live in localStorage, so the detail view is fully client side.
// ssr:false keeps it out of the server bundle, mirroring the group detail page.
const CollectionDetailClient = dynamic(() => import("./CollectionDetailClient"), {
  ssr: false,
});

export default function Page() {
  return <CollectionDetailClient />;
}
