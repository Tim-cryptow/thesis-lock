"use client";

import dynamic from "next/dynamic";

// Client-only: the notification center reads localStorage, the Notification API,
// and Web Audio, none of which exist during server rendering.
const NotificationsClient = dynamic(() => import("./NotificationsClient"), {
  ssr: false,
});

export default function Page() {
  return <NotificationsClient />;
}
