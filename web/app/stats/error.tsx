"use client";

import RouteError from "@/app/components/RouteError";

export default function StatsError(props: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return <RouteError title="Error loading stats" backHref="/" backLabel="Go home" {...props} />;
}
