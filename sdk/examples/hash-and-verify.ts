// Hash a local file with SHA-256, then check whether that hash is anchored.
// The file itself never leaves your machine: only its hash is looked up.
//
// Run with:  npx ts-node examples/hash-and-verify.ts <path-to-file>
//
// In a real project, import from "thesislock-sdk" instead of "../src/index".
import { readFileSync } from "node:fs";
import { createClient, hashFile, truncateHash } from "../src/index";

async function main() {
  // Defaults to hashing this example file when no path is given.
  const path = process.argv[2] ?? __filename;
  const hash = await hashFile(readFileSync(path));
  console.log(`SHA-256 of ${path}:`);
  console.log(`  ${hash}`);

  const result = await createClient().verifyAny(hash);
  if (result.verified) {
    console.log(`Anchored via the ${result.source} contract.`);
  } else {
    console.log(`${truncateHash(hash)} has not been anchored yet.`);
  }
}

main().catch((err) => {
  console.error("Hash and verify failed:", err);
  process.exit(1);
});
