# Changelog

All notable changes to the ThesisLock SDK are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-06-26

### Added

- `ThesisLockClient` and the `createClient` factory for read-only access to the
  ThesisLock contracts through the Hiro Stacks API.
- Verification methods: `verify` (single anchors), `verifyBatch` (owner-keyed
  batch anchors), and `verifyAny` (single first, then batch when an owner is given).
- Registry methods: `getAnchorCount` and `getRecentAnchors`.
- Proof NFT methods: `getProof` (by token id) and `getProofByHash`.
- Utility functions: `hashString`, `hashFile`, `isValidHash`, `serializeHash`,
  and `truncateHash`.
- Exported TypeScript types: `AnchorResult`, `BatchAnchorResult`, `RegistryEntry`,
  `ProofNFT`, `ThesisLockConfig`, and the `VerifyResult` discriminated union.

[0.1.0]: https://github.com/Tim-cryptow/thesis-lock/releases/tag/sdk-v0.1.0
