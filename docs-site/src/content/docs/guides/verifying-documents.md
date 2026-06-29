---
title: Verifying documents
description: Verify single and batch anchors, match files, compare anchors, and build reports.
sidebar:
  order: 4
---

Verification is always public. This guide covers the verification tools in the web app. For
scripted verification, see [scripting and CI](/guides/scripting-and-ci/).

## Verify a single anchor

Visit `/v/<hash>` or use the verify page. If the hash is anchored, you see who anchored it,
the Stacks and Bitcoin block heights, the label, and an estimated timestamp. Drop the file
into the "verify your file" section to re-hash it locally and confirm the digest matches.

For batch anchors, add the owner: `/v/<hash>?owner=<principal>`.

## Match files and hashes

The hash matcher at `/match` compares two things byte for byte:

- **Hash vs file:** paste an anchored hash, drop a file, and confirm it matches.
- **File vs file:** drop two files to confirm they are identical.

On a mismatch, both digests are shown with the differing characters highlighted, so you can
see at a glance that they differ.

## Bulk verification

To check many documents at once, use bulk verify. Drop a set of files or paste a list of
hashes; each is checked across all contracts. Results can be exported as CSV.

## Compare two anchors

The compare page at `/compare` puts two anchors side by side. It shows which was anchored
first, the gap in blocks and an estimated wall-clock difference, the parsed template fields
of each label, and relationship badges (for example, when both share an owner or template,
or when one label declares that it supersedes the other).

Compare links are shareable:

```
/compare?a=<hashA>&b=<hashB>&ownerA=<principal>&ownerB=<principal>
```

There is also a JSON endpoint at `/api/compare`; see the
[REST API reference](/reference/rest-api/#get-apicompare).

## Verification reports

A report is a formal, multi-document artifact that proves a set of hashes were anchored.
Build one at `/report` by dropping files, pasting hashes, or importing from a wallet. Each
hash is checked across every contract, and the report includes a summary, a breakdown by
source, and full metadata per entry with a verify URL.

Reports can be produced as self-contained HTML (printable), JSON (structured data), or CSV
(a flat table). The same report can be generated through the API:

```bash
curl -s -X POST "https://thesis-lock.vercel.app/api/report?format=html" \
  -H "Content-Type: application/json" \
  -d '{"hashes":[{"hash":"9afe6f57...","filename":"thesis.pdf"}]}'
```

Because a report only references public on-chain data, anyone can reproduce it against the
Hiro API. See the [REST API reference](/reference/rest-api/#post-apireport) for details.
