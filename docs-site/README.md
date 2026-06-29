# ThesisLock documentation site

The documentation site for [ThesisLock](https://thesis-lock.vercel.app), a
proof-of-existence service for documents on the Stacks blockchain. It is built with
[Astro](https://astro.build) and [Starlight](https://starlight.astro.build).

The product itself lives in the parent repository
([Tim-cryptow/thesis-lock](https://github.com/Tim-cryptow/thesis-lock)); this directory is
the standalone docs site that covers the protocol, web app, smart contracts, SDK, CLI,
REST API, GitHub Action, feeds, and webhooks.

## Prerequisites

- Node.js 22.12 or newer (required by Astro).

## Commands

Run these from the `docs-site` directory.

| Command           | Action                                                       |
| ----------------- | ----------------------------------------------------------- |
| `npm install`     | Install dependencies.                                       |
| `npm run dev`     | Start a local dev server with hot reload at `localhost:4321`.|
| `npm run build`   | Build the production site to `dist/` and validate links.    |
| `npm run preview` | Preview the production build locally.                       |
| `npm run check`   | Run the Astro type checker.                                 |

The build runs the Starlight link validator, so it fails on any broken internal link. This
is the same check that runs in CI.

## Project structure

```
docs-site/
  astro.config.mjs          Site config, sidebar, and plugins
  src/
    content.config.ts       Content collection config
    content/docs/           All documentation pages (Markdown and MDX)
      index.mdx             Landing page
      introduction/         What ThesisLock is and how it works
      quickstart/           Anchor and verify your first document
      concepts/             The data model and on-chain truth
      guides/               Task-oriented web app and scripting guides
      reference/            Contracts, SDK, CLI, REST API, Action, feeds, webhooks
      resources/            FAQ, glossary, troubleshooting, contributing
```

To add or edit a page, create or change a Markdown file under `src/content/docs`. The
sidebar groups are configured in `astro.config.mjs` and auto-generate from their
directories; control a page's position with the `sidebar.order` frontmatter field.

## Deployment

The site is a static build (`dist/`) and can be hosted anywhere that serves static files.

- **Vercel:** create a project pointing at this repository and set the Root Directory to
  `docs-site`. Vercel detects Astro and runs the build automatically. A `vercel.json` in
  this directory pins the framework and build command.
- **Any static host:** run `npm run build` and serve `dist/`.

If you deploy under a subpath, set `site` and `base` in `astro.config.mjs` accordingly.

## Conventions

- Verify any fact against the source (contracts, SDK, CLI, API) before documenting it.
- Keep code samples runnable.
- No em dashes and no emojis in content.
- Cross-link related pages instead of repeating content.

## License

MIT. See [LICENSE](./LICENSE).
