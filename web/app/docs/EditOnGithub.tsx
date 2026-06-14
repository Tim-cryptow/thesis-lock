"use client";

import { usePathname } from "next/navigation";
import { editUrl } from "@/lib/docs";

// Maps the current docs route back to the page source file in the repo.
function sourcePath(pathname: string): string {
  const slug = pathname.replace(/^\/docs\/?/, "").replace(/\/$/, "");
  return slug ? `web/app/docs/${slug}/page.tsx` : "web/app/docs/page.tsx";
}

export default function EditOnGithub() {
  const pathname = usePathname();
  return (
    <a
      href={editUrl(sourcePath(pathname))}
      target="_blank"
      rel="noreferrer"
      className="text-sm text-foreground/60 hover:text-foreground transition"
    >
      Edit on GitHub
    </a>
  );
}
