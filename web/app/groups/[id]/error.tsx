"use client";

import RouteError from "@/app/components/RouteError";

export default function GroupError(props: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <RouteError
      title="Error loading group"
      backHref="/groups"
      backLabel="Browse all groups"
      {...props}
    />
  );
}
