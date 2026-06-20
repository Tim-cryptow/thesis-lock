import type { ReactNode } from "react";

// Inline SVG glyphs keyed by an icon name stored on each notification. The app
// never uses emoji in the UI, so notification icons resolve to these stroke
// paths. Unknown names fall back to the system glyph.
const ICONS: Record<string, ReactNode> = {
  success: <path d="M20 6 9 17l-5-5" />,
  error: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </>
  ),
  watch: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  anchor: (
    <>
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v13" />
      <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
    </>
  ),
  group: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M2 20a7 7 0 0 1 14 0" />
      <path d="M16 5a3 3 0 0 1 0 6" />
      <path d="M19.5 20a6.5 6.5 0 0 0-3-5" />
    </>
  ),
  proof: (
    <>
      <circle cx="12" cy="9" r="5" />
      <path d="M9 13.5 7.5 22l4.5-3 4.5 3L15 13.5" />
    </>
  ),
  system: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01" />
      <path d="M11 12h1v4h1" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </>
  ),
};

export function NotificationIcon({
  name,
  className = "w-5 h-5",
}: {
  name: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {ICONS[name] ?? ICONS.system}
    </svg>
  );
}
