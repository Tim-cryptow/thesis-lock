This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Testing

Unit and component tests run with [Vitest](https://vitest.dev) under jsdom:

```bash
npm test              # run the whole suite once
npm run test:watch    # watch mode
npm run test:unit       # only the lib and component tests
npm run test:components # only the component tests
npm run test:api        # only the API endpoint tests
```

`lib/__tests__/` covers the browser-local libraries: validators, tags,
collections, favorites, watchlist, API keys, the audit log, certificate
generation, export formatting, anchor templates, the glossary, and performance
metrics. Each suite installs an in-memory `localStorage` so runs are isolated
and deterministic.

`app/components/__tests__/` covers the shared React components with
[React Testing Library](https://testing-library.com/docs/react-testing-library/intro/):
CopyButton, TruncatedHash, TruncatedAddress, StarButton, ShareButtons,
EmptyState, Tooltip, Skeleton, FadeIn, ValidatedInput, HashInput, and
ConfirmDialog.

`app/api/__tests__/` covers the public API endpoints (health, verify, search,
stats, badge, card, profile, profile-badge, compare, activity, and status).
Each route handler is invoked directly under the node environment with its
Hiro-backed lib call mocked, so the tests never reach mainnet.

End-to-end browser tests run separately with Playwright (`npm run test:e2e`).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
