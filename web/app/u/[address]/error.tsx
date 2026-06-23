"use client";

import RouteError from "@/app/components/RouteError";

export default function ProfileError(props: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <RouteError
      title="Error loading profile"
      backHref="/search"
      backLabel="Search anchors"
      {...props}
    />
  );
}
