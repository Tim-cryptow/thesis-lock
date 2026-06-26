// Check how many documents a wallet has registered, and list its recent anchors.
//
// Run with:  npx ts-node examples/check-wallet.ts
//
// In a real project, import from "thesislock-sdk" instead of "../src/index".
import { createClient, truncateHash } from "../src/index";

async function main() {
  const client = createClient();
  const owner = "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";

  const count = await client.getAnchorCount(owner);
  console.log(`${owner} has registered ${count} anchor(s).`);

  const recent = await client.getRecentAnchors(owner);
  console.log(`Most recent ${recent.length}:`);
  for (const entry of recent) {
    const label = entry.label || "(no label)";
    console.log(`  ${truncateHash(entry.hash)}  block ${entry.anchoredAt}  ${label}`);
  }
}

main().catch((err) => {
  console.error("Wallet check failed:", err);
  process.exit(1);
});
