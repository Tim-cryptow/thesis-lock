---
title: Glossary
description: Key terms used across ThesisLock and its documentation.
sidebar:
  order: 2
---

**Anchor.** A record that stores a document's SHA-256 hash on chain with a signer, block
heights, and an optional label. The core of ThesisLock.

**Batch anchor.** An anchor created with `thesislock-batch`, keyed by both the hash and the
owner, allowing up to ten documents per transaction.

**`(buff 32)`.** A Clarity 32-byte buffer, the on-chain type for a SHA-256 hash. When
serialized for a contract call it is the prefix `0x0200000020` followed by 64 hex
characters.

**Burn block.** The Bitcoin block height a Stacks block settles against. Stored on each
anchor as `burn-block`.

**Chainhook.** A Hiro service that streams matching on-chain events to an endpoint.
ThesisLock uses one to populate its optional index.

**Clarity.** The smart contract language used on Stacks. It is decidable and not compiled to
bytecode, so the source is the logic that runs.

**Finality.** The point after which a transaction cannot be reversed. A ThesisLock anchor is
final once mined and settled to Bitcoin.

**Hiro API.** The public Stacks API at `https://api.mainnet.hiro.so` used for all reads.

**Label.** Optional, public, up to 64 ASCII characters of metadata attached to an anchor.

**Principal.** A Stacks account identifier (a wallet address), starting with `SP` on
mainnet.

**Proof NFT.** A soulbound (non-transferable) SIP-009 token minted by `thesislock-proof`
that represents an anchor.

**Registry.** The `thesislock-registry` contract, a per-principal append-only index of
anchors that powers wallet history.

**SHA-256.** The cryptographic hash function used to fingerprint documents. It produces a
64-character hex digest.

**Soulbound.** A token that cannot be transferred. ThesisLock proof NFTs are soulbound.

**Stacks.** A blockchain that settles to Bitcoin, where ThesisLock's contracts are deployed.

**Stacks block.** The Stacks chain height at confirmation. Stored on each anchor as
`stacks-block`.

**Template.** A structured label format (prefix plus `key:value` pairs) for papers, legal
documents, releases, datasets, and certificates.

**Verification.** Re-hashing a file and checking the digest against an on-chain anchor to
confirm existence and integrity.
