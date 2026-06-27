// Verify a single document hash against its ThesisLock anchor on Stacks mainnet.
//
// Run with:  npx ts-node examples/verify-hash.ts
//
// In a real project, install the package and import from "thesislock-sdk":
//   import { createClient, truncateHash } from "thesislock-sdk";
import { createClient, truncateHash } from "../src/index";

async function main() {
  const client = createClient();
  const hash = "9afe6f57ea2af60478ad37b2d44ae8ede492c4f3b7e70bcc7dfea92128585d06";

  const result = await client.verify(hash);

  if (result.verified) {
    console.log(`Verified ${truncateHash(hash)}`);
    console.log(`  Anchored by: ${result.data.anchoredBy}`);
    console.log(`  Stacks block: ${result.data.stacksBlock}`);
    console.log(`  Label: ${result.data.label || "(none)"}`);
  } else {
    console.log(`${truncateHash(hash)} is not anchored.`);
  }
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
