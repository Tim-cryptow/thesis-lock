"use client";

import dynamic from "next/dynamic";

const BulkVerifyClient = dynamic(() => import("./BulkVerifyClient"), {
  ssr: false,
});

export default function Page() {
  return <BulkVerifyClient />;
}
