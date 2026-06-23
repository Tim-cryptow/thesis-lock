"use client";

import RouteError from "@/app/components/RouteError";

export default function VerifyError(props: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <RouteError
      title="Error loading verification"
      backHref="/search"
      backLabel="Search anchors"
      {...props}
    />
  );
}
