import type { MetadataRoute } from "next";
import { DOCS } from "@/lib/docs";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://thesis-lock.vercel.app");

type ChangeFrequency = MetadataRoute.Sitemap[number]["changeFrequency"];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const entry = (
    path: string,
    priority: number,
    changeFrequency: ChangeFrequency,
  ): MetadataRoute.Sitemap[number] => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  });

  return [
    entry("/", 1, "daily"),

    // Core anchoring and verification flows.
    entry("/anchor", 0.9, "monthly"),
    entry("/search", 0.9, "monthly"),
    entry("/verify-bulk", 0.9, "monthly"),
    entry("/match", 0.9, "monthly"),
    entry("/compare", 0.9, "monthly"),

    // Discovery and live data.
    entry("/feed", 0.7, "daily"),
    entry("/stats", 0.7, "daily"),
    entry("/status", 0.7, "daily"),
    entry("/explorer", 0.7, "weekly"),

    // Personal workspaces (these render guided empty states without a wallet).
    entry("/dashboard", 0.7, "weekly"),
    entry("/anchors", 0.7, "weekly"),
    entry("/activity", 0.7, "weekly"),
    entry("/calendar", 0.7, "weekly"),
    entry("/watchlist", 0.7, "weekly"),
    entry("/collections", 0.7, "weekly"),
    entry("/favorites", 0.7, "weekly"),
    entry("/notifications", 0.7, "weekly"),
    entry("/groups", 0.7, "weekly"),
    entry("/tags", 0.7, "weekly"),

    // Tools and the developer surface.
    entry("/templates", 0.7, "monthly"),
    entry("/report", 0.7, "monthly"),
    entry("/developers", 0.7, "weekly"),
    entry("/embed", 0.7, "monthly"),
    entry("/performance", 0.7, "monthly"),
    entry("/audit", 0.7, "monthly"),
    entry("/settings", 0.7, "monthly"),
    entry("/glossary", 0.7, "monthly"),

    // Legal.
    entry("/terms", 0.7, "weekly"),
    entry("/privacy", 0.7, "monthly"),

    // Help center.
    entry("/help", 0.6, "monthly"),
    entry("/help/faq", 0.6, "monthly"),
    entry("/help/guides", 0.6, "monthly"),
    entry("/help/troubleshooting", 0.6, "monthly"),
    entry("/help/contact", 0.6, "monthly"),

    // Documentation: the landing plus every guide, kept in sync with lib/docs.
    entry("/docs", 0.7, "weekly"),
    ...DOCS.map((doc) => entry(`/docs/${doc.slug}`, 0.7, "weekly")),
  ];
}
