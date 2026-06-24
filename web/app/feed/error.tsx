"use client";

import RouteError from "@/app/components/RouteError";

export default function FeedError(props: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <RouteError
      title="Error loading feed"
      backHref="/"
      backLabel="Go home"
      {...props}
    />
  );
}
