// Shared fixtures for the e2e suite.

// A hash that is anchored on Stacks mainnet (single anchor in `thesislock`).
// Verified live via the contract's is-anchored read. Used by verify and API
// specs to assert a positive verification path end to end.
export const KNOWN_ANCHORED_HASH =
  "9afe6f57ea2af60478ad37b2d44ae8ede492c4f3b7e70bcc7dfea92128585d06";

// A syntactically valid 64-hex hash that has not been anchored.
export const UNANCHORED_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

// The deployer principal. Searching by this address returns on-chain results.
export const DEPLOYER_PRINCIPAL = "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";
