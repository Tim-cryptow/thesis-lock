// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightLinksValidator from "starlight-links-validator";

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
      plugins: [starlightLinksValidator()],
      customCss: ["./src/styles/custom.css"],
      sidebar: [
        {
          label: "Introduction",
          items: [{ autogenerate: { directory: "introduction" } }],
        },
        {
          label: "Quickstart",
          items: [{ autogenerate: { directory: "quickstart" } }],
        },
        {
          label: "Concepts",
          items: [{ autogenerate: { directory: "concepts" } }],
        },
        {
          label: "Guides",
          items: [{ autogenerate: { directory: "guides" } }],
        },
        {
          label: "Reference",
          items: [{ autogenerate: { directory: "reference" } }],
        },
        {
          label: "Resources",
          items: [
            { autogenerate: { directory: "resources" } },
            {
              label: "Changelog",
              link: "https://thesis-lock.vercel.app/changelog",
              attrs: { target: "_blank", rel: "noopener" },
            },
          ],
        },
      ],
    }),
  ],
});
