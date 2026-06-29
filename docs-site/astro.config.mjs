// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

// https://astro.build/config
export default defineConfig({
  // Update this to the deployed docs URL. It is used for canonical links,
  // sitemap entries, and social card metadata.
  site: "https://thesis-lock-docs.vercel.app",
  integrations: [
    starlight({
      title: "ThesisLock Docs",
      description:
        "Documentation for ThesisLock, a proof-of-existence service for documents on the Stacks blockchain.",
      lastUpdated: true,
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/Tim-cryptow/thesis-lock",
        },
      ],
      editLink: {
        baseUrl: "https://github.com/Tim-cryptow/thesis-lock/edit/main/docs-site/",
      },
      sidebar: [
        {
          label: "Introduction",
          items: [{ autogenerate: { directory: "introduction" } }],
        },
        {
          label: "Quickstart",
          items: [{ autogenerate: { directory: "quickstart" } }],
        },
      ],
    }),
  ],
});
