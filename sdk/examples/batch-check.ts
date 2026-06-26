// Verify several hashes in a loop and print a one-line status for each. Useful
// for checking a list of documents against the chain in one pass.
//
// Run with:  npx ts-node examples/batch-check.ts
//
// In a real project, import from "thesislock-sdk" instead of "../src/index".
import { createClient, isValidHash, truncateHash } from "../src/index";

const HASHES = [
  "9afe6f57ea2af60478ad37b2d44ae8ede492c4f3b7e70bcc7dfea92128585d06",
  "0000000000000000000000000000000000000000000000000000000000000001",
];

async function main() {
  const client = createClient();
  for (const hash of HASHES) {
    if (!isValidHash(hash)) {
      console.log(`${hash}: invalid hash, skipping`);
      continue;
    }
    const result = await client.verify(hash);
    console.log(
      `${truncateHash(hash)}: ${result.verified ? "anchored" : "not anchored"}`,
    );
  }
}

main().catch((err) => {
  console.error("Batch check failed:", err);
  process.exit(1);
});
