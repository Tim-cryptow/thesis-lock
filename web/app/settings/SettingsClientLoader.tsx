"use client";

import dynamic from "next/dynamic";

// The settings UI reads and writes localStorage throughout, so it runs only in
// the browser. Loaded through next/dynamic with ssr disabled, mirroring the
// developer portal loader. ssr:false is only allowed inside a Client Component.
const SettingsClient = dynamic(() => import("./SettingsClient"), {
  ssr: false,
});

export default function SettingsClientLoader() {
  return <SettingsClient />;
}
